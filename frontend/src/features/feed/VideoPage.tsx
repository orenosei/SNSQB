import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { api, type ApiEnvelope, unwrap } from "../../lib/api";
import { nextCursor } from "../../lib/cursor";
import { Loading } from "../../components/Feedback";
import { PostCard } from "../posts/PostCard";
import type { PostResponseDto, CursorPaginationDto } from "../social/types";
import { useProfile } from "../profile/api";
import { QueryError } from "../../components/SocialFeedback";
interface VideoList {
  items?: PostResponseDto[];
  pagination?: CursorPaginationDto;
}
export function VideoPage() {
  const me = useProfile();
  const query = useInfiniteQuery({
    queryKey: ["video-posts"],
    initialPageParam: undefined as number | undefined,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await api.get<ApiEnvelope<VideoList>>("/video-posts", {
          params: { after: pageParam, limit: 3 },
        }),
      ),
    getNextPageParam: (last, _pages, cursor) => nextCursor(last, cursor),
  });
  const items = query.data?.pages.flatMap((page) => page.items || []) || [];
  return (
    <div className="social-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow text-brand">HỌC QUA VIDEO</p>
          <h1>Video bài giảng</h1>
          <p className="muted">Nội dung do giảng viên chia sẻ.</p>
        </div>
        {me.data?.role === "LECTURER" && (
          <Link className="button button-primary" to="/posts/new?type=video">
            Đăng video bài giảng
          </Link>
        )}
      </div>
      {query.isPending ? (
        <Loading label="Đang tải video…" />
      ) : !items.length && !query.isError ? (
        <div className="surface notification-empty">
          <h2>Chưa có video</h2>
          <p>Video bài giảng sẽ xuất hiện tại đây.</p>
          <Link to="/question-bank" className="text-button">
            Khám phá câu hỏi
          </Link>
        </div>
      ) : (
        <div className="post-list">
          {items.map((item) => (
            <PostCard key={item.post_id} post={item} />
          ))}
        </div>
      )}
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
      {query.hasNextPage && (
        <button
          className="text-button"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Xem thêm video
        </button>
      )}
    </div>
  );
}
