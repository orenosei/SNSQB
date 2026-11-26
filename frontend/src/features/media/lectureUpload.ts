import { api, ApiError, type ApiEnvelope, unwrap } from "../../lib/api";
import type { MediaItem } from "../social/types";

type UploadStatus = {
  part_size?: number;
  uploaded_parts?: number[];
  media?: MediaItem;
};

function uploadPath(id: string) {
  return `/lecturer/medias/lecture-uploads/${id}`;
}

export async function uploadLecture(
  id: string,
  file: File,
  signal: AbortSignal,
  onProgress: (ratio: number) => void,
) {
  if (
    !["video/mp4", "video/webm"].includes(file.type) ||
    !file.size ||
    file.size > 2 * 1024 ** 3 ||
    file.name.length > 255
  ) {
    throw new ApiError(
      "Chọn video MP4 hoặc WebM tối đa 2 GiB, tên tệp tối đa 255 ký tự.",
    );
  }
  const path = uploadPath(id);
  const status = unwrap(
    await api.put<ApiEnvelope<UploadStatus>>(
      path,
      {
        file_name: file.name,
        content_type: file.type,
        file_size: file.size,
      },
      { signal },
    ),
  );
  if (status.media?.url && status.media.type === "VIDEO") return status.media;
  const partSize = status.part_size;
  if (partSize == null || !Number.isSafeInteger(partSize) || partSize <= 0) {
    throw new ApiError("Máy chủ chưa trả về kích thước phần tải hợp lệ.");
  }
  const uploaded = new Set(status.uploaded_parts);
  const partCount = Math.ceil(file.size / partSize);
  for (let part = 1; part <= partCount; part++) {
    if (!uploaded.has(part)) {
      const { upload_url } = unwrap(
        await api.post<ApiEnvelope<{ upload_url?: string }>>(
          `${path}/parts/${part}`,
          undefined,
          { signal },
        ),
      );
      if (!upload_url || new URL(upload_url).protocol !== "https:")
        throw new ApiError("Máy chủ chưa cấp URL tải video hợp lệ.");
      const response = await fetch(upload_url, {
        method: "PUT",
        body: file.slice((part - 1) * partSize, part * partSize),
        signal,
        credentials: "omit",
        redirect: "error",
      });
      if (!response.ok)
        throw new ApiError(
          `Chưa tải được phần ${part}. Chọn thử lại để tiếp tục.`,
        );
    }
    onProgress(part / partCount);
  }
  const media = unwrap(
    await api.post<ApiEnvelope<MediaItem>>(`${path}/complete`, undefined, {
      signal,
    }),
  );
  if (!media?.url || media.type !== "VIDEO")
    throw new ApiError("Máy chủ chưa xác minh được video.");
  return media;
}

export async function cancelLectureUpload(id: string) {
  await api.delete(uploadPath(id));
}
