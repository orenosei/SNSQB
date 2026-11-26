import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Modal } from "../../components/Modal";
import { ErrorNotice, Loading } from "../../components/Feedback";
import { LoadMore, QueryError } from "../../components/SocialFeedback";
import { api, type ApiEnvelope, errorMessage, unwrap } from "../../lib/api";
import { validId, type CursorPage } from "../../lib/cursor";
import type { Conversation } from "./api";

type HiddenPage = CursorPage<Conversation> & { next_cursor?: string };
export const hiddenKey = ["hidden-conversations"];
const sixDigits = /^[0-9]{6}$/;

export function HiddenChats({
  expiresAt,
  onUnlock,
  onLock,
  onOpen,
  onClose,
}: {
  expiresAt: number;
  onUnlock: (expiry: number) => void;
  onLock: () => void;
  onOpen: (item: Conversation) => void;
  onClose: () => void;
}) {
  const [pin, setPin] = useState("");
  const [oldPin, setOldPin] = useState("");
  const [mode, setMode] = useState<"unlock" | "set" | "change">("unlock");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const unlocked = expiresAt > Date.now();
  const query = useInfiniteQuery({
    queryKey: [...hiddenKey, expiresAt],
    enabled: unlocked && mode === "unlock",
    gcTime: 0,
    retry: false,
    initialPageParam: undefined as string | number | undefined,
    queryFn: async ({ signal, pageParam }) =>
      unwrap(
        await api.get<ApiEnvelope<HiddenPage>>("/conversations/hidden", {
          signal,
          params: {
            cursor: typeof pageParam === "string" ? pageParam : undefined,
            after: typeof pageParam === "number" ? pageParam : undefined,
            limit: 20,
          },
        }),
      ),
    getNextPageParam: (page, _pages, cursor) => {
      const next =
        page.next_cursor ||
        (page.pagination?.has_next ? page.pagination.after : undefined);
      return next === cursor ? undefined : next;
    },
  });
  async function submit() {
    if (
      pending ||
      !sixDigits.test(pin) ||
      (mode === "change" && !sixDigits.test(oldPin))
    )
      return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      if (mode === "unlock") {
        const data = unwrap(
          await api.post<ApiEnvelope<{ expires_at?: string }>>(
            "/conversations/hidden/unlock",
            { pin },
          ),
        );
        const expiration = Date.parse(data?.expires_at || "");
        if (!(expiration > Date.now()))
          throw new Error("Máy chủ chưa trả về thời hạn mở khóa hợp lệ.");
        onUnlock(expiration);
      } else {
        unwrap(
          await api.post<ApiEnvelope<unknown>>("/users/me/hidden-chat-pin", {
            pin,
            ...(mode === "change" ? { old_pin: oldPin } : {}),
          }),
        );
        setMode("unlock");
        setMessage("Đã lưu mã PIN.");
      }
      setPin("");
      setOldPin("");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }
  async function lock() {
    setPending(true);
    setError("");
    try {
      unwrap(
        await api.post<ApiEnvelope<unknown>>("/conversations/hidden/lock"),
      );
      onLock();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }
  const items = query.data?.pages.flatMap((page) => page.items || []) || [];
  return (
    <Modal title="Kho chat ẩn" pending={pending} onClose={onClose}>
      <div className="invite-actions">
        {(["unlock", "set", "change"] as const).map((item) => (
          <button
            key={item}
            className="button button-secondary"
            aria-pressed={item === mode}
            disabled={pending}
            onClick={() => {
              setMode(item);
              setPin("");
              setOldPin("");
              setError("");
              setMessage("");
            }}
          >
            {item === "unlock"
              ? "Kho chat"
              : item === "set"
                ? "Tạo PIN"
                : "Đổi PIN"}
          </button>
        ))}
      </div>
      {mode === "unlock" && unlocked ? (
        <>
          <button
            className="button button-secondary"
            disabled={pending}
            onClick={() => void lock()}
          >
            Khóa kho chat
          </button>
          {query.isPending && <Loading label="Đang tải chat ẩn…" />}
          {query.isError && (
            <QueryError
              error={query.error}
              retry={() =>
                void (query.isFetchNextPageError
                  ? query.fetchNextPage()
                  : query.refetch())
              }
            />
          )}
          {query.isSuccess && !items.length && <p>Kho chưa có hội thoại ẩn.</p>}
          <ul className="rewards-list">
            {items
              .filter((item) => validId(item.conversation_id))
              .map((item) => (
                <li className="invite-row" key={item.conversation_id}>
                  <button className="text-button" onClick={() => onOpen(item)}>
                    {item.display_name || "Hội thoại ẩn"}
                  </button>
                </li>
              ))}
          </ul>
          <LoadMore
            hasNext={query.hasNextPage}
            pending={query.isFetchingNextPage}
            load={() => void query.fetchNextPage()}
          />
        </>
      ) : (
        <form
          className="rewards-form"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          {mode === "change" && (
            <label>
              PIN cũ{" "}
              <input
                type="password"
                autoComplete="off"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={oldPin}
                onChange={(event) => setOldPin(event.target.value)}
              />
            </label>
          )}
          <label>
            {mode === "unlock" ? "PIN kho chat" : "PIN mới"}
            <input
              type="password"
              autoComplete="off"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={pin}
              onChange={(event) => setPin(event.target.value)}
            />
          </label>
          <button className="button button-primary" disabled={pending}>
            {mode === "unlock" ? "Mở khóa" : "Lưu PIN"}
          </button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
      {error && <ErrorNotice message={error} />}
    </Modal>
  );
}
