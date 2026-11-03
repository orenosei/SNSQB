import { useMutation } from "@tanstack/react-query";
import { imageUrl } from "../../components/Avatar";
import { ErrorNotice } from "../../components/Feedback";
import { ApiError, errorMessage } from "../../lib/api";
import { uploadMedia } from "../media/api";

export function ProfileImageField({
  field,
  value,
  disabled,
  onChange,
  onUploading,
}: {
  field: "avatar_url" | "cover_url";
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onUploading: (pending: boolean) => void;
}) {
  const name = field === "avatar_url" ? "ảnh đại diện" : "ảnh bìa";
  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!file.type.startsWith("image/"))
        throw new ApiError("Vui lòng chọn tệp hình ảnh.");
      const media = await uploadMedia(
        file,
        field === "avatar_url" ? "AVATAR" : "COVER",
      );
      if (media.type !== "IMAGE" || !imageUrl(media.url))
        throw new ApiError("Máy chủ chưa trả về ảnh hợp lệ.");
      return media.url!;
    },
    onMutate: () => onUploading(true),
    onSettled: () => onUploading(false),
    onSuccess: onChange,
  });
  return (
    <div className="profile-image-editor">
      <div>
        {imageUrl(value) ? (
          <img
            className="profile-image-preview"
            src={imageUrl(value)}
            alt={`Xem trước ${name}`}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="profile-image-preview empty-image">Chưa có ảnh</div>
        )}
      </div>
      <div className="profile-image-controls">
        <label className="field" htmlFor={field}>
          Đường dẫn {name}
          <input
            id={field}
            type="url"
            pattern="https?://.*"
            placeholder="https://…"
            value={value}
            disabled={disabled || upload.isPending}
            onChange={(event) => {
              upload.reset();
              onChange(event.target.value);
            }}
          />
        </label>
        <label className="field">
          Tải {name}
          <input
            type="file"
            accept="image/*"
            disabled={disabled || upload.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload.mutate(file);
              event.target.value = "";
            }}
          />
        </label>
        {upload.isPending && <p role="status">Đang tải ảnh…</p>}
        {upload.isError && <ErrorNotice message={errorMessage(upload.error)} />}
        <p className="field-hint">
          Ảnh sẽ được áp dụng khi bạn lưu thay đổi hồ sơ.
        </p>
      </div>
    </div>
  );
}
