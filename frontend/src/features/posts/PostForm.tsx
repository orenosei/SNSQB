import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, LoaderCircle, Send, X } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { ErrorNotice } from "../../components/Feedback";
import { errorMessage } from "../../lib/api";
import { validId } from "../../lib/cursor";
import { useProfile } from "../profile/api";
import { uploadLecture, cancelLectureUpload } from "../media/lectureUpload";
import { uploadMedia } from "../media/api";
import type {
  MediaItem,
  PostResponseDto,
  CreatePostRequest,
} from "../social/types";
import { createPost, editPost, refreshPosts } from "./api";
import { useSubjects } from "../academic/api";
import { imageUrl } from "../../components/Avatar";
import { QueryError } from "../../components/SocialFeedback";

export const visibilityLabels = {
  PUBLIC: "Công khai",
  FRIENDS: "Bạn bè",
  ONLY_ME: "Chỉ mình tôi",
};

export function PostForm({
  initial,
  onSaved,
  onCancel,
  defaultType = "SOCIAL_POST",
}: {
  initial?: PostResponseDto;
  onSaved?: (id?: number) => void;
  onCancel?: () => void;
  defaultType?: "SOCIAL_POST" | "LEARNING_VIDEO";
}) {
  const profile = useProfile();
  const lecturer = profile.data?.role === "LECTURER";
  const [postType, setPostType] = useState<"SOCIAL_POST" | "LEARNING_VIDEO">(
    defaultType,
  );
  const [subject, setSubject] = useState("");
  const isVideo = !initial && lecturer && postType === "LEARNING_VIDEO";
  const subjects = useSubjects(isVideo);
  const client = useQueryClient();
  const [content, setContent] = useState(initial?.content || "");
  const [visibility, setVisibility] = useState<
    NonNullable<CreatePostRequest["visibility"]>
  >(initial?.visibility || "PUBLIC");
  const [media, setMedia] = useState<MediaItem[]>(initial?.media_urls || []);
  const [validation, setValidation] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const [lecture, setLecture] = useState<{ id: string; file: File }>();
  const [progress, setProgress] = useState(0);
  const controller = useRef<AbortController>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const cancelUpload = useMutation({
    mutationFn: cancelLectureUpload,
    onSuccess: () => {
      setLecture(undefined);
      setProgress(0);
    },
  });
  const publishVideo = useMutation({
    mutationFn: async (session: { id: string; file: File }) => {
      const abort = new AbortController();
      controller.current = abort;
      try {
        return await uploadLecture(
          session.id,
          session.file,
          abort.signal,
          setProgress,
        );
      } finally {
        if (controller.current === abort) controller.current = null;
      }
    },
    onSuccess: (uploaded) => {
      setMedia((items) => [
        ...items.filter((item) => item.type !== "VIDEO"),
        uploaded,
      ]);
      setLecture(undefined);
    },
  });
  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        const uploaded = await uploadMedia(file, "POST");
        setMedia((items) => [...items, uploaded]);
      }
    },
  });
  const save = useMutation({
    mutationFn: () =>
      initial && validId(initial.post_id)
        ? editPost(initial.post_id, { content, visibility, media_urls: media })
        : createPost({
            content,
            visibility,
            media_urls: media,
            post_type: isVideo ? "LEARNING_VIDEO" : "SOCIAL_POST",
            ...(isVideo ? { subject_id: Number(subject) } : {}),
          }),
    onSuccess: async (post) => {
      if (!initial) {
        setContent("");
        setMedia([]);
      }
      await refreshPosts(client);
      onSaved?.(post?.post_id ?? initial?.post_id);
    },
  });
  const pending =
    upload.isPending ||
    save.isPending ||
    publishVideo.isPending ||
    cancelUpload.isPending;
  function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setValidation("");
    if (
      isVideo &&
      (!subjects.data?.some((item) => item.subject_id === Number(subject)) ||
        !media.some((item) => item.type === "VIDEO") ||
        !content.trim())
    ) {
      setValidation(
        "Video bài giảng cần môn học, nội dung giới thiệu và ít nhất một tệp video.",
      );
      return;
    }
    if (!content.trim() && !media.length) {
      setValidation("Hãy viết nội dung hoặc đính kèm một tệp trước khi đăng.");
      return;
    }
    save.mutate();
  }
  return (
    <form
      className="surface post-composer"
      onSubmit={submit}
      aria-label={initial ? "Chỉnh sửa bài viết" : "Tạo bài viết"}
    >
      <div className="composer-header">
        <Avatar name={profile.data?.full_name} url={profile.data?.avatar_url} />
        <div>
          <strong>{profile.data?.full_name || "Bạn"}</strong>
          <label className="visibility-select">
            <span className="sr-only">Quyền riêng tư</span>
            <select
              value={visibility}
              disabled={pending}
              onChange={(event) =>
                setVisibility(event.target.value as typeof visibility)
              }
            >
              {Object.entries(visibilityLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {!initial && lecturer && (
        <div className="publishing-options">
          <label className="field">
            Loại nội dung
            <select
              aria-label="Loại nội dung"
              value={postType}
              disabled={pending}
              onChange={(event) =>
                setPostType(event.target.value as typeof postType)
              }
            >
              <option value="SOCIAL_POST">Bài viết thảo luận</option>
              <option value="LEARNING_VIDEO">Video bài giảng</option>
            </select>
          </label>
          {isVideo && (
            <label className="field">
              Môn học của video
              <select
                aria-label="Môn học của video"
                value={subject}
                disabled={pending || subjects.isPending || subjects.isError}
                required
                onChange={(event) => setSubject(event.target.value)}
              >
                <option value="">Chọn môn học</option>
                {subjects.data?.map((item) => (
                  <option key={item.subject_id} value={item.subject_id}>
                    {item.code} · {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
      {isVideo && subjects.isError && (
        <QueryError
          error={subjects.error}
          retry={() => void subjects.refetch()}
        />
      )}
      <label className="sr-only" htmlFor="post-content">
        Nội dung bài viết
      </label>
      <textarea
        id="post-content"
        rows={4}
        placeholder="Bạn đang khám phá điều gì? Chia sẻ cùng mọi người nhé…"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        disabled={pending}
      />
      {media.length > 0 && (
        <ul className="attachment-list">
          {media.map((item, index) => (
            <li key={`${item.key || item.url}-${index}`}>
              {item.type === "IMAGE" && imageUrl(item.url) && (
                <img
                  className="attachment-preview"
                  src={imageUrl(item.url)}
                  alt={`Xem trước ${item.name || "ảnh đính kèm"}`}
                />
              )}
              <span>{item.name || `Tệp đính kèm ${index + 1}`}</span>
              <span className="muted">{item.type}</span>
              <button
                type="button"
                className="icon-button"
                disabled={pending}
                aria-label={`Gỡ tệp ${item.name || index + 1}`}
                onClick={() =>
                  setMedia((items) =>
                    items.filter((_, position) => position !== index),
                  )
                }
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {validation && <ErrorNotice message={validation} />}
      {lecture && (
        <div className="invite-actions">
          <progress aria-label="Tiến độ tải video" value={progress} max={1} />
          {!publishVideo.isPending && !cancelUpload.isPending && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => publishVideo.mutate(lecture)}
            >
              Thử tải tiếp
            </button>
          )}
          <button
            type="button"
            className="button button-secondary"
            disabled={cancelUpload.isPending}
            onClick={() => {
              controller.current?.abort();
              cancelUpload.mutate(lecture.id);
            }}
          >
            Hủy tải video
          </button>
        </div>
      )}
      {publishVideo.isError && lecture && !cancelUpload.isPending && (
        <ErrorNotice message={errorMessage(publishVideo.error)} />
      )}
      {cancelUpload.isError && (
        <ErrorNotice message={errorMessage(cancelUpload.error)} />
      )}
      {upload.isError && <ErrorNotice message={errorMessage(upload.error)} />}
      {save.isError && <ErrorNotice message={errorMessage(save.error)} />}
      <div className="composer-actions">
        <input
          ref={fileInput}
          className="sr-only"
          type="file"
          multiple={!isVideo}
          accept={isVideo ? "video/mp4,video/webm" : undefined}
          aria-label="Chọn tệp đính kèm"
          disabled={pending}
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            if (files.length && isVideo) {
              const session = { id: crypto.randomUUID(), file: files[0] };
              setProgress(0);
              setLecture(session);
              publishVideo.mutate(session);
            } else if (files.length) upload.mutate(files);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          className="button attachment-button"
          disabled={pending || !!lecture}
          onClick={() => fileInput.current?.click()}
        >
          {upload.isPending ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <ImagePlus size={19} />
          )}
          {upload.isPending ? "Đang tải tệp…" : "Ảnh / Video / Tệp"}
        </button>
        <div className="inline-actions">
          {onCancel && (
            <button
              type="button"
              className="button button-secondary"
              disabled={pending}
              onClick={onCancel}
            >
              Hủy
            </button>
          )}
          <button
            className="button button-primary"
            type="submit"
            disabled={
              pending || (isVideo && (subjects.isPending || subjects.isError))
            }
          >
            <Send size={16} />
            {save.isPending
              ? "Đang lưu…"
              : initial
                ? "Lưu bài viết"
                : "Đăng bài"}
          </button>
        </div>
      </div>
    </form>
  );
}
