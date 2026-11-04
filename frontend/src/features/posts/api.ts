import {
  useInfiniteQuery,
  useQuery,
  type QueryClient,
} from "@tanstack/react-query";
import { api, type ApiEnvelope, unwrap } from "../../lib/api";
import { nextCursor, type CursorPage, validId } from "../../lib/cursor";
import type {
  PostResponseDto,
  CreatePostRequest,
  UpdatePostRequest,
  UpdatePostResponseDto,
  CommentResponseDto,
  CreateCommentRequest,
  UpdateCommentRequest,
  ReactRequest,
  ReactResponseDto,
} from "../social/types";

export const getPost = async (id: number, signal?: AbortSignal) =>
  unwrap(
    await api.get<ApiEnvelope<PostResponseDto>>(`/posts/${id}`, { signal }),
  );
export const usePost = (id?: number) =>
  useQuery({
    queryKey: ["posts", "detail", id],
    queryFn: ({ signal }) => getPost(id!, signal),
    enabled: validId(id),
  });
export function useUserPosts(userId?: number, own = false) {
  return useInfiniteQuery({
    queryKey: ["posts", "user", own ? "me" : userId],
    enabled: own || validId(userId),
    initialPageParam: undefined as number | undefined,
    queryFn: async ({ pageParam, signal }) =>
      unwrap(
        await api.get<ApiEnvelope<CursorPage<PostResponseDto>>>(
          own ? "/posts/me" : `/users/${userId}/posts`,
          { params: { after: pageParam, limit: 10 }, signal },
        ),
      ),
    getNextPageParam: (last, _pages, cursor) => nextCursor(last, cursor),
  });
}
export const createPost = async (body: CreatePostRequest) =>
  unwrap(await api.post<ApiEnvelope<PostResponseDto>>("/posts", body));
export const editPost = async (id: number, body: UpdatePostRequest) =>
  unwrap(
    await api.put<ApiEnvelope<UpdatePostResponseDto>>(`/posts/${id}`, body),
  );
export const deletePost = async (id: number) =>
  unwrap(await api.delete<ApiEnvelope<{ post_id?: number }>>(`/posts/${id}`));
export const reactToPost = async (body: ReactRequest) =>
  unwrap(await api.post<ApiEnvelope<ReactResponseDto>>("/react", body));

export function useComments(
  postId: number,
  parentId?: number,
  sort = "newest",
  enabled = true,
  targetType: "POST" | "QUESTION" | "SESSION" = "POST",
) {
  return useInfiniteQuery({
    queryKey: [...commentKey(postId, targetType), parentId, sort],
    enabled,
    initialPageParam: undefined as number | undefined,
    queryFn: async ({ pageParam, signal }) =>
      unwrap(
        await api.get<ApiEnvelope<CursorPage<CommentResponseDto>>>(
          "/comments",
          {
            params: {
              target_type: targetType,
              target_id: postId,
              parent_comment_id: parentId,
              sort,
              after: pageParam,
              limit: 20,
            },
            signal,
          },
        ),
      ),
    getNextPageParam: (last, _pages, cursor) => nextCursor(last, cursor),
  });
}
export const commentKey = (
  id: number,
  type: "POST" | "QUESTION" | "SESSION" = "POST",
) => (type === "POST" ? ["comments", id] : ["comments", type, id]);
export const addComment = async (body: CreateCommentRequest) =>
  unwrap(await api.post<ApiEnvelope<CommentResponseDto>>("/comments", body));
export const editComment = async (id: number, body: UpdateCommentRequest) =>
  unwrap(
    await api.put<ApiEnvelope<CommentResponseDto>>(`/comments/${id}`, body),
  );
export const deleteComment = async (id: number) =>
  unwrap(await api.delete<ApiEnvelope<unknown>>(`/comments/${id}`));

export async function refreshPosts(client: QueryClient) {
  await Promise.all([
    client.invalidateQueries({ queryKey: ["posts"] }),
    client.invalidateQueries({ queryKey: ["feed"] }),
    client.invalidateQueries({ queryKey: ["search"] }),
    client.invalidateQueries({ queryKey: ["video-posts"] }),
  ]);
}

export const updateLecturerNote = async (id: number, content: string) =>
  unwrap(
    await api.put<ApiEnvelope<unknown>>(`/posts/${id}/lecturer-notes`, {
      content,
    }),
  );
