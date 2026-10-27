import type { CursorPaginationDto } from "../features/social/types";

export interface CursorPage<T> {
  items?: T[];
  pagination?: CursorPaginationDto;
}

export function nextCursor(
  page: { pagination?: CursorPaginationDto },
  previous?: number,
) {
  const cursor = page.pagination?.after;
  return page.pagination?.has_next &&
    Number.isSafeInteger(cursor) &&
    cursor !== previous
    ? cursor
    : undefined;
}

export function validId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function routeId(value?: string) {
  if (!value || !/^[1-9]\d*$/.test(value)) return undefined;
  const id = Number(value);
  return validId(id) ? id : undefined;
}

export function formatTime(value?: string) {
  if (!value) return "Chưa có thời gian";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Chưa có thời gian"
    : new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}
