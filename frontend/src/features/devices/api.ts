import { useQuery } from "@tanstack/react-query";
import { api, ApiError, unwrap, type ApiEnvelope } from "../../lib/api";

export interface Device {
  user_device_id?: number;
  device_id?: string;
  device_name?: string;
  platform?: "IOS" | "ANDROID" | "DESKTOP" | "WEB";
  os_version?: string;
  app_version?: string;
  last_active_at?: string;
  is_active?: boolean;
  is_current_device?: boolean;
}
export const useDevices = () =>
  useQuery({
    queryKey: ["devices"],
    queryFn: async ({ signal }) =>
      unwrap(
        await api.get<ApiEnvelope<{ devices?: Device[] }>>("/devices", {
          signal,
        }),
      ),
  });
export async function changeDevice(id: string, action: "revoke" | "delete") {
  if (!id || id === "." || id === ".." || /[\\/\u0000-\u001f]/.test(id))
    throw new ApiError("Mã thiết bị không hợp lệ.");
  const path = `/devices/${encodeURIComponent(id)}`;
  return unwrap(
    action === "revoke"
      ? await api.post<ApiEnvelope<unknown>>(`${path}/logout`)
      : await api.delete<ApiEnvelope<unknown>>(path),
  );
}
