export type { CourseClassResponse } from "../academic/types";

export interface ClassStudent {
  user_id?: number;
  student_code?: string;
  full_name?: string;
  email?: string;
  class_name?: string;
  school_faculty?: string;
  major?: string;
  date_of_birth?: string;
  enrolled_at?: string;
}
export interface CreateClass {
  class_code: string;
  subject_id: number;
}
export interface EnrollmentResult {
  total_enrolled?: number;
  already_enrolled_count?: number;
  not_found_count?: number;
  not_found_codes?: string[];
}
