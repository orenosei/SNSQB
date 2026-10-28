import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { Link } from "react-router";
import { Loading, ErrorNotice } from "../../components/Feedback";
import { errorMessage } from "../../lib/api";
import { formatTime, nextCursor, validId } from "../../lib/cursor";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./api";

export function NotificationsPage() {
  const client = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: ["notifications"],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => getNotifications(pageParam),
    getNextPageParam: (last, _pages, cursor) => nextCursor(last, cursor),
    refetchInterval: 30000,
  });
  const markOne = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const items = query.data?.pages.flatMap((page) => page.items || []) || [];
  const unread = query.data?.pages[0]?.unread_count || 0;
  return (
    <div className="social-page notification-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow text-brand">CẬP NHẬT MỚI</p>
          <h1>Thông báo</h1>
          <p className="muted">
            {unread
              ? `${unread} thông báo chưa đọc`
              : "Bạn đã xem hết thông báo"}
          </p>
        </div>
        <button
          className="button button-secondary"
          disabled={!unread || markAll.isPending}
          onClick={() => markAll.mutate()}
        >
          <CheckCheck size={17} /> Đánh dấu tất cả đã đọc
        </button>
      </div>
      <Link to="/settings/notifications" className="text-button">
        Cài đặt thông báo
      </Link>
      {(markOne.isError || markAll.isError) && (
        <ErrorNotice message={errorMessage(markOne.error || markAll.error)} />
      )}
      {query.isPending ? (
        <Loading label="Đang tải thông báo…" />
      ) : query.isError ? (
        <ErrorNotice message={errorMessage(query.error)} />
      ) : !items.length ? (
        <div className="surface notification-empty">
          <Bell size={35} />
          <h2>Chưa có thông báo</h2>
          <p>Hoạt động mới sẽ xuất hiện tại đây.</p>
        </div>
      ) : (
        <div className="notification-list">
          {items.map((item, index) => (
            <article
              key={item.notification_id || index}
              className={`surface notification-item ${!item.read_at ? "unread" : ""}`}
            >
              <Bell size={20} />
              <div>
                <strong>{item.title || "Thông báo"}</strong>
                <p>{item.body}</p>
                <small>{formatTime(item.created_at)}</small>
                {item.target?.url?.startsWith("/") && (
                  <Link to={item.target.url} className="text-button">
                    Xem chi tiết
                  </Link>
                )}
              </div>
              {!item.read_at && (
                <button
                  className="button button-secondary"
                  disabled={markOne.isPending || !validId(item.notification_id)}
                  onClick={() => markOne.mutate(item.notification_id!)}
                >
                  Đã đọc
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      {query.hasNextPage && (
        <button
          className="text-button"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Xem thêm
        </button>
      )}
    </div>
  );
}
