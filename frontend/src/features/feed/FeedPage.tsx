import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, BookOpen, RefreshCw, Users } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import {
  EmptyState,
  LoadMore,
  PostSkeletons,
  QueryError,
} from "../../components/SocialFeedback";
import { validId, formatTime } from "../../lib/cursor";
import { usePost } from "../posts/api";
import { PostCard } from "../posts/PostCard";
import { PostForm } from "../posts/PostForm";
import type { ActivityFeedItemDto } from "../social/types";
import { useFeed, useNewFeedCount } from "./api";

function FeedItem({ item }: { item: ActivityFeedItemDto }) {
  const post = usePost(
    item.target_type === "POST" ? item.target_id : undefined,
  );
  if (item.target_type === "POST" && validId(item.target_id)) {
    if (post.isPending) return <PostSkeletons />;
    if (post.isError || !post.data)
      return (
        <div className="surface feed-unavailable">
          <p>
            Bài viết không thể hiển thị. Nội dung có thể đã bị xóa hoặc giới hạn
            quyền xem.
          </p>
          <Link to={`/posts/${item.target_id}`}>Xem chi tiết</Link>
        </div>
      );
    return <PostCard post={post.data} />;
  }
  const labels = {
    SESSION_RESOLVED_APPROVED: "có phiên đóng góp được duyệt",
    EARNED_BADGE: "vừa đạt huy hiệu",
    REACHED_MILESTONE: "vừa đạt cột mốc mới",
    CREATED_POST: "vừa chia sẻ bài viết",
    PUBLISHED_LECTURE_VIDEO: "vừa chia sẻ video bài giảng",
  };
  return (
    <div className="surface activity-card">
      <Avatar name={item.actor?.full_name} url={item.actor?.avatar_url} />
      <div>
        <p>
          <strong>{item.actor?.full_name || "Một thành viên"}</strong>{" "}
          {item.action_type ? labels[item.action_type] : "có hoạt động mới"}.
        </p>
        <time>{formatTime(item.created_at)}</time>
        {validId(item.target_id) && item.target_type === "SESSION" ? (
          <Link className="text-button" to={`/practice/${item.target_id}`}>
            Khám phá bộ câu hỏi →
          </Link>
        ) : validId(item.target_id) && item.target_type === "USER" ? (
          <Link className="text-button" to={`/users/${item.target_id}`}>
            Xem thành viên →
          </Link>
        ) : (
          <span className="activity-unavailable">
            Chi tiết hoạt động này chưa khả dụng.
          </span>
        )}
      </div>
    </div>
  );
}
export function FeedPage() {
  const query = useFeed();
  const [since, setSince] = useState(Date.now);
  const [filter, setFilter] = useState("ALL");
  const newFeed = useNewFeedCount(since, !!query.data);
  async function refresh() {
    const startedAt = Date.now();
    const result = await query.refetch();
    if (!result.isError) setSince(startedAt);
  }
  const [created, setCreated] = useState<number>();
  const seen = new Set<number>();
  const items = (
    query.data?.pages.flatMap((page) => page.items || []) || []
  ).filter((item) => {
    if (item.target_type !== "POST" || !validId(item.target_id)) return true;
    if (seen.has(item.target_id)) return false;
    seen.add(item.target_id);
    return true;
  });
  const visibleItems = items.filter(
    (item) =>
      filter === "ALL" ||
      (filter === "POST" && item.action_type === "CREATED_POST") ||
      (filter === "SESSION" &&
        item.action_type === "SESSION_RESOLVED_APPROVED") ||
      (filter === "VIDEO" && item.action_type === "PUBLISHED_LECTURE_VIDEO"),
  );
  return (
    <div className="feed-layout">
      <div className="feed-main">
        <div className="page-heading">
          <div>
            <p className="eyebrow text-brand">KẾT NỐI TRI THỨC</p>
            <h1>Bảng tin học tập</h1>
            <p className="muted social-subtitle">
              Một góc nhìn mới, một điều hay mỗi ngày.
            </p>
          </div>
          <button
            className="icon-button"
            aria-label="Làm mới bảng tin"
            disabled={query.isFetching}
            onClick={() => void refresh()}
          >
            <RefreshCw size={19} />
          </button>
        </div>
        <details className="surface composer-fold" open>
          <summary>
            <BookOpen size={21} />
            <span>Một ý tưởng để sẻ chia?</span>
            <strong>Viết bài</strong>
          </summary>
          <PostForm onSaved={setCreated} />
        </details>
        {!!newFeed.data?.new_count && (
          <div className="new-feed-notice">
            <button
              className="button button-primary"
              disabled={query.isFetching}
              onClick={() => void refresh()}
            >
              {newFeed.data.new_count} hoạt động mới · Cập nhật bảng tin
            </button>
          </div>
        )}
        {newFeed.isError && (
          <p className="muted feed-update-error">
            Chưa thể kiểm tra hoạt động mới.{" "}
            <button
              className="text-button"
              disabled={newFeed.isFetching}
              onClick={() => void newFeed.refetch()}
            >
              Thử lại cập nhật
            </button>
          </p>
        )}
        {validId(created) && (
          <div className="notice notice-success" role="status">
            Đã đăng bài viết.{" "}
            <Link to={`/posts/${created}`}>Xem bài vừa đăng</Link>
          </div>
        )}
        <div className="feed-section-label">
          <span>Mới từ cộng đồng</span>
          <span>Dành cho bạn</span>
        </div>
        <nav className="social-tabs" aria-label="Lọc hoạt động đã tải">
          {[
            { key: "ALL", label: "Tất cả" },
            { key: "POST", label: "Chia sẻ" },
            { key: "SESSION", label: "Bộ câu hỏi" },
            { key: "VIDEO", label: "Video" },
          ].map((tab) => (
            <button
              key={tab.key}
              className={filter === tab.key ? "tab-active" : ""}
              aria-pressed={filter === tab.key}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        {filter !== "ALL" && (
          <p className="field-hint feed-filter-hint">
            Đang lọc trong các hoạt động đã tải. Chọn “Xem thêm” để tìm trong
            các hoạt động cũ hơn.
          </p>
        )}
        {query.isPending ? (
          <PostSkeletons />
        ) : (
          <>
            {!visibleItems.length && !query.isError && (
              <EmptyState
                title={
                  filter === "ALL"
                    ? "Kết nối để khám phá thêm"
                    : "Chưa có hoạt động phù hợp trong phần đã tải"
                }
                description={
                  filter === "ALL"
                    ? "Bảng tin chưa có hoạt động. Hãy tìm bạn học, kết bạn hoặc theo dõi để mở rộng không gian học tập."
                    : "Tải thêm hoạt động hoặc quay lại tất cả để khám phá cộng đồng."
                }
                action={
                  filter === "ALL" ? (
                    <Link className="button button-secondary" to="/search">
                      Tìm bạn học
                    </Link>
                  ) : (
                    <button
                      className="button button-secondary"
                      onClick={() => setFilter("ALL")}
                    >
                      Xem tất cả
                    </button>
                  )
                }
              />
            )}
            <div className="post-list">
              {visibleItems.map((item, index) => (
                <FeedItem key={item.feed_id || index} item={item} />
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
      </div>
      <aside className="feed-aside">
        <div className="surface feed-welcome">
          <span className="welcome-icon">
            <BookOpen size={25} />
          </span>
          <h2>Mỗi câu hỏi đều mở ra một kết nối.</h2>
          <p>
            Chia sẻ điều bạn biết. Cùng nhau tìm lời giải cho điều bạn chưa
            biết.
          </p>
          <Link to="/search" className="text-button">
            Khám phá cộng đồng <ArrowRight size={16} />
          </Link>
        </div>
        <div className="surface feed-shortcuts">
          <h2>Không gian của bạn</h2>
          <Link to="/my-posts">
            <BookOpen size={19} />
            Bài viết đã chia sẻ <ArrowRight size={15} />
          </Link>
          <Link to="/friends">
            <Users size={19} />
            Bạn bè & lời mời <ArrowRight size={15} />
          </Link>
        </div>
        <p className="feed-aside-footer">SNSQB · Học hỏi. Kết nối. Sẻ chia.</p>
      </aside>
    </div>
  );
}
