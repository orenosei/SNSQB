import type { Page, Route } from "@playwright/test";
import type {
  QuestionOption,
  CourseClassOptionResponse,
  ExamDetailResponse,
} from "../../src/features/academic/types";
import { profile } from "./fixtures";

const timestamp = "2026-10-27T03:00:00Z";
export const academicSubjects = [
  { subject_id: 10, code: "IT3070", name: "Hệ điều hành" },
  { subject_id: 20, code: "IT3010", name: "Cấu trúc dữ liệu" },
];
export const academicCourseClasses: CourseClassOptionResponse[] = [
  {
    course_class_id: 100,
    class_code: "171146",
    subject_id: 10,
    subject_code: "IT3070",
    subject_name: "Hệ điều hành",
    semester_id: 2,
    semester_name: "20261",
    active_semester: true,
    can_propose: true,
  },
  {
    course_class_id: 101,
    class_code: "171147",
    subject_id: 10,
    subject_code: "IT3070",
    subject_name: "Hệ điều hành",
    semester_id: 2,
    semester_name: "20261",
    active_semester: true,
    can_propose: true,
  },
  {
    course_class_id: 200,
    class_code: "161146",
    subject_id: 10,
    subject_code: "IT3070",
    subject_name: "Hệ điều hành",
    semester_id: 1,
    semester_name: "20252",
    active_semester: false,
    can_propose: false,
  },
  {
    course_class_id: 300,
    class_code: "171300",
    subject_id: 20,
    subject_code: "IT3010",
    subject_name: "Cấu trúc dữ liệu",
    semester_id: 2,
    semester_name: "20261",
    active_semester: true,
    can_propose: false,
  },
];
const classContext = (id: number) => {
  const course = academicCourseClasses.find(
    (item) => item.course_class_id === id,
  );
  return {
    course_class_id: id,
    class_code: course?.class_code,
    semester_id: course?.semester_id,
    semester_name: course?.semester_name,
  };
};
interface MockQuestion {
  question_id: number;
  content: string;
  options: QuestionOption[];
  explanation: string;
  status: string;
  source: "LLM" | "HOMO_SAPIENS";
  confidence_score?: number;
  image_urls: string[];
  updated_at: string;
}
interface MockSession {
  session_id: number;
  title: string;
  content: string;
  subject_id: number;
  course_class_id: number;
  owner: number;
  status: "PENDING" | "REVIEWING" | "RESOLVED";
  questions: MockQuestion[];
}
function makeQuestion(
  id: number,
  content: string,
  status = "APPROVED",
  multi = false,
): MockQuestion {
  return {
    question_id: id,
    content,
    status,
    source: "HOMO_SAPIENS",
    confidence_score: 3.5,
    image_urls: [],
    updated_at: timestamp,
    explanation: `Giải thích học thuật cho câu ${id}.`,
    options: [
      { key: "A", text: "Phương án thứ nhất", is_correct: true },
      { key: "B", text: "Phương án thứ hai", is_correct: false },
      ...(multi
        ? [{ key: "C", text: "Phương án thứ ba", is_correct: true }]
        : []),
    ],
  };
}
export function academicState() {
  return {
    sessions: new Map<number, MockSession>([
      [
        50,
        {
          session_id: 50,
          title: "Ôn tập bộ lập lịch CPU",
          content: "Cùng ôn lại kiến thức hệ điều hành.",
          subject_id: 10,
          course_class_id: 100,
          owner: 202,
          status: "RESOLVED",
          questions: [
            makeQuestion(501, "Bộ lập lịch CPU làm nhiệm vụ gì?"),
            makeQuestion(
              502,
              "Những phương án nào mô tả tiến trình?",
              "APPROVED",
              true,
            ),
          ],
        },
      ],
      [
        60,
        {
          session_id: 60,
          title: "Bộ câu hỏi đang soạn của tôi",
          content: "Câu hỏi do mình đóng góp.",
          subject_id: 10,
          course_class_id: 100,
          owner: 101,
          status: "PENDING",
          questions: [
            makeQuestion(601, "Câu hỏi đang chờ duyệt của tôi?", "PENDING"),
          ],
        },
      ],
      [
        70,
        {
          session_id: 70,
          title: "Bộ câu hỏi chờ giảng viên",
          content: "Một đề xuất mới để thẩm định.",
          subject_id: 10,
          course_class_id: 100,
          owner: 202,
          status: "PENDING",
          questions: [
            makeQuestion(701, "Câu hỏi cần thẩm định thứ nhất?", "PENDING"),
            makeQuestion(702, "Câu hỏi cần thẩm định thứ hai?", "PENDING"),
          ],
        },
      ],
    ]),
    answers: new Map<string, string[]>(),
    rated: new Set<string>(),
    nextSession: 100,
    nextQuestion: 1001,
    exams: new Map<number, ExamDetailResponse>([
      [
        80,
        {
          exam_id: 80,
          title: "Đề thi ôn tập học phần",
          subject_name: "Hệ điều hành",
          question_count: 1,
          created_at: timestamp,
          statistic: {
            easy_count: 1,
            medium_count: 0,
            hard_count: 0,
            unclassified_count: 0,
          },
          questions: [
            {
              order: 1,
              question_id: 501,
              content: "Bộ lập lịch CPU làm nhiệm vụ gì?",
              options: makeQuestion(501, "").options,
              difficulty: "EASY",
              topic: "Tiến trình",
            },
          ],
        },
      ],
    ]),
    reviewOpens: 0,
    operations: [] as string[],
  };
}
export type AcademicState = ReturnType<typeof academicState>;
export async function installAcademicMock(
  page: Page,
  state: AcademicState,
  role: "STUDENT" | "LECTURER" = "STUDENT",
) {
  const userId = role === "STUDENT" ? 101 : 303;
  const me = {
    ...profile,
    user_id: userId,
    role,
    ...(role === "LECTURER"
      ? { full_name: "Giảng viên Nguyễn An", email: "lecturer@example.test" }
      : {}),
  };
  const success = (data: unknown) => ({
    code: "1000",
    message: "SUCCESS",
    data,
  });
  const deny = (route: Route, status = 403) =>
    route.fulfill({
      status,
      json: { code: "ACCESS_DENIED", message: "Không đủ quyền truy cập" },
    });
  const questionById = (id: number) =>
    [...state.sessions.values()]
      .flatMap((session) => session.questions)
      .find((question) => question.question_id === id);
  const correct = (question: MockQuestion) =>
    question.options
      .filter((option) => option.is_correct)
      .map((option) => option.key!)
      .join(",");
  function updateResolved() {
    for (const session of state.sessions.values())
      if (session.questions.every((question) => question.status !== "PENDING"))
        session.status = "RESOLVED";
  }
  function pageData<T>(
    items: T[],
    after: string | null,
    key: (item: T) => number,
    size = 10,
  ) {
    const start = after
      ? items.findIndex((item) => key(item) === Number(after)) + 1
      : 0;
    const selected = items.slice(start, start + size);
    return {
      items: selected,
      pagination: {
        has_next: start + size < items.length,
        after: selected.length ? key(selected[selected.length - 1]) : undefined,
      },
    };
  }
  const ownerDetail = (session: MockSession) => ({
    session_id: session.session_id,
    session_code: `IT3070_${session.session_id}`,
    title: session.title,
    content: session.content,
    subject_id: session.subject_id,
    ...classContext(session.course_class_id),
    status: session.status,
    subject_name: "Hệ điều hành",
    subject_code: "IT3070",
    created_at: timestamp,
    questions: session.questions.map((question) => ({
      question_id: question.question_id,
      content: question.content,
      image_urls: question.image_urls,
      options: question.options,
      explanation: question.explanation,
      source: question.source,
      confidence_score: question.confidence_score,
    })),
  });
  await page.route("https://images.example.test/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="white"/></svg>',
    }),
  );
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/v1", "");
    const method = request.method();
    state.operations.push(`${method} ${path}`);
    const reply = (value: unknown, status = 200) =>
      route.fulfill({ status, json: success(value) });
    const body = () => request.postDataJSON();
    if (path === "/auth/login")
      return reply({
        user_id: userId,
        role,
        access_token: `mock-academic-${userId}`,
        refresh_token: null,
      });
    if (path === "/auth/logout") return reply(null);
    if (path === "/users/me") return reply(me);
    if (path === "/subjects") return reply(academicSubjects);
    if (path === "/sessions/my-enrolled-course-classes")
      return reply(academicCourseClasses);
    if (path === "/sessions/my-submissions") {
      const status = url.searchParams.get("status");
      const subject = url.searchParams.get("subject_id");
      const items = [...state.sessions.values()]
        .filter(
          (session) =>
            session.owner === userId &&
            (!status || session.status === status) &&
            (!subject || session.subject_id === Number(subject)),
        )
        .map((session) => ({
          session_id: session.session_id,
          title: session.title,
          content: session.content,
          subject_id: session.subject_id,
          ...classContext(session.course_class_id),
          status: session.status,
          subject_name: "Hệ điều hành",
          subject_code: "IT3070",
          session_code: `IT3070_${session.session_id}`,
          question_counts: session.questions.length,
          created_at: timestamp,
        }));
      const data = pageData(
        items,
        url.searchParams.get("after"),
        (item) => item.session_id,
      );
      return reply({ contents: data.items, pagination: data.pagination });
    }
    if (path === "/sessions/propose") {
      const payload = body();
      const course = academicCourseClasses.find(
        (item) => item.course_class_id === payload.course_class_id,
      );
      if (!course || "subject_id" in payload) return deny(route, 400);
      if (course.can_propose !== true) return deny(route);
      const id = state.nextSession++;
      state.sessions.set(id, {
        session_id: id,
        title: payload.title,
        content: payload.content,
        subject_id: course.subject_id!,
        course_class_id: course.course_class_id!,
        owner: userId,
        status: "PENDING",
        questions: payload.questions.map(
          (question: {
            content: string;
            options: QuestionOption[];
            explanation?: string;
            confidence?: number;
            llm_generated: boolean;
            media_urls?: string[];
          }) => ({
            question_id: state.nextQuestion++,
            content: question.content,
            options: question.options,
            explanation: question.explanation || "",
            confidence_score: question.confidence,
            source: question.llm_generated ? "LLM" : "HOMO_SAPIENS",
            status: "PENDING",
            image_urls: question.media_urls || [],
            updated_at: timestamp,
          }),
        ),
      });
      return reply(
        {
          session_id: id,
          session_code: `IT3070_${id}`,
          subject_id: course.subject_id,
          course_class_id: course.course_class_id,
          semester_name: course.semester_name,
          question_count: payload.questions.length,
          status: "PENDING",
          created_at: timestamp,
        },
        201,
      );
    }
    const ownMatch = path.match(/^\/sessions\/my-submissions\/(\d+)$/);
    if (ownMatch) {
      const session = state.sessions.get(Number(ownMatch[1]));
      if (!session) return deny(route, 404);
      if (session.owner !== userId) return deny(route);
      if (method === "GET") return reply(ownerDetail(session));
      if (session.status !== "PENDING") return deny(route);
      if (method === "DELETE") {
        state.sessions.delete(session.session_id);
        return reply(null);
      }
      if (method === "PUT") {
        const payload = body();
        if ("subject_id" in payload) return deny(route, 400);
        if (payload.course_class_id !== undefined) {
          const course = academicCourseClasses.find(
            (item) => item.course_class_id === payload.course_class_id,
          );
          if (course?.can_propose !== true) return deny(route);
          session.course_class_id = course.course_class_id!;
          session.subject_id = course.subject_id!;
        }
        Object.assign(session, {
          title: payload.title,
          content: payload.content,
        });
        for (const update of payload.questions || []) {
          const existing = session.questions.find(
            (question) => question.question_id === update.question_id,
          );
          if (existing)
            Object.assign(existing, {
              content: update.content,
              image_urls: update.media_urls || [],
              options: update.options,
              explanation: update.explanation,
              source: update.source,
              confidence_score: update.confidence,
              updated_at: timestamp,
            });
          else
            session.questions.push({
              question_id: state.nextQuestion++,
              content: update.content,
              options: update.options,
              explanation: update.explanation || "",
              source: update.source || "HOMO_SAPIENS",
              status: "PENDING",
              confidence_score: update.confidence,
              image_urls: update.media_urls || [],
              updated_at: timestamp,
            });
        }
        return reply(null);
      }
    }
    const practiceMatch = path.match(/^\/sessions\/(\d+)\/questions$/);
    if (practiceMatch) {
      const session = state.sessions.get(Number(practiceMatch[1]));
      if (!session) return deny(route, 404);
      if (session.status !== "RESOLVED" && session.owner !== userId)
        return deny(route);
      return reply({
        session_id: session.session_id,
        title: session.title,
        content: session.content,
        session_code: `IT3070_${session.session_id}`,
        subject_id: session.subject_id,
        subject_name: "Hệ điều hành",
        total_questions: session.questions.length,
        questions: session.questions.map((question) => {
          const answered = state.answers.has(
            `${userId}:${question.question_id}`,
          );
          return {
            question_id: question.question_id,
            question_code: `IT3070_Q${question.question_id}`,
            content: question.content,
            image_urls: question.image_urls,
            options: question.options.map((option) =>
              answered
                ? option
                : {
                    key: option.key,
                    text: option.text,
                    media_url: option.media_url,
                  },
            ),
            updated_at: question.updated_at,
            source: question.source,
            my_interaction: {
              answered,
              rated: state.rated.has(`${userId}:${question.question_id}`),
            },
            ...(answered
              ? {
                  hidden_fields: {
                    correct_answer: correct(question),
                    explanation: question.explanation,
                  },
                }
              : {}),
          };
        }),
      });
    }
    const interaction = path.match(
      /^\/questions\/(\d+)\/(answer|rate|statistics|ratings)$/,
    );
    if (interaction) {
      const question = questionById(Number(interaction[1]));
      if (!question) return deny(route, 404);
      const key = `${userId}:${question.question_id}`;
      if (interaction[2] === "answer") {
        const payload = body();
        if (state.answers.has(key))
          return route.fulfill({
            status: 409,
            json: { code: "ALREADY_ANSWERED" },
          });
        if (
          payload.question_updated_at &&
          payload.question_updated_at !== question.updated_at
        )
          return route.fulfill({ status: 412, json: { code: "STALE_DATA" } });
        state.answers.set(key, payload.selected_options);
        const expected = question.options
          .filter((option) => option.is_correct)
          .map((option) => option.key!);
        return reply({
          is_correct:
            expected.length === payload.selected_options.length &&
            expected.every((value) => payload.selected_options.includes(value)),
          correct_answer: correct(question),
          explanation: question.explanation,
        });
      }
      if (interaction[2] === "rate") {
        state.rated.add(key);
        return reply({ new_avg_rating: 3.75, new_rating_count: 13 });
      }
      if (interaction[2] === "statistics")
        return reply({
          total_answer: 12,
          correct_rate: 0.75,
          option_distribution: { A: 9, B: 3 },
          rating_summary: { avg_rating: 3.5, total_ratings: 12 },
        });
      return reply({
        items: [
          {
            user_id: 202,
            rating: 4,
            is_error: false,
            comment: "Câu hỏi hữu ích.",
            created_at: timestamp,
          },
        ],
        pagination: { has_next: false },
      });
    }
    if (path === "/search") {
      const type = url.searchParams.get("type");
      const term = (url.searchParams.get("query") || "").toLocaleLowerCase(
        "vi",
      );
      const sessions = [...state.sessions.values()].filter(
        (session) => session.status === "RESOLVED" || session.owner === userId,
      );
      const items =
        type === "QUESTION"
          ? sessions.flatMap((session) =>
              session.questions
                .filter((question) =>
                  question.content.toLocaleLowerCase("vi").includes(term),
                )
                .map((question) => ({
                  type: "QUESTION",
                  question: {
                    question_id: question.question_id,
                    question_code: `IT3070_Q${question.question_id}`,
                    content: question.content,
                    options: question.options.map((option) => ({
                      key: option.key,
                      text: option.text,
                    })),
                    status: question.status,
                    difficulty: "MEDIUM",
                    subject_id: session.subject_id,
                    subject_name: "Hệ điều hành",
                    topic_name: "Tiến trình",
                  },
                })),
            )
          : sessions
              .filter((session) =>
                session.title.toLocaleLowerCase("vi").includes(term),
              )
              .map((session) => ({
                type: "SESSION",
                session: {
                  session_id: session.session_id,
                  title: session.title,
                  content: session.content,
                  subject_id: session.subject_id,
                  subject_name: "Hệ điều hành",
                  status: session.status,
                  question_count: session.questions.length,
                },
              }));
      const offset = Number(url.searchParams.get("after") || 0);
      return reply({
        items: items.slice(offset, offset + 1),
        total_hits: items.length,
        pagination: { has_next: offset + 1 < items.length, after: offset + 1 },
      });
    }
    if (path === "/sessions/pending") {
      if (role !== "LECTURER") return deny(route);
      const items = [...state.sessions.values()]
        .filter((session) => session.status !== "RESOLVED")
        .map((session) => ({
          session_id: session.session_id,
          title: session.title,
          content: session.content,
          topic: "Hệ điều hành",
          status: session.status,
          author: { user_id: session.owner, full_name: "Tác giả câu hỏi" },
        }));
      return reply(
        pageData(
          items,
          url.searchParams.get("after"),
          (item) => item.session_id,
        ),
      );
    }
    const reviewMatch = path.match(/^\/sessions\/(\d+)$/);
    if (reviewMatch) {
      if (role !== "LECTURER") return deny(route);
      const session = state.sessions.get(Number(reviewMatch[1]));
      if (!session) return deny(route, 404);
      session.status = "REVIEWING";
      state.reviewOpens++;
      return reply({
        items: session.questions.map((question) => ({
          question_id: question.question_id,
          content: question.content,
          image_urls: question.image_urls,
          options: question.options,
          correct_answer: correct(question),
          explanation: question.explanation,
          status: question.status,
        })),
        duplicate_warnings: [
          {
            question_index: 0,
            similar_question_id: 501,
            similarity_score: 0.92,
            tier: "TRIGRAM",
            matched_snipet: "Bộ lập lịch CPU",
          },
        ],
      });
    }
    if (path === "/sessions/approve" || path === "/sessions/reject") {
      if (role !== "LECTURER") return deny(route);
      const payload = body();
      for (const id of payload.question_ids) {
        const question = questionById(id);
        if (question)
          question.status = path.endsWith("/approve") ? "APPROVED" : "REJECTED";
      }
      updateResolved();
      return reply(
        path.endsWith("/approve")
          ? { points_earned: payload.question_ids.length * 10 }
          : null,
      );
    }
    const complete = path.match(/^\/sessions\/(\d+)\/complete-review$/);
    if (complete) {
      if (role !== "LECTURER") return deny(route);
      const session = state.sessions.get(Number(complete[1]));
      if (!session) return deny(route, 404);
      session.questions.forEach((question) => {
        if (question.status === "PENDING") question.status = "REJECTED";
      });
      session.status = "RESOLVED";
      return reply(null);
    }
    const questionEdit = path.match(/^\/questions\/(\d+)$/);
    if (questionEdit && method === "PUT") {
      if (role !== "LECTURER") return deny(route);
      const question = questionById(Number(questionEdit[1]));
      if (!question) return deny(route, 404);
      const payload = body();
      Object.assign(question, {
        content: payload.content,
        options: payload.options,
        explanation: payload.explanation,
      });
      if (payload.auto_approve) question.status = "APPROVED";
      updateResolved();
      return reply({
        question_id: question.question_id,
        status: question.status,
        reviewed_by: userId,
        reviewed_at: timestamp,
      });
    }
    if (path === "/lecturer/course-classes/my-classes")
      return role === "LECTURER"
        ? reply([
            {
              course_class_id: 100,
              class_code: "171146",
              subject_id: 10,
              subject_name: "Hệ điều hành",
              lecturer_id: userId,
            },
          ])
        : deny(route);
    if (path === "/exams/my-exams")
      return role === "LECTURER"
        ? reply({
            items: [...state.exams.values()].map((exam) => ({
              exam_id: exam.exam_id,
              title: exam.title,
              subject_name: exam.subject_name,
              question_count: exam.question_count,
              created_at: timestamp,
            })),
            pagination: { has_next: false },
          })
        : deny(route);
    if (path === "/exams/generate") {
      if (role !== "LECTURER") return deny(route);
      const payload = body();
      const id = 900;
      const questions = state.sessions
        .get(50)!
        .questions.slice(0, payload.question_count || 1)
        .map((question, index) => ({
          order: index + 1,
          question_id: question.question_id,
          content: question.content,
          options: question.options,
          difficulty: "EASY" as const,
          topic: "Tiến trình",
        }));
      const exam = {
        ...state.exams.get(80)!,
        exam_id: id,
        questions,
        question_count: questions.length,
        statistic: {
          easy_count: questions.length,
          medium_count: 0,
          hard_count: 0,
          unclassified_count: 0,
        },
        title: payload.title || "Đề tự động từ ngân hàng",
      };
      state.exams.set(id, exam);
      return reply(exam);
    }
    const examMatch = path.match(/^\/exams\/(\d+)(\/export)?$/);
    if (path === "/lecturer/questions/export" || examMatch?.[2] === "/export")
      return role === "LECTURER"
        ? reply({
            download_url: `http://127.0.0.1:4173/mock-export/${examMatch?.[1] || "bank"}.${url.searchParams.get("format")}`,
            questions_count: 1,
            file_size_mb: 0.1,
            expires_at: "2026-10-28T04:00:00Z",
          })
        : deny(route);
    if (examMatch)
      return role === "LECTURER" && state.exams.has(Number(examMatch[1]))
        ? reply(state.exams.get(Number(examMatch[1])))
        : deny(route, 404);
    if (path === "/medias/upload")
      return reply({
        object_key: "test/question.png",
        url: "https://images.example.test/question.png",
        media_type: "IMAGE",
        file_size: 68,
      });
    throw new Error(`Unexpected academic request: ${method} ${path}`);
  });
}
