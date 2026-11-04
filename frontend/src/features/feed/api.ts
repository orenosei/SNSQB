import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api, type ApiEnvelope, unwrap } from "../../lib/api";
import { nextCursor, type CursorPage } from "../../lib/cursor";
import type { ActivityFeedItemDto } from "../social/types";

export const useFeed = () =>
  useInfiniteQuery({
    queryKey: ["feed"],
    initialPageParam: undefined as number | undefined,
    queryFn: async ({ pageParam, signal }) =>
      unwrap(
        await api.get<ApiEnvelope<CursorPage<ActivityFeedItemDto>>>(
          "/activity-feeds",
          { params: { after: pageParam, limit: 10 }, signal },
        ),
      ),
    getNextPageParam: (last, _pages, cursor) => nextCursor(last, cursor),
  });

export const useNewFeedCount = (since: number, enabled: boolean) =>
  useQuery({
    queryKey: ["feed-new-count", since],
    enabled,
    refetchInterval: 30000,
    queryFn: async ({ signal }) =>
      unwrap(
        await api.get<ApiEnvelope<{ new_count?: number }>>(
          "/activity-feeds/new-count",
          { params: { since }, signal },
        ),
      ),
  });
