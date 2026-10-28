import {
  useInfiniteQuery,
  useQuery,
  type QueryClient,
} from "@tanstack/react-query";
import { api, ApiError, type ApiEnvelope, unwrap } from "../../lib/api";
import { nextCursor, validId } from "../../lib/cursor";
import type { GlobalSearchResponseDto } from "../social/types";
import type {
  SubjectResponse,
  CourseClassOptionResponse,
  ProposeSessionRequest,
  ProposeSessionResponse,
  UpdateSubmissionSessionRequest,
  MySubmissionDetailResponse,
  SubmissionsResponse,
  SessionQuestionsResponse,
  AnswerQuestionRequest,
  AnswerQuestionResponse,
  RateQuestionRequest,
  RateQuestionResponse,
  QuestionStatisticsResponse,
  QuestionRatingsResponse,
  PendingSessionsResponse,
  SessionDetailReviewResponse,
  ApproveQuestionsResponse,
  EditQuestionRequest,
  EditQuestionResponse,
  GenerateExamRequest,
  ExamDetailResponse,
  ExamListResponse,
  ExportResponse,
  CourseClassResponse,
} from "./types";

export const academicKey = ["academic"] as const;
export const getAcademic = async <T>(
  path: string,
  params?: Record<string, unknown>,
  signal?: AbortSignal,
) => unwrap(await api.get<ApiEnvelope<T>>(path, { params, signal }));
const post = async <T>(path: string, body?: unknown) =>
  unwrap(await api.post<ApiEnvelope<T>>(path, body));
export const useSubjects = () =>
  useQuery({
    queryKey: ["academic", "subjects"],
    queryFn: ({ signal }) =>
      getAcademic<SubjectResponse[]>("/subjects", undefined, signal),
  });
export const useEnrolledCourseClasses = () =>
  useQuery({
    queryKey: ["academic", "enrolled-course-classes"],
    queryFn: ({ signal }) =>
      getAcademic<CourseClassOptionResponse[]>(
        "/sessions/my-enrolled-course-classes",
        undefined,
        signal,
      ),
  });
export function useBankSearch(query: string, type: "QUESTION" | "SESSION") {
  return useInfiniteQuery({
    queryKey: ["academic", "search", query, type],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam, signal }) =>
      getAcademic<GlobalSearchResponseDto>(
        "/search",
        { query: query.trim() || undefined, type, after: pageParam, limit: 10 },
        signal,
      ),
    getNextPageParam: (last, _pages, cursor) => nextCursor(last, cursor),
  });
}
export function useSubmissions(subject?: number, status?: string) {
  return useInfiniteQuery({
    queryKey: ["academic", "submissions", subject, status],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam, signal }) =>
      getAcademic<SubmissionsResponse>(
        "/sessions/my-submissions",
        {
          subject_id: subject,
          status: status || undefined,
          after: pageParam,
          limit: 10,
        },
        signal,
      ),
    getNextPageParam: (last, _pages, cursor) => nextCursor(last, cursor),
  });
}
export const useSubmission = (id?: number) =>
  useQuery({
    queryKey: ["academic", "submission", id],
    enabled: validId(id),
    queryFn: ({ signal }) =>
      getAcademic<MySubmissionDetailResponse>(
        `/sessions/my-submissions/${id}`,
        undefined,
        signal,
      ),
  });
export const proposeSession = (body: ProposeSessionRequest) =>
  post<ProposeSessionResponse>("/sessions/propose", body);
export const updateSubmission = async (
  id: number,
  body: UpdateSubmissionSessionRequest,
) =>
  unwrap(
    await api.put<ApiEnvelope<unknown>>(`/sessions/my-submissions/${id}`, body),
  );
export const deleteSubmission = async (id: number) =>
  unwrap(
    await api.delete<ApiEnvelope<unknown>>(`/sessions/my-submissions/${id}`),
  );

export const practiceKey = (id?: number) =>
  ["academic", "practice", id] as const;
export const usePractice = (id?: number) =>
  useQuery({
    queryKey: practiceKey(id),
    enabled: validId(id),
    queryFn: ({ signal }) =>
      getAcademic<SessionQuestionsResponse>(
        `/sessions/${id}/questions`,
        undefined,
        signal,
      ),
  });
export const answerQuestion = (id: number, body: AnswerQuestionRequest) =>
  post<AnswerQuestionResponse>(`/questions/${id}/answer`, body);
export const rateQuestion = (id: number, body: RateQuestionRequest) =>
  post<RateQuestionResponse>(`/questions/${id}/rate`, body);
export const useQuestionStats = (id?: number) =>
  useQuery({
    queryKey: ["academic", "stats", id],
    enabled: validId(id),
    queryFn: ({ signal }) =>
      getAcademic<QuestionStatisticsResponse>(
        `/questions/${id}/statistics`,
        undefined,
        signal,
      ),
  });
export const useRatings = (id?: number) =>
  useInfiniteQuery({
    queryKey: ["academic", "ratings", id],
    enabled: validId(id),
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam, signal }) =>
      getAcademic<QuestionRatingsResponse>(
        `/questions/${id}/ratings`,
        { after: pageParam, limit: 10 },
        signal,
      ),
    getNextPageParam: (last, _pages, cursor) => nextCursor(last, cursor),
  });

export const usePendingReviews = (subject?: number) =>
  useInfiniteQuery({
    queryKey: ["academic", "reviews", subject],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam, signal }) =>
      getAcademic<PendingSessionsResponse>(
        "/sessions/pending",
        {
          subject_id: subject,
          after: pageParam,
          limit: 10,
          sort_by: "created_at",
        },
        signal,
      ),
    getNextPageParam: (last, _pages, cursor) => nextCursor(last, cursor),
  });
// This GET changes state to REVIEWING. Invoke only after an explicit lecturer action,
// with no automatic query retries, prefetch, mount or focus refetch.
export const openReview = (id: number) =>
  getAcademic<SessionDetailReviewResponse>(`/sessions/${id}`);
export const approveQuestions = (ids: number[]) =>
  post<ApproveQuestionsResponse>("/sessions/approve", { question_ids: ids });
export const rejectQuestions = (ids: number[], reason: string) =>
  post<unknown>("/sessions/reject", {
    question_ids: ids,
    ...(reason ? { reason } : {}),
  });
export const completeReview = (id: number) =>
  post<unknown>(`/sessions/${id}/complete-review`);
export const editQuestion = async (id: number, body: EditQuestionRequest) =>
  unwrap(
    await api.put<ApiEnvelope<EditQuestionResponse>>(`/questions/${id}`, body),
  );

export const useMyClasses = () =>
  useQuery({
    queryKey: ["academic", "my-classes"],
    queryFn: ({ signal }) =>
      getAcademic<CourseClassResponse[]>(
        "/lecturer/course-classes/my-classes",
        undefined,
        signal,
      ),
  });
export const useExams = (subject?: number) =>
  useInfiniteQuery({
    queryKey: ["academic", "exams", subject],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam, signal }) =>
      getAcademic<ExamListResponse>(
        "/exams/my-exams",
        { subject_id: subject, after: pageParam, limit: 10 },
        signal,
      ),
    getNextPageParam: (last, _pages, cursor) => nextCursor(last, cursor),
  });
export const useExam = (id?: number) =>
  useQuery({
    queryKey: ["academic", "exam", id],
    enabled: validId(id),
    queryFn: ({ signal }) =>
      getAcademic<ExamDetailResponse>(`/exams/${id}`, undefined, signal),
  });
export const generateExam = (body: GenerateExamRequest) =>
  post<ExamDetailResponse>("/exams/generate", body);
export const exportExam = (
  id: number,
  format: "pdf" | "xlsx",
  include_answer_key: boolean,
) =>
  getAcademic<ExportResponse>(`/exams/${id}/export`, {
    format,
    include_answer_key,
    paper_size: "A4",
  });
export const exportQuestionBank = (
  subject_id: number,
  format: "pdf" | "xlsx",
  include_answer: boolean,
) =>
  getAcademic<ExportResponse>("/lecturer/questions/export", {
    subject_id,
    format,
    include_answer,
  });

export async function refreshAcademic(client: QueryClient) {
  await client.invalidateQueries({ queryKey: academicKey });
  await client.invalidateQueries({ queryKey: ["profile", "me"] });
}
export function requireResult<T>(result: T | undefined): T {
  if (!result)
    throw new ApiError(
      "Máy chủ chưa trả về dữ liệu cần thiết. Vui lòng tải lại.",
    );
  return result;
}
