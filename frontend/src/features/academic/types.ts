// Contract DTOs from docs/source/openapi.json. UI-only state is kept separately.
import type { CursorPaginationDto, AuthorDto } from "../social/types";

export interface SubjectResponse {
  subject_id?: number;
  code?: string;
  name?: string;
}

export interface CourseClassOptionResponse {
  course_class_id?: number;
  class_code?: string;
  subject_id?: number;
  subject_code?: string;
  subject_name?: string;
  semester_id?: number;
  semester_name?: string;
  active_semester?: boolean;
  can_propose?: boolean;
}

export interface QuestionOption {
  key?: string;
  text?: string;
  is_correct?: boolean;
  media_url?: string;
  media_id?: number;
}

export interface QuestionProposeDto {
  content: string;
  media_urls?: Array<string>;
  options: Array<QuestionOption>;
  explanation?: string;
  llm_generated: boolean;
  confidence?: number;
}

export interface ProposeSessionRequest {
  title: string;
  content?: string;
  source_url?: string;
  course_class_id: number;
  questions: Array<QuestionProposeDto>;
}

export interface QuestionUpdateDto {
  question_id?: number;
  content?: string;
  media_urls?: Array<string>;
  options?: Array<QuestionOption>;
  explanation?: string;
  source?: "LLM" | "HOMO_SAPIENS";
  confidence?: number;
}

export interface UpdateSubmissionSessionRequest {
  title?: string;
  content?: string;
  source_url?: string;
  course_class_id?: number;
  questions?: Array<QuestionUpdateDto>;
}

export interface ProposeSessionResponse {
  session_id?: number;
  session_code?: string;
  subject_id?: number;
  course_class_id?: number;
  semester_name?: string;
  question_count?: number;
  status?: "PENDING" | "REVIEWING" | "RESOLVED";
  created_at?: string;
}

export interface SubmissionSessionSummaryDto {
  session_id?: number;
  session_code?: string;
  title?: string;
  content?: string;
  subject_id?: number;
  subject_name?: string;
  subject_code?: string;
  course_class_id?: number;
  class_code?: string;
  semester_id?: number;
  semester_name?: string;
  status?: "PENDING" | "REVIEWING" | "RESOLVED";
  question_counts?: number;
  created_at?: string;
  react_count?: number;
  comment_count?: number;
}

export interface SubmissionsResponse {
  contents?: Array<SubmissionSessionSummaryDto>;
  pagination?: CursorPaginationDto;
}

export interface MySubmissionQuestionDto {
  question_id?: number;
  content?: string;
  image_urls?: Array<string>;
  options?: Array<QuestionOption>;
  explanation?: string;
  source?: "LLM" | "HOMO_SAPIENS";
  confidence_score?: number;
  comment_count?: number;
  react_count?: number;
  rating_count?: number;
}

export interface MySubmissionDetailResponse {
  session_id?: number;
  session_code?: string;
  title?: string;
  content?: string;
  subject_id?: number;
  subject_name?: string;
  subject_code?: string;
  course_class_id?: number;
  class_code?: string;
  semester_id?: number;
  semester_name?: string;
  status?: "PENDING" | "REVIEWING" | "RESOLVED";
  comment_count?: number;
  react_count?: number;
  reviewed_by_lecturer?: string;
  reviewed_at?: string;
  created_at?: string;
  questions?: Array<MySubmissionQuestionDto>;
}

export interface MyInteractionDto {
  answered?: boolean;
  rated?: boolean;
}

export interface HiddenFieldsDto {
  correct_answer?: string;
  explanation?: string;
}

export interface PracticeQuestionDto {
  question_id?: number;
  question_code?: string;
  content?: string;
  image_urls?: Array<string>;
  options?: Array<QuestionOption>;
  source?: "LLM" | "HOMO_SAPIENS";
  created_at?: string;
  updated_at?: string;
  my_interaction?: MyInteractionDto;
  hidden_fields?: HiddenFieldsDto;
  react_count?: number;
  comment_count?: number;
  rating_count?: number;
}

export interface SessionQuestionsResponse {
  session_id?: number;
  session_code?: string;
  title?: string;
  content?: string;
  subject_id?: number;
  subject_name?: string;
  subject_code?: string;
  created_at?: string;
  total_questions?: number;
  questions?: Array<PracticeQuestionDto>;
}

export interface AnswerQuestionRequest {
  selected_options: Array<string>;
  question_updated_at?: string;
}

export interface AnswerQuestionResponse {
  is_correct?: boolean;
  correct_answer?: string;
  explanation?: string;
}

export interface RateQuestionRequest {
  rating: number;
  is_error?: boolean;
  comment?: string;
}

export interface RateQuestionResponse {
  new_avg_rating?: number;
  new_rating_count?: number;
}

export interface RatingSummaryDto {
  avg_rating?: number;
  total_ratings?: number;
  distribution?: Record<string, number>;
}

export interface QuestionStatisticsResponse {
  total_answer?: number;
  correct_rate?: number;
  option_distribution?: Record<string, number>;
  rating_summary?: RatingSummaryDto;
}

export interface RatingItemDto {
  user_id?: number;
  rating?: number;
  is_error?: boolean;
  comment?: string;
  created_at?: string;
}

export interface QuestionRatingsResponse {
  items?: Array<RatingItemDto>;
  pagination?: CursorPaginationDto;
}

export interface PendingSessionItemDto {
  session_id?: number;
  topic?: string;
  title?: string;
  content?: string;
  author?: AuthorDto;
  status?: string;
  created_at?: string;
}

export interface PendingSessionsResponse {
  items?: Array<PendingSessionItemDto>;
  pagination?: CursorPaginationDto;
}

export interface QuestionEditLogDto {
  edit_log_id?: number;
  actor_type?: string;
  actor_name?: string;
  status?: string;
  before_state?: Record<string, unknown>;
  after_state?: Record<string, unknown>;
  hallucination_audit?: Record<string, unknown>;
  created_at?: string;
}

export interface SessionQuestionReviewDto {
  topic_id?: number | null;
  topic_name?: string;
  duplicate_check_status?: string;
  can_retry_duplicate_check?: boolean;
  question_id?: number;
  content?: string;
  image_urls?: Array<string>;
  options?: Array<QuestionOption>;
  correct_answer?: string;
  explanation?: string;
  status?: string;
  edit_log?: QuestionEditLogDto;
}

export interface DuplicateWarning {
  question_index?: number;
  similar_question_id?: number;
  similarity_score?: number;
  tier?:
    | "RULE_BASED"
    | "TRIGRAM"
    | "P_HASH"
    | "TEXT_EMBEDDING"
    | "IMAGE_EMBEDDING";
  matched_snipet?: string;
  matched_snippet?: string;
  media_url?: string;
}

export interface SessionDetailReviewResponse {
  session_status?: "PENDING" | "REVIEWING" | "RESOLVED";
  subject_id?: number;
  quality_warning?: string;
  items?: Array<SessionQuestionReviewDto>;
  duplicate_warnings?: Array<DuplicateWarning>;
}

export interface ApproveQuestionsRequest {
  question_ids: Array<number>;
}

export interface ApproveQuestionsResponse {
  points_earned?: number;
}

export interface RejectQuestionsRequest {
  question_ids: Array<number>;
  reason?: string;
}

export interface EditQuestionRequest {
  topic_id?: number;
  clear_topic?: boolean;
  content?: string;
  options?: Array<QuestionOption>;
  explanation?: string;
  auto_approve?: boolean;
}

export interface EditQuestionResponse {
  question_id?: number;
  status?: string;
  reviewed_by?: number;
  reviewed_at?: string;
}

export interface DifficultyDistribution {
  easy?: number;
  medium?: number;
  hard?: number;
  unclassified?: number;
}

export interface GenerateExamRequest {
  subject_id: number;
  title?: string;
  question_count?: number;
  difficulty_distribution?: DifficultyDistribution;
  topic_weights?: Record<string, number>;
  shuffle_options?: boolean;
  include_answer_key?: boolean;
  class_ids: Array<number>;
}

export interface OptionDto {
  key?: string;
  text?: string;
  media_url?: string;
  is_correct?: boolean;
}

export interface ExamQuestionDto {
  order?: number;
  question_id?: number;
  content?: string;
  image_urls?: Array<string>;
  options?: Array<OptionDto>;
  difficulty?: "UNCLASSIFIED" | "EASY" | "MEDIUM" | "HARD";
  topic?: string;
}

export interface Statistic {
  easy_count?: number;
  medium_count?: number;
  hard_count?: number;
  unclassified_count?: number;
}

export interface ExamDetailResponse {
  exam_id?: number;
  title?: string;
  subject_name?: string;
  question_count?: number;
  questions?: Array<ExamQuestionDto>;
  statistic?: Statistic;
  created_at?: string;
}

export interface ExamItem {
  exam_id?: number;
  title?: string;
  subject_name?: string;
  question_count?: number;
  created_at?: string;
  statistic?: Statistic;
  download_url?: string;
}

export interface ExamListResponse {
  items?: Array<ExamItem>;
  pagination?: CursorPaginationDto;
}

export interface ExportResponse {
  download_url?: string;
  file_size_mb?: number;
  questions_count?: number;
  expires_at?: string;
}

export interface CourseClassResponse {
  course_class_id?: number;
  class_code?: string;
  subject_id?: number;
  subject_code?: string;
  subject_name?: string;
  semester_id?: number;
  semester_name?: string;
  lecturer_id?: number;
  lecturer_name?: string;
  total_students?: number;
  created_at?: string;
}
