import { useInfiniteQuery } from "@tanstack/react-query";
import { api, type ApiEnvelope, unwrap } from "../../lib/api";
import { nextCursor } from "../../lib/cursor";
import type { CursorPaginationDto } from "../social/types";

export async function readRewards<T>(
  path: string,
  signal: AbortSignal,
  params?: Record<string, unknown>,
) {
  return unwrap(await api.get<ApiEnvelope<T>>(path, { signal, params }));
}

export function useRewardsPages<T extends { pagination?: CursorPaginationDto }>(
  path: string,
  filters: Record<string, unknown> = {},
) {
  return useInfiniteQuery({
    queryKey: ["rewards", path, filters],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam, signal }) =>
      readRewards<T>(path, signal, { ...filters, after: pageParam, limit: 20 }),
    getNextPageParam: (page, _pages, cursor) => nextCursor(page, cursor),
  });
}
