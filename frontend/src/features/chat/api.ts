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
  message_type?: "TEXT" | "IMAGE" | "VIDEO" | "GIF" | "SYSTEM";
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

export interface GroupInvitation {
  invitation_id: number;
  group_name?: string;
  group_avatar_url?: string;
  inviter_name?: string;
  expires_at?: string;
}
export interface ChatPresence {
  conversation_id: number;
  active: boolean;
}

export async function getGroupInvitations(after: number | undefined, signal: AbortSignal) {
  return unwrap(await api.get<ApiEnvelope<{ items?: GroupInvitation[]; pagination?: CursorPaginationDto }>>(
    "/conversations/group/invitations", { params: { after, limit: 20 }, signal },
  ));
}

export async function respondToInvitation(id: number, accept: boolean) {
  const path = `/conversations/group/invitations/${id}`;
  return accept
    ? unwrap(await api.post<ApiEnvelope<number>>(`${path}/accept`))
    : unwrap(await api.delete<ApiEnvelope<undefined>>(path));
}

export async function getChatPresence(ids: number[], signal: AbortSignal) {
  const groups = [];
  for (let start = 0; start < ids.length; start += 100) {
    groups.push(ids.slice(start, start + 100));
  }
  const results = await Promise.all(groups.map(async (group) =>
    unwrap(await api.get<ApiEnvelope<ChatPresence[]>>("/conversations/presence", {
      signal, params: { conversation_ids: group.join(",") },
    })),
  ));
  return Object.fromEntries(results.flat().map((entry) => [entry.conversation_id, entry.active]));
}
