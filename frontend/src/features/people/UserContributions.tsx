import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { api, type ApiEnvelope, unwrap } from "../../lib/api";
import { nextCursor, validId } from "../../lib/cursor";
import { Loading } from "../../components/Feedback";
import {
  EmptyState,
  LoadMore,
  QueryError,
} from "../../components/SocialFeedback";
import type { SubmissionsResponse } from "../academic/types";

export function UserContributions({ userId }: { userId: number }) {
  const query = useInfiniteQuery({
    queryKey: ["public-submissions", userId],
    initialPageParam: undefined as number | undefined,
    queryFn: async ({ pageParam, signal }) =>
      unwrap(
        await api.get<ApiEnvelope<SubmissionsResponse>>(
          `/users/${userId}/sessions`,
          { params: { after: pageParam, limit: 10 }, signal },
        ),
      ),
    getNextPageParam: (last, _pages, cursor) => nextCursor(last, cursor),
  });
  const items = query.data?.pages.flatMap((page) => page.contents || []) || [];
  return (
    <section className="public-posts">
      <h2>Bộ câu hỏi đã đóng góp</h2>
      {query.isPending ? (
        <Loading label="Đang tải bộ câu hỏi…" />
      ) : (
        <>
          {!items.length && !query.isError && (
            <EmptyState
              title="Chưa có bộ câu hỏi hiển thị"
              description="Chỉ các bộ câu hỏi mà máy chủ cho phép bạn xem mới xuất hiện tại đây."
            />
          )}
          <div className="bank-grid">
            {items.map((item, i) => (
              <article
                className="surface collection-card"
                key={item.session_id || i}
              >
                <span className="subject-pill">
                  {item.subject_name || "Bộ câu hỏi"}
                </span>
                <h3>{item.title || item.session_code || "Bộ câu hỏi"}</h3>
                <p>{item.content}</p>
                <div className="collection-footer">
                  <span>{item.question_counts ?? "—"} câu hỏi</span>
                  {validId(item.session_id) && (
                    <Link
                      className="text-button"
                      to={`/practice/${item.session_id}`}
                    >
                      Mở luyện tập →
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
          {query.isError && (
            <QueryError
              error={query.error}
              retry={() =>
                void (query.isFetchNextPageError
                  ? query.fetchNextPage()
                  : query.refetch())
              }
            />
          )}
          <LoadMore
            hasNext={!!query.hasNextPage}
            pending={query.isFetchingNextPage}
            load={() => void query.fetchNextPage()}
          />
        </>
      )}
    </section>
  );
}
