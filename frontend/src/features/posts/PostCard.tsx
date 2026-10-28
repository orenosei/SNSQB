import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Globe2,
  LockKeyhole,
  MessageCircle,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { Avatar, imageUrl } from "../../components/Avatar";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { errorMessage } from "../../lib/api";
import { formatTime, validId } from "../../lib/cursor";
import { useProfile } from "../profile/api";
import type { PostResponseDto } from "../social/types";
import { deletePost, refreshPosts } from "./api";
import { ReactionPicker } from "./ReactionPicker";
import { visibilityLabels } from "./PostForm";
import { ReportButton } from "../reports/ReportButton";

export function PostCard({
  post,
  detail = false,
}: {
  post: PostResponseDto;
  detail?: boolean;
}) {
  const me = useProfile();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const owner =
    validId(post.author?.user_id) && post.author.user_id === me.data?.user_id;
  const id = post.post_id;
  const remove = useMutation({
    mutationFn: () => deletePost(id!),
    onSuccess: async () => {
      setConfirm(false);
      if (detail) navigate("/my-posts", { replace: true });
      await refreshPosts(client);
    },
  });
  const PrivacyIcon =
    post.visibility === "ONLY_ME"
      ? LockKeyhole
      : post.visibility === "FRIENDS"
        ? Users
        : Globe2;
  return (
    <article
      className="surface post-card"
      aria-label={`Bài viết của ${post.author?.full_name || "thành viên"}`}
    >
      <div className="post-card-header">
        <Link
          to={
            validId(post.author?.user_id)
              ? `/users/${post.author.user_id}`
              : "/me"
          }
          className="author-link"
        >
          <Avatar name={post.author?.full_name} url={post.author?.avatar_url} />
          <span>
            <strong>{post.author?.full_name || "Thành viên"}</strong>
            <span className="post-meta">
              <time dateTime={post.created_at}>
                {formatTime(post.created_at)}
              </time>
              <span>·</span>
              <PrivacyIcon size={12} />
              {post.visibility
                ? visibilityLabels[post.visibility]
                : "Chưa rõ quyền hiển thị"}
            </span>
          </span>
        </Link>
        {owner && validId(id) && (
          <div className="post-owner-actions">
            <Link
              className="icon-button"
              to={`/posts/${id}/edit`}
              aria-label="Sửa bài viết"
            >
              <Pencil size={17} />
            </Link>
            <button
              className="icon-button"
              onClick={() => {
                remove.reset();
                setConfirm(true);
              }}
              aria-label="Xóa bài viết"
            >
              <Trash2 size={17} />
            </button>
          </div>
        )}
      </div>
      {post.subject_name && (
        <span className="subject-pill">{post.subject_name}</span>
      )}
      <p className="post-content">{post.content}</p>
      {!!post.media_urls?.length && (
        <div className="post-media">
          {post.media_urls.map((media, index) => {
            const url = imageUrl(media.url);
            if (!url)
              return (
                <p key={index} className="muted">
                  Tệp đính kèm không có đường dẫn hợp lệ.
                </p>
              );
            if (media.type === "IMAGE")
              return (
                <a
                  key={media.key || index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Mở ảnh ${index + 1}`}
                >
                  <img
                    src={url}
                    alt={media.name || `Ảnh đính kèm ${index + 1}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </a>
              );
            if (media.type === "VIDEO")
              return (
                <video
                  key={media.key || index}
                  src={url}
                  controls
                  preload="metadata"
                  aria-label={media.name || "Video đính kèm"}
                />
              );
            return (
              <a
                className="document-link"
                href={url}
                key={media.key || index}
                target="_blank"
                rel="noopener noreferrer"
              >
                {media.name || "Mở tệp đính kèm"}
              </a>
            );
          })}
        </div>
      )}
      {post.lecturer_note && (
        <aside className="lecturer-note">
          <strong>Ghi chú của giảng viên</strong>
          <p>{post.lecturer_note}</p>
        </aside>
      )}
      {validId(id) && (
        <>
          <ReactionPicker
            postId={id}
            count={post.react_count}
            reacted={post.reacted_by_me}
          />
          <Link className="comment-link" to={`/posts/${id}`}>
            <MessageCircle size={17} />
            {post.comment_count ?? "—"} bình luận{" "}
            <span>{detail ? "Thảo luận bên dưới" : "Xem bài viết"}</span>
          </Link>
          {!owner && <ReportButton targetType="POST" targetId={id} />}
        </>
      )}
      {confirm && (
        <ConfirmDialog
          title="Xóa bài viết?"
          description="Bài viết và các tệp đính kèm liên quan sẽ bị xóa. Bạn có chắc muốn tiếp tục?"
          confirmLabel="Xóa bài viết"
          pending={remove.isPending}
          error={remove.isError ? errorMessage(remove.error) : undefined}
          onConfirm={() => remove.mutate()}
          onClose={() => setConfirm(false)}
        />
      )}
    </article>
  );
}
