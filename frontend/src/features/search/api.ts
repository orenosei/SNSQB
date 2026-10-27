import { useInfiniteQuery } from "@tanstack/react-query";
import { api, type ApiEnvelope, unwrap } from "../../lib/api";
import { nextCursor } from "../../lib/cursor";
import type { GlobalSearchResponseDto } from "../social/types";

export function useSearch(query: string, type: "USER" | "POST") {
  return useInfiniteQuery({
    queryKey: ["search", query, type],
    enabled: !!query.trim(),
    initialPageParam: undefined as number | undefined,
    queryFn: async ({ pageParam, signal }) =>
      unwrap(
        await api.get<ApiEnvelope<GlobalSearchResponseDto>>("/search", {
          params: { query: query.trim(), type, after: pageParam, limit: 10 },
          signal,
        }),
      ),
    getNextPageParam: (last, _pages, cursor) => nextCursor(last, cursor),
  });
}
