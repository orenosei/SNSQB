import { useId, useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Send, X } from "lucide-react";
import { Link } from "react-router";
import { Avatar, imageUrl } from "../../components/Avatar";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ErrorNotice, Loading } from "../../components/Feedback";
import { LoadMore, QueryError } from "../../components/SocialFeedback";
import { ApiError, errorMessage } from "../../lib/api";
import { formatTime, validId } from "../../lib/cursor";
import { useProfile } from "../profile/api";
import { uploadMedia } from "../media/api";
import type { CommentResponseDto } from "../social/types";
import { addComment, editComment, deleteComment, useComments } from "./api";

function CommentEditor({
  postId,
  parentId,
  initial,
  onDone,
  onCancel,
}: {
  postId: number;
  parentId?: number;
  initial?: CommentResponseDto;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const [content, setContent] = useState(initial?.content || "");
  const [media, setMedia] = useState(initial?.media_url || "");
  const [validation, setValidation] = useState("");
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const client = useQueryClient();
  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!file.type.startsWith("image/"))
        throw new ApiError("Bình luận chỉ hỗ trợ ảnh đính kèm.");
      const uploaded = await uploadMedia(file, "COMMENT");
      if (uploaded.type !== "IMAGE")
        throw new ApiError("Tệp tải lên không được máy chủ nhận dạng là ảnh.");
      setMedia(uploaded.url || "");
    },
  });
  const mutation = useMutation({
    mutationFn: () =>
      validId(initial?.comment_id)
        ? editComment(initial.comment_id, { content, media_url: media })
        : addComment({
            target_type: "POST",
            target_id: postId,
            parent_comment_id: parentId,
            content,
            ...(media ? { media_url: media } : {}),
          }),
    onSuccess: async () => {
      setContent("");
      setMedia("");
      await Promise.all([
        client.invalidateQueries({ queryKey: ["comments", postId] }),
        client.invalidateQueries({ queryKey: ["posts"] }),
      ]);
      onDone?.();
    },
  });
  const pending = upload.isPending || mutation.isPending;
  function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setValidation("");
    if (!content.trim() && !media) {
      setValidation("Bình luận cần có nội dung hoặc ảnh đính kèm.");
      return;
    }
    mutation.mutate();
  }
  return (
    <form
      className="comment-editor"
      onSubmit={submit}
      aria-label={
        initial
          ? "Sửa bình luận"
          : parentId
            ? "Viết phản hồi"
            : "Viết bình luận"
      }
    >
      <label className="sr-only" htmlFor={id}>
        {initial
          ? "Nội dung bình luận đã sửa"
          : parentId
            ? "Nội dung phản hồi"
            : "Nội dung bình luận"}
      </label>
      <textarea
        id={id}
        rows={2}
        placeholder={
          parentId ? "Viết phản hồi của bạn…" : "Cùng trao đổi, cùng hiểu bài…"
        }
        value={content}
        disabled={pending}
        onChange={(event) => setContent(event.target.value)}
      />
      {media && (
        <div className="comment-attachment">
          {imageUrl(media) && <img src={imageUrl(media)} alt="Ảnh bình luận" />}
          <button
            type="button"
            className="icon-button"
            aria-label="Gỡ ảnh bình luận"
            disabled={pending}
            onClick={() => setMedia("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      <div className="comment-editor-actions">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Chọn ảnh bình luận"
          disabled={pending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) upload.mutate(file);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          className="icon-button"
          disabled={pending}
          aria-label="Đính kèm ảnh bình luận"
          onClick={() => fileInput.current?.click()}
        >
          <ImagePlus size={18} />
        </button>
        <div className="inline-actions">
          {onCancel && (
            <button
              className="button button-secondary"
              type="button"
              disabled={pending}
              onClick={onCancel}
            >
              Hủy
            </button>
          )}
          <button
            type="submit"
            className="button button-primary"
            disabled={pending}
          >
            <Send size={15} />
            {pending
              ? "Đang xử lý…"
              : initial
                ? "Lưu bình luận"
                : parentId
                  ? "Gửi phản hồi"
                  : "Gửi bình luận"}
          </button>
        </div>
      </div>
      {(validation || mutation.isError || upload.isError) && (
        <ErrorNotice
          message={validation || errorMessage(mutation.error || upload.error)}
        />
      )}
    </form>
  );
}

function CommentThread({
  comment,
  postId,
  depth = 0,
}: {
  comment: CommentResponseDto;
  postId: number;
  depth?: number;
}) {
  const me = useProfile();
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const replies = useComments(
    postId,
    comment.comment_id,
    "oldest",
    showReplies && validId(comment.comment_id),
  );
  const owner =
    validId(comment.author?.user_id) &&
    comment.author.user_id === me.data?.user_id;
  const remove = useMutation({
    mutationFn: () => deleteComment(comment.comment_id!),
    onSuccess: async () => {
      setConfirm(false);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["comments", postId] }),
        client.invalidateQueries({ queryKey: ["posts"] }),
      ]);
    },
  });
  return (
    <div className={`comment-thread ${depth > 0 ? "comment-reply" : ""}`}>
      <div className="comment-row">
        <Avatar
          name={comment.author?.full_name}
          url={comment.author?.avatar_url}
        />
        <div className="comment-body">
          <div className="comment-bubble">
            <Link
              to={
                validId(comment.author?.user_id)
                  ? `/users/${comment.author.user_id}`
                  : "#"
              }
              className="comment-author"
            >
              {comment.author?.full_name || "Thành viên"}
            </Link>
            <p>
              {comment.deleted ? "Bình luận đã được xóa." : comment.content}
            </p>
            {!comment.deleted && imageUrl(comment.media_url) && (
              <a
                href={imageUrl(comment.media_url)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  className="comment-image"
                  src={imageUrl(comment.media_url)}
                  alt="Ảnh đính kèm bình luận"
                  loading="lazy"
                />
              </a>
            )}
          </div>
          <div className="comment-tools">
            <time dateTime={comment.created_at}>
              {formatTime(comment.created_at)}
            </time>
            {!comment.deleted && validId(comment.comment_id) && (
              <>
                <button onClick={() => setReplying(!replying)}>Trả lời</button>
                {owner && (
                  <>
                    <button onClick={() => setEditing(!editing)}>
                      Sửa bình luận
                    </button>
                    <button
                      onClick={() => {
                        remove.reset();
                        setConfirm(true);
                      }}
                    >
                      Xóa bình luận
                    </button>
                  </>
                )}
              </>
            )}
          </div>
          {editing && (
            <CommentEditor
              postId={postId}
              initial={comment}
              onDone={() => setEditing(false)}
              onCancel={() => setEditing(false)}
            />
          )}
          {replying && (
            <CommentEditor
              postId={postId}
              parentId={comment.comment_id}
              onDone={() => {
                setReplying(false);
                setShowReplies(true);
              }}
              onCancel={() => setReplying(false)}
            />
          )}
          {validId(comment.comment_id) && (
            <button
              className="text-button reply-toggle"
              onClick={() => setShowReplies(!showReplies)}
            >
              {showReplies
                ? "Ẩn phản hồi"
                : `Xem phản hồi${comment.reply_count !== undefined ? ` (${comment.reply_count})` : ""}`}
            </button>
          )}
          {showReplies && (
            <div className="reply-list">
              {replies.isPending ? (
                <Loading label="Đang tải phản hồi…" />
              ) : (
                <>
                  {replies.data?.pages
                    .flatMap((page) => page.items || [])
                    .filter((item) => item.comment_id !== comment.comment_id)
                    .map((reply, index) => (
                      <CommentThread
                        key={reply.comment_id || index}
                        comment={reply}
                        postId={postId}
                        depth={depth + 1}
                      />
                    ))}
                  {replies.isError && (
                    <QueryError
                      error={replies.error}
                      retry={() => void replies.refetch()}
                    />
                  )}
                  <LoadMore
                    hasNext={!!replies.hasNextPage}
                    pending={replies.isFetchingNextPage}
                    load={() => void replies.fetchNextPage()}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {confirm && (
        <ConfirmDialog
          title="Xóa bình luận?"
          description="Bình luận sẽ bị xóa. Các phản hồi được hiển thị theo kết quả từ máy chủ."
          confirmLabel="Xóa bình luận"
          pending={remove.isPending}
          error={remove.isError ? errorMessage(remove.error) : undefined}
          onClose={() => setConfirm(false)}
          onConfirm={() => remove.mutate()}
        />
      )}
    </div>
  );
}

export function CommentSection({ postId }: { postId: number }) {
  const [sort, setSort] = useState("newest");
  const query = useComments(postId, undefined, sort);
  return (
    <section className="surface comments-section" aria-label="Bình luận">
      <div className="section-title">
        <h2>Cùng thảo luận</h2>
        <label className="comment-sort">
          <span className="sr-only">Sắp xếp bình luận</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
          </select>
        </label>
      </div>
      <CommentEditor postId={postId} />
      {query.isPending ? (
        <Loading label="Đang tải bình luận…" />
      ) : (
        <>
          {!query.isError &&
            !query.data?.pages.some((page) => page.items?.length) && (
              <p className="empty-comments">
                Chưa có bình luận. Hãy bắt đầu cuộc thảo luận!
              </p>
            )}
          {query.data?.pages
            .flatMap((page) => page.items || [])
            .map((comment, index) => (
              <CommentThread
                key={comment.comment_id || index}
                comment={comment}
                postId={postId}
              />
            ))}
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
