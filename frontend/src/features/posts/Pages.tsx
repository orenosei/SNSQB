import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { ErrorNotice, Loading } from "../../components/Feedback";
import {
  EmptyState,
  LoadMore,
  QueryError,
} from "../../components/SocialFeedback";
import { routeId, validId } from "../../lib/cursor";
import { useProfile } from "../profile/api";
import { usePost, useUserPosts } from "./api";
import { PostCard } from "./PostCard";
import { PostForm } from "./PostForm";
import { CommentSection } from "./Comments";

export function PostDetailPage() {
  const { postId } = useParams();
  const id = routeId(postId);
  const query = usePost(id);
  if (!id)
    return (
      <div className="social-page">
        <ErrorNotice message="Mã bài viết không hợp lệ." />
      </div>
    );
  return (
    <div className="social-page post-detail-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={17} />
        Về bảng tin
      </Link>
      {query.isPending ? (
        <Loading label="Đang tải bài viết…" />
      ) : query.error || !query.data ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <PostCard post={query.data} detail />
          <CommentSection postId={id} />
        </>
      )}
    </div>
  );
}
export function PostEditorPage() {
  const [params] = useSearchParams();
  const { postId } = useParams();
  const navigate = useNavigate();
  const me = useProfile();
  const id = routeId(postId);
  const query = usePost(id);
  if (postId && !id)
    return (
      <div className="social-page">
        <ErrorNotice message="Mã bài viết không hợp lệ." />
      </div>
    );
  if (id && (query.isPending || me.isPending))
    return <Loading label="Đang tải bài viết…" />;
  if (id && (query.error || !query.data))
    return (
      <div className="social-page">
        <QueryError error={query.error} retry={() => void query.refetch()} />
      </div>
    );
  if (
    id &&
    (!validId(me.data?.user_id) ||
      query.data?.author?.user_id !== me.data.user_id)
  )
    return (
      <div className="social-page">
        <ErrorNotice message="Bạn chỉ được chỉnh sửa bài viết của chính mình." />
      </div>
    );
  return (
    <div className="social-page">
      <Link to={id ? `/posts/${id}` : "/"} className="back-link">
        <ArrowLeft size={17} />
        Trở về
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow text-brand">CHIA SẺ TRI THỨC</p>
          <h1>{id ? "Chỉnh sửa bài viết" : "Một điều mới để sẻ chia"}</h1>
        </div>
      </div>
      <PostForm
        defaultType={
          params.get("type") === "video" ? "LEARNING_VIDEO" : "SOCIAL_POST"
        }
        initial={query.data}
        onSaved={(savedId) =>
          navigate(validId(savedId) ? `/posts/${savedId}` : "/my-posts")
        }
        onCancel={() => navigate(id ? `/posts/${id}` : "/")}
      />
    </div>
  );
}
export function MyPostsPage() {
  const query = useUserPosts(undefined, true);
  const posts = query.data?.pages.flatMap((page) => page.items || []) || [];
  return (
    <div className="social-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow text-brand">GÓC CHIA SẺ</p>
          <h1>Bài viết của bạn</h1>
        </div>
        <Link to="/posts/new" className="button button-primary">
          <Plus size={17} />
          Viết bài
        </Link>
      </div>
      {query.isPending ? (
        <Loading label="Đang tải bài viết…" />
      ) : (
        <>
          {posts.length === 0 && !query.isError && (
            <EmptyState
              title="Trang mới cho ý tưởng mới"
              description="Bạn chưa có bài viết nào. Chia sẻ điều vừa học cùng mọi người nhé."
            />
          )}
          <div className="post-list">
            {posts.map((post, index) => (
              <PostCard key={post.post_id || index} post={post} />
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
  );
}
