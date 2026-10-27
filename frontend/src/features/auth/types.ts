// DTO fields follow Swagger; the deployed backend can return refresh_token: null.
export type Role = "STUDENT" | "LECTURER" | "ADMIN";

export interface LoginRequest {
  email: string;
  password: string;
  device_id: string;
  platform: "WEB";
}

export interface AuthResponse {
  user_id?: number;
  username?: string;
  role?: Role;
  access_token?: string;
  refresh_token?: string | null;
  avatar_url?: string;
  cover_url?: string;
  frame_url?: string;
  verified?: boolean;
  profile_completed?: boolean;
}

export interface RefreshTokenResponse {
  access_token?: string;
  refresh_token?: string | null;
}

export interface Tokens {
  access_token: string;
  refresh_token: string | null;
}
