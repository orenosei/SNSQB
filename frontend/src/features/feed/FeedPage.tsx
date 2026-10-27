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
import { useFeed } from "./api";

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
        <span className="activity-unavailable">
          Chi tiết hoạt động này chưa khả dụng.
        </span>
      </div>
    </div>
  );
}
export function FeedPage() {
  const query = useFeed();
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
            onClick={() => void query.refetch()}
          >
            <RefreshCw size={19} />
          </button>
        </div>
        <PostForm onSaved={setCreated} />
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
        {query.isPending ? (
          <PostSkeletons />
        ) : (
          <>
            {!items.length && !query.isError && (
              <EmptyState
                title="Kết nối để khám phá thêm"
                description="Bảng tin chưa có hoạt động. Hãy tìm bạn học, kết bạn hoặc theo dõi để mở rộng không gian học tập."
              />
            )}
            <div className="post-list">
              {items.map((item, index) => (
                <FeedItem key={item.feed_id || index} item={item} />
              ))}
            </div>
            {query.isError && (
              <QueryError
                error={query.error}
                retry={() => void query.refetch()}
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
