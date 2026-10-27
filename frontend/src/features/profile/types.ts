import type { Role } from "../auth/types";

export interface Profile {
  user_id?: number;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  cover_url?: string;
  frame_url?: string;
  gender?: "MALE" | "FEMALE";
  date_of_birth?: string;
  bio?: string;
  school_faculty?: string;
  major?: string;
  class_name?: string;
  student_lecturer_code?: string;
  role?: Role;
  timezone?: string;
  profile_completed?: boolean;
  verified?: boolean;
  total_proposed_questions?: number;
  gamification_points?: number;
  badges_count?: number;
  friends_count?: number;
  followers_count?: number;
  following_count?: number;
  created_at?: string;
}

export interface UpdateProfileRequest {
  full_name?: string;
  avatar_url?: string;
  cover_url?: string;
  bio?: string;
  timezone?: string;
  gender?: "MALE" | "FEMALE";
  date_of_birth?: string;
}
