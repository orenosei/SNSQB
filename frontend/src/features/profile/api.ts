import { useQuery } from "@tanstack/react-query";
import { api, type ApiEnvelope, ApiError, unwrap } from "../../lib/api";
import type { Profile, UpdateProfileRequest } from "./types";

export const profileKey = ["profile", "me"] as const;
function readProfile(response: { data: ApiEnvelope<Profile> }) {
  const profile = unwrap(response);
  if (!profile || typeof profile !== "object" || Array.isArray(profile))
    throw new ApiError("Không nhận được hồ sơ từ máy chủ.");
  return profile;
}
export const useProfile = () =>
  useQuery({
    queryKey: profileKey,
    queryFn: async ({ signal }) =>
      readProfile(await api.get<ApiEnvelope<Profile>>("/users/me", { signal })),
  });

export async function updateProfile(payload: UpdateProfileRequest) {
  return readProfile(await api.put<ApiEnvelope<Profile>>("/users/me", payload));
}
