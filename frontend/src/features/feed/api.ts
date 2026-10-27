import { useInfiniteQuery } from "@tanstack/react-query";
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
