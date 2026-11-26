import { Link, Navigate, useParams } from "react-router";
import { GraduationCap } from "lucide-react";
import { Avatar, imageUrl } from "../../components/Avatar";
import { ErrorNotice, Loading } from "../../components/Feedback";
import {
  EmptyState,
  LoadMore,
  QueryError,
} from "../../components/SocialFeedback";
import { routeId } from "../../lib/cursor";
import { useProfile } from "../profile/api";
import { useUserPosts } from "../posts/api";
import { PostCard } from "../posts/PostCard";
import { usePublicProfile, useRelationship } from "./api";
import { RelationshipActions } from "./RelationshipActions";
import { ReportButton } from "../reports/ReportButton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { createDirectConversation } from "../chat/api";
import { errorMessage } from "../../lib/api";
import { useState } from "react";
import { UserContributions } from "./UserContributions";

export function UserPage() {
  const { userId } = useParams();
  const id = routeId(userId);
  const me = useProfile();
  const profile = usePublicProfile(id);
  const relation = useRelationship(id);
  const navigate = useNavigate();
  const client = useQueryClient();
  const chat = useMutation({
    mutationFn: createDirectConversation,
    onSuccess: async (value) => {
      await client.invalidateQueries({ queryKey: ["conversations"] });
      if (value.conversation_id) navigate(`/chat?id=${value.conversation_id}`);
    },
  });
  if (!id)
    return (
      <div className="social-page">
        <ErrorNotice message="Mã người dùng không hợp lệ." />
      </div>
    );
  if (id === me.data?.user_id) return <Navigate to="/me" replace />;
  const data = profile.data;
  const counts = relation.data?.counts;
  return (
    <div className="social-page user-profile-page">
      <Link to="/friends" className="back-link">
        ← Cộng đồng của bạn
      </Link>
      {profile.isPending ? (
        <Loading />
      ) : (
        <>
          {profile.error && (
            <QueryError
              error={profile.error}
              retry={() => void profile.refetch()}
            />
          )}
          <section className="surface public-profile">
            <div
              className="public-cover"
              style={
                imageUrl(data?.cover_url)
                  ? {
                      backgroundImage: `url(${JSON.stringify(imageUrl(data?.cover_url))})`,
                    }
                  : undefined
              }
            >
              <GraduationCap size={48} />
            </div>
            <div className="public-identity">
              <Avatar large name={data?.full_name} url={data?.avatar_url} frame={data?.frame_url} />
              <h1>{data?.full_name || "Trang cá nhân"}</h1>
              <p className="muted">
                {data?.role === "STUDENT"
                  ? "Sinh viên"
                  : data?.role === "LECTURER"
                    ? "Giảng viên"
                    : "Thành viên"}
                {data?.school_faculty ? ` · ${data.school_faculty}` : ""}
              </p>
              <p className="public-bio">{data?.bio}</p>
              <div className="public-counts">
                <span>
                  <strong>{counts?.friends_count ?? "—"}</strong> bạn bè
                </span>
                <span>
                  <strong>{counts?.followers_count ?? "—"}</strong> người theo
                  dõi
                </span>
                <span>
                  <strong>{counts?.following_count ?? "—"}</strong> đang theo
                  dõi
                </span>
              </div>
              <RelationshipActions userId={id} profile={data} />
              <div className="profile-extra-actions">
                <button
                  className="button button-secondary"
                  disabled={chat.isPending}
                  onClick={() => chat.mutate(id)}
                >
                  Nhắn tin
                </button>
                <ReportButton targetType="USER" targetId={id} />
              </div>
              {chat.isError && (
                <ErrorNotice message={errorMessage(chat.error)} />
              )}
            </div>
          </section>
          {relation.data?.relationship_with_me?.blocked === true ? (
            <EmptyState
              title="Bạn đang chặn người dùng này"
              description="Nội dung sẽ không hiển thị trong khi chặn. Bạn có thể bỏ chặn ở phía trên."
            />
          ) : (
            relation.isSuccess &&
            relation.data?.relationship_with_me?.blocked === false && (
              <PublicContent key={id} userId={id} />
            )
          )}
        </>
      )}
    </div>
  );
}
function PublicContent({ userId }: { userId: number }) {
  const [tab, setTab] = useState<"posts" | "sessions">("posts");
  return (
    <>
      <nav className="social-tabs" aria-label="Nội dung thành viên">
        <button
          aria-pressed={tab === "posts"}
          className={tab === "posts" ? "tab-active" : ""}
          onClick={() => setTab("posts")}
        >
          Bài viết
        </button>
        <button
          aria-pressed={tab === "sessions"}
          className={tab === "sessions" ? "tab-active" : ""}
          onClick={() => setTab("sessions")}
        >
          Bộ câu hỏi
        </button>
      </nav>
      <Link className="text-button" to={`/users/${userId}/badges`}>Xem huy hiệu</Link>
      {tab === "posts" ? (
        <PublicPosts userId={userId} />
      ) : (
        <UserContributions userId={userId} />
      )}
    </>
  );
}
function PublicPosts({ userId }: { userId: number }) {
  const query = useUserPosts(userId);
  const posts = query.data?.pages.flatMap((page) => page.items || []) || [];
  return (
    <section className="public-posts">
      <h2>Bài viết đã chia sẻ</h2>
      {query.isPending ? (
        <Loading label="Đang tải bài viết…" />
      ) : (
        <>
          {!posts.length && !query.isError && (
            <EmptyState
              title="Chưa có bài viết hiển thị"
              description="Chỉ những bài viết mà bạn được phép xem mới xuất hiện ở đây."
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
    </section>
  );
}
