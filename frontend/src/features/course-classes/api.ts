import { useQuery, type QueryClient } from "@tanstack/react-query";
import { api, unwrap, type ApiEnvelope } from "../../lib/api";
import { validId } from "../../lib/cursor";
import type {
  CourseClassResponse,
  ClassStudent,
  CreateClass,
  EnrollmentResult,
} from "./types";

export const classKeys = {
  all: ["course-classes"] as const,
  detail: (id: number) => ["course-classes", "detail", id] as const,
  roster: (id: number) => ["course-classes", "students", id] as const,
};
export const useAssignedClasses = () =>
  useQuery({
    queryKey: [...classKeys.all, "mine"],
    queryFn: async ({ signal }) =>
      unwrap(
        await api.get<ApiEnvelope<CourseClassResponse[]>>(
          "/lecturer/course-classes/my-classes",
          { signal },
        ),
      ),
  });
export const useClassDetail = (id?: number) =>
  useQuery({
    queryKey: classKeys.detail(id || 0),
    enabled: validId(id),
    queryFn: async ({ signal }) =>
      unwrap(
        await api.get<ApiEnvelope<CourseClassResponse>>(
          `/lecturer/course-classes/${id}`,
          { signal },
        ),
      ),
  });
export const useRoster = (id: number, enabled: boolean) =>
  useQuery({
    queryKey: classKeys.roster(id),
    enabled: validId(id) && enabled,
    queryFn: async ({ signal }) =>
      unwrap(
        await api.get<ApiEnvelope<ClassStudent[]>>(
          `/lecturer/course-classes/${id}/students`,
          { signal },
        ),
      ),
  });
export const createClass = async (body: CreateClass) =>
  unwrap(
    await api.post<ApiEnvelope<CourseClassResponse>>(
      "/lecturer/course-classes",
      body,
    ),
  );
export const enrollStudents = async (id: number, student_codes: string[]) =>
  unwrap(
    await api.post<ApiEnvelope<EnrollmentResult>>(
      `/lecturer/course-classes/${id}/students`,
      { student_codes },
    ),
  );
export async function refreshClasses(client: QueryClient) {
  await Promise.all([
    client.invalidateQueries({ queryKey: classKeys.all }),
    client.invalidateQueries({ queryKey: ["academic", "my-classes"] }),
  ]);
}
