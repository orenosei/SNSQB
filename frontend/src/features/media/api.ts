import { api, ApiError, type ApiEnvelope, unwrap } from "../../lib/api";
import type { MediaItem, MediaUploadResponse } from "../social/types";

export async function uploadMedia(
  file: File,
  purpose: "POST" | "COMMENT",
): Promise<MediaItem> {
  const form = new FormData();
  form.append("file", file);
  const uploaded = unwrap(
    await api.post<ApiEnvelope<MediaUploadResponse>>("/medias/upload", form, {
      params: { purpose },
      // Axios/browser must generate the multipart boundary; never send application/json here.
      headers: { "Content-Type": undefined },
    }),
  );
  if (!uploaded?.url || !uploaded.media_type)
    throw new ApiError(
      "Máy chủ chưa trả về đường dẫn hoặc loại tệp đã tải lên.",
    );
  return {
    key: uploaded.object_key,
    url: uploaded.url,
    type: uploaded.media_type,
    size: uploaded.file_size,
    width: uploaded.width,
    height: uploaded.height,
    name: file.name,
  };
}
