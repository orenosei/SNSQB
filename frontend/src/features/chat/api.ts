import { api, type ApiEnvelope, unwrap } from "../../lib/api";
import type { CursorPaginationDto } from "../social/types";

export interface Conversation {
  conversation_id?: number;
  type?: "DIRECT" | "GROUP";
  display_name?: string;
  display_avatar_url?: string;
  unread_count?: number;
  last_message?: { message_id?: number; content?: string; created_at?: string };
  updated_at?: string;
}
export interface Message {
  message_id?: number;
  sender_id?: number;
  sender_name?: string;
  content?: string;
  message_type?: "TEXT" | "IMAGE" | "VIDEO" | "GIF";
  media_urls?: string[];
  created_at?: string;
  revoked?: boolean;
}
export interface ConversationList {
  items?: Conversation[];
  pagination?: CursorPaginationDto;
}
export interface MessageList {
  conversation_id?: number;
  messages?: Message[];
  pagination?: CursorPaginationDto;
}
export async function getConversations(after?: number) {
  return unwrap(
    await api.get<ApiEnvelope<ConversationList>>("/conversations", {
      params: { after, limit: 20 },
    }),
  );
}
export async function getMessages(id: number, after?: number) {
  return unwrap(
    await api.get<ApiEnvelope<MessageList>>(`/conversations/${id}/messages`, {
      params: { after, limit: 30 },
    }),
  );
}
export async function createDirectConversation(target_user_id: number) {
  return unwrap(
    await api.post<ApiEnvelope<{ conversation_id?: number }>>(
      "/conversations/direct",
      { target_user_id },
    ),
  );
}
export async function deleteMessage(id: number) {
  return unwrap(
    await api.delete<ApiEnvelope<{ message_id?: number }>>(`/messages/${id}`, {
      data: { scope: "EVERYONE" },
    }),
  );
}
