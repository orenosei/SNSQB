import { useInfiniteQuery } from "@tanstack/react-query";
import { api, type ApiEnvelope, unwrap } from "../../lib/api";
import { nextCursor } from "../../lib/cursor";
import type { GlobalSearchResponseDto } from "../social/types";

export const searchTypes = [
  "ALL",
  "USER",
  "POST",
  "QUESTION",
  "SESSION",
  "SUBJECT",
] as const;
export type SearchType = (typeof searchTypes)[number];
export function useSearch(query: string, type: SearchType) {
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

export interface SavedSearches {
  saved_searches?: Array<{
    saved_search_id?: number;
    query_text?: string;
    last_searched_at?: string;
  }>;
  trending_searches?: string[];
}
export async function getSavedSearches() {
  return unwrap(await api.get<ApiEnvelope<SavedSearches>>("/search/saved"));
}
export async function saveSearch(query: string) {
  return unwrap(await api.post<ApiEnvelope<unknown>>("/search/saved", { query }));
}
export async function deleteSavedSearch(id: number) {
  return unwrap(await api.delete<ApiEnvelope<unknown>>(`/search/saved/${id}`));
}
