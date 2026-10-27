import {
  useInfiniteQuery,
  useQuery,
  type QueryClient,
} from "@tanstack/react-query";
import { api, type ApiEnvelope, unwrap } from "../../lib/api";
import { nextCursor, validId, type CursorPage } from "../../lib/cursor";
import type {
  AuthorDto,
  ProfileResponse,
  RelationshipStatsResponseDto,
  FriendListResponseDto,
  FriendRequestReceivedListResponseDto,
  FriendRequestSentListResponseDto,
  FollowingListResponseDto,
  FollowerListResponseDto,
  BlockedListResponseDto,
  FriendshipResponseDto,
  FollowResponseDto,
  UnfollowResponseDto,
  BlockResponseDto,
  UnblockResponseDto,
} from "../social/types";

export const usePublicProfile = (id?: number) =>
  useQuery({
    queryKey: ["people", "profile", id],
    enabled: validId(id),
    queryFn: async ({ signal }) =>
      unwrap(
        await api.get<ApiEnvelope<ProfileResponse>>(`/users/${id}`, { signal }),
      ),
  });
export const useRelationship = (id?: number) =>
  useQuery({
    queryKey: ["people", "relationship", id],
    enabled: validId(id),
    queryFn: async ({ signal }) =>
      unwrap(
        await api.get<ApiEnvelope<RelationshipStatsResponseDto>>(
          `/users/${id}/relationship-stats`,
          { signal },
        ),
      ),
  });

export type PeopleKind =
  | "friends"
  | "received"
  | "sent"
  | "following"
  | "followers"
  | "blocked";
export interface PersonEntry {
  person: AuthorDto;
  status?: FriendshipResponseDto["status"];
  subtitle?: string;
}
const paths: Record<PeopleKind, string> = {
  friends: "/friendships",
  received: "/friendships/requests/received",
  sent: "/friendships/requests/sent",
  following: "/follows/following",
  followers: "/follows/followers",
  blocked: "/blocks",
};

async function getPeople(
  kind: PeopleKind,
  after: number | undefined,
  signal: AbortSignal,
): Promise<CursorPage<PersonEntry>> {
  const config = { params: { after, limit: 20 }, signal };
  // Normalize only at the UI boundary; DTO fields and request params remain Swagger's.
  if (kind === "received") {
    const data = unwrap(
      await api.get<ApiEnvelope<FriendRequestReceivedListResponseDto>>(
        paths[kind],
        config,
      ),
    );
    return {
      pagination: data.pagination,
      items: data.items?.map((item) => ({
        person: item.requester || {},
        status: item.status,
      })),
    };
  }
  if (kind === "sent") {
    const data = unwrap(
      await api.get<ApiEnvelope<FriendRequestSentListResponseDto>>(
        paths[kind],
        config,
      ),
    );
    return {
      pagination: data.pagination,
      items: data.items?.map((item) => ({
        person: item.receiver || {},
        status: item.status,
      })),
    };
  }
  if (kind === "following") {
    const data = unwrap(
      await api.get<ApiEnvelope<FollowingListResponseDto>>(paths[kind], config),
    );
    return {
      pagination: data.pagination,
      items: data.items?.map((item) => ({
        person: item,
        subtitle: item.school_faculty,
      })),
    };
  }
  if (kind === "followers") {
    const data = unwrap(
      await api.get<ApiEnvelope<FollowerListResponseDto>>(paths[kind], config),
    );
    return {
      pagination: data.pagination,
      items: data.items?.map((item) => ({
        person: item,
        subtitle: item.school_faculty,
      })),
    };
  }
  const data = unwrap(
    await api.get<ApiEnvelope<FriendListResponseDto | BlockedListResponseDto>>(
      paths[kind],
      config,
    ),
  );
  return {
    pagination: data.pagination,
    items: data.items?.map((person) => ({ person })),
  };
}

export const usePeople = (kind: PeopleKind) =>
  useInfiniteQuery({
    queryKey: ["people", "list", kind],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam, signal }) => getPeople(kind, pageParam, signal),
    getNextPageParam: (last, _pages, cursor) => nextCursor(last, cursor),
  });
export const sendFriendRequest = async (id: number) =>
  unwrap(
    await api.post<ApiEnvelope<FriendshipResponseDto>>("/friendships/request", {
      addressee_id: id,
    }),
  );
export const acceptFriendRequest = async (id: number) =>
  unwrap(
    await api.post<ApiEnvelope<FriendshipResponseDto>>("/friendships/accept", {
      requester_id: id,
    }),
  );
export const declineFriendRequest = async (id: number) =>
  unwrap(
    await api.post<ApiEnvelope<FriendshipResponseDto>>("/friendships/decline", {
      requester_id: id,
    }),
  );
export const unfriend = async (id: number) =>
  unwrap(await api.delete<ApiEnvelope<unknown>>(`/friendships/${id}`));
export const follow = async (id: number) =>
  unwrap(await api.post<ApiEnvelope<FollowResponseDto>>(`/follows/${id}`));
export const unfollow = async (id: number) =>
  unwrap(await api.delete<ApiEnvelope<UnfollowResponseDto>>(`/follows/${id}`));
export const block = async (id: number) =>
  unwrap(await api.post<ApiEnvelope<BlockResponseDto>>(`/blocks/${id}`));
export const unblock = async (id: number) =>
  unwrap(await api.delete<ApiEnvelope<UnblockResponseDto>>(`/blocks/${id}`));

export async function refreshPeople(client: QueryClient, privacy = false) {
  // Blocking can revoke visibility immediately; clear stale social content before refetch.
  await Promise.all([
    privacy
      ? client.resetQueries({ queryKey: ["posts"] })
      : client.invalidateQueries({ queryKey: ["posts"] }),
    privacy
      ? client.resetQueries({ queryKey: ["feed"] })
      : client.invalidateQueries({ queryKey: ["feed"] }),
    privacy
      ? client.resetQueries({ queryKey: ["search"] })
      : client.invalidateQueries({ queryKey: ["search"] }),
    client.invalidateQueries({ queryKey: ["people"] }),
    client.invalidateQueries({ queryKey: ["profile", "me"] }),
  ]);
}
