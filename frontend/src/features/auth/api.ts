import { api, type ApiEnvelope, ApiError, unwrap } from "../../lib/api";
import type { AuthResponse, LoginRequest } from "./types";
import axios from "axios";

export async function login(payload: LoginRequest) {
  try {
    return unwrap(
      await api.post<ApiEnvelope<AuthResponse>>("/auth/login", payload),
    );
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      throw new ApiError(
        "Email hoặc mật khẩu không chính xác. Vui lòng thử lại.",
      );
    }
    throw error;
  }
}

export async function logout() {
  unwrap(await api.post<ApiEnvelope<unknown>>("/auth/logout"));
}
