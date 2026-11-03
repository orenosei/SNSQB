import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { ArrowLeft, MessageCircle, Send, Trash2 } from "lucide-react";
import { Loading, ErrorNotice } from "../../components/Feedback";
import { Avatar } from "../../components/Avatar";
import { errorMessage } from "../../lib/api";
import { nextCursor, validId, formatTime } from "../../lib/cursor";
import { useProfile } from "../profile/api";
import { useSearch } from "../search/api";
import {
  createDirectConversation,
  deleteMessage,
  getConversations,
  getMessages,
} from "./api";
import { useChatConnection } from "./ChatConnection";
import { QueryError, LoadMore } from "../../components/SocialFeedback";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { getSession } from "../auth/session";

type PendingSends = Record<number, { content: string; knownIds: number[] }>;

export function ChatPage() {
  const client = useQueryClient();
  const sessionRevision = useRef(getSession().revision);
  const [params, setParams] = useSearchParams();
  const activeId = Number(params.get("id"));
  const [finding, setFinding] = useState(false);
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<number, string>>(
    () => client.getQueryData(["chat-drafts"]) || {},
  );
  const draft = drafts[activeId] || "";
  const setDraft = (value: string) =>
    setDrafts((current) => ({ ...current, [activeId]: value }));
  const { connection, connected } = useChatConnection();
  const [typing, setTyping] = useState(false);
  const [sendErrors, setSendErrors] = useState<Record<number, string>>({});
  const sendError = sendErrors[activeId] || "";
  const [sent, setSent] = useState<PendingSends>(
    () => client.getQueryData(["chat-pending"]) || {},
  );
  const pendingSends = useRef(new Set(Object.keys(sent).map(Number)));
  const [editPending, setEditPending] = useState<number>();
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const profile = useProfile();
  const searchResults = useSearch(finding ? search : "", "USER");
  const conversations = useInfiniteQuery({
    queryKey: ["conversations"],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => getConversations(pageParam),
    getNextPageParam: (last, _pages, cursor) => nextCursor(last, cursor),
  });
  const messages = useInfiniteQuery({
    queryKey: ["chat-messages", activeId],
    enabled: validId(activeId),
    refetchOnMount: "always",
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => getMessages(activeId, pageParam),
    getNextPageParam: (last, _pages, cursor) => nextCursor(last, cursor),
  });
  // Drafts and unconfirmed sends are ephemeral and cleared with the authenticated cache.
  useEffect(() => {
    if (getSession().revision !== sessionRevision.current) return;
    client.setQueryData(["chat-drafts"], drafts);
    client.setQueryData(["chat-pending"], sent);
  }, [client, drafts, sent]);
  const current = conversations.data?.pages
    .flatMap((p) => p.items || [])
    .find((c) => c.conversation_id === activeId);
  const entries = conversations.data?.pages.flatMap((p) => p.items || []) || [];
  const sorted = [
    ...(messages.data?.pages.flatMap((p) => p.messages || []) || []),
  ].filter((m) => validId(m.message_id));
  const unique = [
    ...new Map(sorted.map((m) => [m.message_id, m])).values(),
  ].sort(
    (a, b) => Date.parse(a.created_at || "") - Date.parse(b.created_at || ""),
  );
  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
      clearTimeout(typingTimer.current);
    };
  }, []);
  useEffect(() => {
    setTyping(false);
    clearTimeout(typingTimer.current);
    if (!connected || !validId(activeId)) return;
    const unsubscribe = connection?.subscribeTyping(activeId, (event) => {
      if (event.sender_id !== profile.data?.user_id) {
        clearTimeout(typingTimer.current);
        setTyping(!!event.is_typing);
        if (event.is_typing)
          typingTimer.current = setTimeout(() => setTyping(false), 4000);
      }
    });
    return () => {
      unsubscribe?.();
      clearTimeout(typingTimer.current);
      connection?.send("/app/chat.typing", {
        conversation_id: activeId,
        is_typing: false,
      });
    };
  }, [activeId, connected, connection, profile.data?.user_id]);
  useEffect(() => {
    const pending = sent[activeId];
    if (!pending) return;
    const echoed = messages.data?.pages
      .flatMap((page) => page.messages || [])
      .some(
        (message) =>
          message.sender_id === profile.data?.user_id &&
          message.content === pending.content &&
          validId(message.message_id) &&
          !pending.knownIds.includes(message.message_id),
      );
    if (echoed) {
      pendingSends.current.delete(activeId);
      setDrafts((current) =>
        current[activeId]?.trim() === pending.content
          ? { ...current, [activeId]: "" }
          : current,
      );
      setSent((current) => {
        const next = { ...current };
        delete next[activeId];
        return next;
      });
      setSendErrors((current) => ({ ...current, [activeId]: "" }));
    }
  }, [messages.data, activeId, profile.data?.user_id, sent]);
  const create = useMutation({
    mutationFn: createDirectConversation,
    onSuccess: async (result) => {
      await client.invalidateQueries({ queryKey: ["conversations"] });
      if (validId(result.conversation_id))
        setParams({ id: String(result.conversation_id) });
      setFinding(false);
      setSearch("");
    },
  });
  const remove = useMutation({
    mutationFn: deleteMessage,
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ["chat-messages", activeId] }),
  });
  function send(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (
      !content ||
      !validId(activeId) ||
      pendingSends.current.has(activeId) ||
      !messages.data
    )
      return;
    pendingSends.current.add(activeId);
    if (
      !connection?.send("/app/chat.send", {
        conversation_id: activeId,
        content,
        message_type: "TEXT",
        media_urls: [],
      })
    ) {
      pendingSends.current.delete(activeId);
      setSendErrors((current) => ({
        ...current,
        [activeId]:
          "Mất kết nối. Nội dung được giữ lại để bạn gửi khi kết nối trở lại.",
      }));
      return;
    }
    setSent((current) => ({
      ...current,
      [activeId]: {
        content,
        knownIds: unique.map((message) => message.message_id!),
      },
    }));
    setSendErrors((current) => ({
      ...current,
      [activeId]:
        "Đã gửi qua kết nối. Đang kiểm tra tin nhắn trên máy chủ; bản soạn được giữ lại.",
    }));
    connection?.send("/app/chat.typing", {
      conversation_id: activeId,
      is_typing: false,
    });
    const timer = setTimeout(() => {
      void client.invalidateQueries({ queryKey: ["chat-messages", activeId] });
      timers.current.delete(timer);
    }, 700);
    timers.current.add(timer);
  }
  useEffect(() => {
    const last = unique.at(-1);
    if (
      connected &&
      validId(activeId) &&
      validId(last?.message_id) &&
      last?.sender_id !== profile.data?.user_id
    ) {
      connection?.send("/app/chat.read", {
        conversation_id: activeId,
        message_id: last!.message_id,
      });
    }
  }, [
    activeId,
    connected,
    unique.at(-1)?.message_id,
    profile.data?.user_id,
    connection,
  ]);
  return (
    <div
      className={`chat-page surface ${validId(activeId) ? "chat-has-active" : ""}`}
    >
      <aside className="chat-list">
        <div className="chat-list-heading">
          <h1>Tin nhắn</h1>
          <button
            className="button button-secondary"
            onClick={() => setFinding(!finding)}
          >
            Soạn mới
          </button>
        </div>
        {finding && (
          <div className="chat-find">
            <input
              aria-label="Tìm người để nhắn tin"
              placeholder="Tìm người dùng…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {searchResults.data?.pages
              .flatMap((p) => p.items || [])
              .filter(
                (item) =>
                  item.type === "USER" &&
                  item.user &&
                  item.user.user_id !== profile.data?.user_id,
              )
              .map((item) => (
                <button
                  key={item.user!.user_id}
                  disabled={create.isPending}
                  onClick={() =>
                    validId(item.user?.user_id) &&
                    create.mutate(item.user!.user_id!)
                  }
                >
                  {item.user?.full_name || `Người dùng #${item.user?.user_id}`}
                </button>
              ))}
            {create.isError && (
              <ErrorNotice message={errorMessage(create.error)} />
            )}
            {searchResults.isFetching && (
              <p role="status" className="muted">
                Đang tìm người dùng…
              </p>
            )}
            {searchResults.isError && (
              <QueryError
                error={searchResults.error}
                retry={() => void searchResults.refetch()}
              />
            )}
          </div>
        )}
        {conversations.isPending ? (
          <Loading label="Đang tải hội thoại…" />
        ) : !entries.length && !conversations.isError ? (
          <p className="muted">
            Chưa có hội thoại. Chọn “Soạn mới” để bắt đầu.
          </p>
        ) : (
          entries.map((c) => (
            <button
              key={c.conversation_id}
              className={`chat-conversation ${c.conversation_id === activeId ? "selected" : ""}`}
              onClick={() =>
                validId(c.conversation_id) &&
                setParams({ id: String(c.conversation_id) })
              }
            >
              <Avatar name={c.display_name} url={c.display_avatar_url} />
              <span>
                <strong>{c.display_name || "Hội thoại"}</strong>
                <small>{c.last_message?.content || "Chưa có tin nhắn"}</small>
              </span>
              {!!c.unread_count && (
                <b className="chat-count">{c.unread_count}</b>
              )}
            </button>
          ))
        )}
        {conversations.isError && (
          <QueryError
            error={conversations.error}
            retry={() =>
              void (conversations.isFetchNextPageError
                ? conversations.fetchNextPage()
                : conversations.refetch())
            }
          />
        )}
        <LoadMore
          hasNext={!!conversations.hasNextPage}
          pending={conversations.isFetchingNextPage}
          load={() => void conversations.fetchNextPage()}
        />
      </aside>
      <section className="chat-main" aria-label="Nội dung hội thoại">
        {!validId(activeId) ? (
          <div className="chat-empty">
            <MessageCircle size={40} />
            <h2>Chọn một hội thoại</h2>
            <p>Nhắn tin và trao đổi cùng bạn học.</p>
          </div>
        ) : (
          <>
            <header className="chat-main-heading">
              <button
                type="button"
                className="icon-button chat-back"
                aria-label="Trở về danh sách hội thoại"
                onClick={() => setParams({})}
              >
                <ArrowLeft size={20} />
              </button>
              <Avatar
                name={current?.display_name}
                url={current?.display_avatar_url}
              />
              <strong>{current?.display_name || "Hội thoại"}</strong>
              <span className="muted">
                {connected ? "Đã kết nối" : "Đang kết nối…"}
              </span>
            </header>
            <div className="chat-messages" aria-live="polite">
              {messages.isPending ? (
                <Loading label="Đang tải tin nhắn…" />
              ) : (
                <>
                  {messages.hasNextPage && (
                    <button
                      className="text-button"
                      disabled={messages.isFetchingNextPage}
                      onClick={() => void messages.fetchNextPage()}
                    >
                      Xem tin nhắn cũ
                    </button>
                  )}
                  {!unique.length && (
                    <p className="muted">Chưa có tin nhắn. Hãy gửi lời chào!</p>
                  )}
                  {unique.map((m) => (
                    <div
                      key={m.message_id}
                      className={`chat-bubble ${m.sender_id === profile.data?.user_id ? "mine" : ""}`}
                    >
                      <small>
                        {m.sender_name || "Thành viên"} ·{" "}
                        {formatTime(m.created_at)}
                      </small>
                      <p>
                        {m.revoked ? "Tin nhắn đã được thu hồi" : m.content}
                      </p>
                      {m.sender_id === profile.data?.user_id && !m.revoked && (
                        <button
                          title="Thu hồi tin nhắn"
                          aria-label="Thu hồi tin nhắn"
                          disabled={remove.isPending}
                          onClick={() =>
                            validId(m.message_id) &&
                            remove.mutate(m.message_id!)
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  {typing && <p className="muted">Đang soạn tin…</p>}
                  {remove.isError && (
                    <ErrorNotice message={errorMessage(remove.error)} />
                  )}
                  {messages.isError && (
                    <QueryError
                      error={messages.error}
                      retry={() =>
                        void (messages.isFetchNextPageError
                          ? messages.fetchNextPage()
                          : messages.refetch())
                      }
                    />
                  )}
                </>
              )}
            </div>
            <form className="chat-compose" onSubmit={send}>
              <input
                aria-label="Nội dung tin nhắn"
                placeholder="Viết tin nhắn…"
                value={draft}
                disabled={!!sent[activeId]}
                maxLength={2000}
                onChange={(e) => {
                  setDraft(e.target.value);
                  connection?.send("/app/chat.typing", {
                    conversation_id: activeId,
                    is_typing: !!e.target.value.trim(),
                  });
                }}
              />
              <button
                className="button button-primary"
                disabled={
                  !draft.trim() ||
                  !connected ||
                  !!sent[activeId] ||
                  !messages.data
                }
              >
                <Send size={18} /> Gửi
              </button>
            </form>
            {sendError && (
              <p className="notice" role="status">
                {sendError}
              </p>
            )}
            {sent[activeId] && (
              <div className="chat-pending-actions">
                <button
                  type="button"
                  className="text-button"
                  disabled={messages.isFetching}
                  onClick={() => void messages.refetch()}
                >
                  Kiểm tra tin nhắn
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setEditPending(activeId)}
                >
                  Giữ bản soạn để chỉnh sửa
                </button>
              </div>
            )}
          </>
        )}
      </section>
      {editPending !== undefined && (
        <ConfirmDialog
          title="Tiếp tục chỉnh sửa bản soạn?"
          description="Tin nhắn trước chưa được xác nhận. Hãy kiểm tra lịch sử để tránh gửi trùng. Nội dung bản soạn sẽ được giữ lại."
          confirmLabel="Tiếp tục chỉnh sửa"
          pending={false}
          onClose={() => setEditPending(undefined)}
          onConfirm={() => {
            const id = editPending;
            pendingSends.current.delete(id);
            setSent((current) => {
              const next = { ...current };
              delete next[id];
              return next;
            });
            setSendErrors((current) => ({
              ...current,
              [id]: "Bản soạn được giữ lại. Hãy kiểm tra lịch sử trước khi gửi lại.",
            }));
            setEditPending(undefined);
          }}
        />
      )}
    </div>
  );
}
