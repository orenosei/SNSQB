import { api, type ApiEnvelope, unwrap } from "../../lib/api";
import type { CursorPaginationDto } from "../social/types";
export interface Notification {
  notification_id?: number;
  type?: string;
  title?: string;
  body?: string;
  read_at?: string;
  created_at?: string;
  target?: { type?: string; target_id?: number; url?: string };
}
export interface NotificationList {
  items?: Notification[];
  pagination?: CursorPaginationDto;
  unread_count?: number;
}
export async function getNotifications(after?: number) {
  return unwrap(
    await api.get<ApiEnvelope<NotificationList>>("/notifications", {
      params: { after, limit: 20 },
    }),
  );
}
export async function markNotificationRead(id: number) {
  return unwrap(
    await api.post<
      ApiEnvelope<{
        notification_id?: number;
        read?: boolean;
        unread_count?: number;
      }>
    >(`/notifications/${id}/read`),
  );
}
export async function markAllNotificationsRead() {
  return unwrap(
    await api.post<ApiEnvelope<unknown>>("/notifications/read-all"),
  );
}
