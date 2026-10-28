import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { MessageCircle, Send, Trash2 } from "lucide-react";
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
import { connectChat } from "./realtime";

export function ChatPage() {
  const [params, setParams] = useSearchParams();
  const activeId = Number(params.get("id"));
  const [finding, setFinding] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [sendError, setSendError] = useState("");
  const client = useQueryClient();
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
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => getMessages(activeId, pageParam),
    getNextPageParam: (last, _pages, cursor) => nextCursor(last, cursor),
  });
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
  const realtime = useRef<ReturnType<typeof connectChat> | null>(null);
  useEffect(() => {
    const connection = connectChat((event) => {
      if (validId(event.conversation_id)) {
        void client.invalidateQueries({ queryKey: ["conversations"] });
        void client.invalidateQueries({
          queryKey: ["chat-messages", event.conversation_id],
        });
      } else {
        void client.invalidateQueries({ queryKey: ["conversations"] });
        if (validId(activeId))
          void client.invalidateQueries({
            queryKey: ["chat-messages", activeId],
          });
      }
    }, setConnected);
    realtime.current = connection;
    return () => {
      connection.close();
      realtime.current = null;
    };
  }, [client, activeId]);
  useEffect(() => {
    if (!validId(activeId)) return;
    setTyping(false);
    if (!connected) return;
    realtime.current?.subscribeTyping(activeId, (event) => {
      if (event.sender_id !== profile.data?.user_id) {
        setTyping(!!event.is_typing);
        if (event.is_typing) window.setTimeout(() => setTyping(false), 4000);
      }
    });
  }, [activeId, connected, profile.data?.user_id]);
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
    if (!content || !validId(activeId)) return;
    if (
      !realtime.current?.send("/app/chat.send", {
        conversation_id: activeId,
        content,
        message_type: "TEXT",
        media_urls: [],
      })
    ) {
      setSendError("Mất kết nối. Vui lòng đợi kết nối lại rồi gửi.");
      return;
    }
    setDraft("");
    setSendError("");
    realtime.current?.send("/app/chat.typing", {
      conversation_id: activeId,
      is_typing: false,
    });
    window.setTimeout(() => {
      void client.invalidateQueries({ queryKey: ["chat-messages", activeId] });
    }, 700);
  }
  useEffect(() => {
    const last = unique.at(-1);
    if (
      connected &&
      validId(activeId) &&
      validId(last?.message_id) &&
      last?.sender_id !== profile.data?.user_id
    ) {
      realtime.current?.send("/app/chat.read", {
        conversation_id: activeId,
        message_id: last!.message_id,
      });
    }
  }, [activeId, connected, unique.at(-1)?.message_id, profile.data?.user_id]);
  return (
    <div className="chat-page surface">
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
          </div>
        )}
        {conversations.isPending ? (
          <Loading label="Đang tải hội thoại…" />
        ) : conversations.isError ? (
          <ErrorNotice message={errorMessage(conversations.error)} />
        ) : !entries.length ? (
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
        {conversations.hasNextPage && (
          <button
            className="text-button"
            onClick={() => void conversations.fetchNextPage()}
          >
            Xem thêm hội thoại
          </button>
        )}
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
              ) : messages.isError ? (
                <ErrorNotice message={errorMessage(messages.error)} />
              ) : (
                <>
                  {messages.hasNextPage && (
                    <button
                      className="text-button"
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
                </>
              )}
            </div>
            <form className="chat-compose" onSubmit={send}>
              <input
                aria-label="Nội dung tin nhắn"
                placeholder="Viết tin nhắn…"
                value={draft}
                maxLength={2000}
                onChange={(e) => {
                  setDraft(e.target.value);
                  realtime.current?.send("/app/chat.typing", {
                    conversation_id: activeId,
                    is_typing: !!e.target.value.trim(),
                  });
                }}
              />
              <button
                className="button button-primary"
                disabled={!draft.trim() || !connected}
              >
                <Send size={18} /> Gửi
              </button>
            </form>
            {sendError && <ErrorNotice message={sendError} />}
          </>
        )}
      </section>
    </div>
  );
}
