import {
  test,
  expect,
  type APIRequestContext,
  type APIResponse,
} from "@playwright/test";
import { randomUUID } from "node:crypto";

const base = (
  process.env.SNSQB_TEST_API_BASE_URL || "https://snsqb.duckdns.org/api/v1"
).replace(/\/+$/, "");
const enabled =
  !!process.env.SNSQB_TEST_EMAIL && !!process.env.SNSQB_TEST_PASSWORD;
const idFromEnv = (name: string) => {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : undefined;
};
const subjectId = idFromEnv("SNSQB_TEST_SUBJECT_ID");
let proposalClassId = idFromEnv("SNSQB_TEST_PROPOSAL_CLASS_ID");
const approvedSession = idFromEnv("SNSQB_TEST_APPROVED_SESSION_ID");
const answerId = idFromEnv("SNSQB_TEST_UNANSWERED_QUESTION_ID");
const classId = idFromEnv("SNSQB_TEST_ACADEMIC_CLASS_ID");
const marker = `SNSQB-ACADEMIC-${randomUUID()}`;
async function result(response: APIResponse, expected = 200) {
  expect(response.status()).toBe(expected);
  const body = await response.json();
  expect(["0000", "1000"]).toContain(body.code);
  return body.data;
}

// Run with the configured student; never edit or delete unrelated existing data.
test.describe("Real academic API", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 });
  test.skip(
    !enabled,
    "Cần SNSQB_TEST_EMAIL và SNSQB_TEST_PASSWORD trong môi trường chạy test.",
  );
  let student: APIRequestContext;
  let peer: APIRequestContext | undefined;
  let lecturer: APIRequestContext | undefined;
  let anonymous: APIRequestContext;
  test.beforeAll(async ({ playwright, request }) => {
    async function login(
      email: string,
      password: string,
      expectedRole: string,
    ) {
      const auth = await result(
        await request.post(`${base}/auth/login`, {
          data: {
            email,
            password,
            device_id: `web-academic-${randomUUID()}`,
            platform: "WEB",
          },
        }),
      );
      expect(typeof auth.access_token).toBe("string");
      const client = await playwright.request.newContext({
        extraHTTPHeaders: { Authorization: `Bearer ${auth.access_token}` },
        timeout: 15_000,
      });
      try {
        const me = await result(await client.get(`${base}/users/me`));
        expect(me.role).toBe(expectedRole);
        return client;
      } catch (error) {
        await client.post(`${base}/auth/logout`);
        await client.dispose();
        throw error;
      }
    }
    student = await login(
      process.env.SNSQB_TEST_EMAIL!,
      process.env.SNSQB_TEST_PASSWORD!,
      "STUDENT",
    );
    if (
      process.env.SNSQB_TEST_PEER_EMAIL &&
      process.env.SNSQB_TEST_PEER_PASSWORD
    )
      peer = await login(
        process.env.SNSQB_TEST_PEER_EMAIL,
        process.env.SNSQB_TEST_PEER_PASSWORD,
        "STUDENT",
      );
    if (
      process.env.SNSQB_TEST_LECTURER_EMAIL &&
      process.env.SNSQB_TEST_LECTURER_PASSWORD
    )
      lecturer = await login(
        process.env.SNSQB_TEST_LECTURER_EMAIL,
        process.env.SNSQB_TEST_LECTURER_PASSWORD,
        "LECTURER",
      );
    anonymous = await playwright.request.newContext({ timeout: 15_000 });
  });
  test.afterAll(async () => {
    for (const client of [student, peer, lecturer])
      if (client) {
        try {
          expect([200, 401]).toContain(
            (await client.post(`${base}/auth/logout`)).status(),
          );
        } finally {
          await client.dispose();
        }
      }
    if (anonymous) await anonymous.dispose();
  });
  async function assertEnrolled() {
    const classes = await result(
      await student.get(`${base}/sessions/my-enrolled-course-classes`),
    );
    expect(Array.isArray(classes)).toBe(true);
    const course = proposalClassId
      ? classes.find(
          (item: { course_class_id?: number }) =>
            item.course_class_id === proposalClassId,
        )
      : classes.find(
          (item: {
            course_class_id?: number;
            can_propose?: boolean;
            subject_id?: number;
          }) =>
            Number.isSafeInteger(item.course_class_id) &&
            item.can_propose === true &&
            (!subjectId || item.subject_id === subjectId),
        );
    test.skip(!course, "Tài khoản chưa có lớp hiện tại với can_propose=true.");
    expect(course).toBeTruthy();
    expect(course.can_propose).toBe(true);
    if (subjectId) expect(course.subject_id).toBe(subjectId);
    proposalClassId = course.course_class_id;
  }
  async function cleanupOwned(id: number) {
    let after: number | undefined;
    const visited = new Set<number>();
    for (;;) {
      const pending = await result(
        await student.get(`${base}/sessions/my-submissions`, {
          params: { status: "PENDING", limit: 50, ...(after ? { after } : {}) },
        }),
      );
      if (
        pending.contents?.some(
          (session: { session_id?: number }) => session.session_id === id,
        )
      ) {
        await result(
          await student.delete(`${base}/sessions/my-submissions/${id}`),
        );
        return;
      }
      const next = pending.pagination?.after;
      if (
        !pending.pagination?.has_next ||
        !Number.isSafeInteger(next) ||
        visited.has(next)
      )
        break;
      visited.add(next);
      after = next;
    }
    // REVIEWING/RESOLVED sessions cannot be deleted by the documented author API.
    test.info().annotations.push({
      type: "retained-fixture",
      description: `Owned test session ${id}: no longer PENDING; no permitted cleanup endpoint.`,
    });
  }
  async function withDraft(run: (id: number) => Promise<void>, count = 1) {
    await assertEnrolled();
    const created = await result(
      await student.post(`${base}/sessions/propose`, {
        data: {
          title: marker,
          content: "Bộ câu hỏi tổng hợp dành riêng cho kiểm thử.",
          course_class_id: proposalClassId,
          questions: Array.from({ length: count }, (_, index) => ({
            content: `${marker}: Câu kiểm thử ${index + 1}?`,
            options: [
              { key: "A", text: "Phương án A", is_correct: true },
              { key: "B", text: "Phương án B", is_correct: false },
            ],
            explanation: "Lời giải tổng hợp cho fixture riêng.",
            llm_generated: false,
            confidence: 3,
          })),
        },
      }),
      201,
    );
    expect(Number.isSafeInteger(created?.session_id)).toBe(true);
    const id = created.session_id;
    try {
      await run(id);
    } finally {
      await cleanupOwned(id);
    }
  }
  async function freshPracticeQuestion() {
    test.skip(
      !approvedSession || !answerId,
      "Cần approved session và question test chưa được tài khoản này trả lời. API không có reset lịch sử.",
    );
    const practice = await result(
      await student.get(`${base}/sessions/${approvedSession}/questions`),
    );
    const question = practice.questions?.find(
      (item: { question_id?: number }) => item.question_id === answerId,
    );
    expect(question).toBeTruthy();
    test.skip(
      question.my_interaction?.answered !== false,
      "Fixture đã được trả lời hoặc không có trạng thái rõ; không gửi lại/không reset dữ liệu.",
    );
    const option = question.options?.find(
      (item: { key?: string }) => !!item.key,
    )?.key;
    expect(typeof option).toBe("string");
    return { question, option };
  }

  test("reads subject catalog and current/historical enrolled course classes", async () => {
    expect(
      Array.isArray(await result(await student.get(`${base}/subjects`))),
    ).toBe(true);
    expect(
      Array.isArray(
        await result(
          await student.get(`${base}/sessions/my-enrolled-course-classes`),
        ),
      ),
    ).toBe(true);
  });
  test("filters own submissions using status and optional subject", async () => {
    const response = await result(
      await student.get(`${base}/sessions/my-submissions`, {
        params: {
          status: "PENDING",
          limit: 10,
          ...(subjectId ? { subject_id: subjectId } : {}),
        },
      }),
    );
    expect(Array.isArray(response.contents)).toBe(true);
  });
  test("searches QUESTION and SESSION with documented global search parameters", async () => {
    for (const type of ["QUESTION", "SESSION"]) {
      const response = await result(
        await student.get(`${base}/search`, {
          params: { query: marker, type, limit: 10 },
        }),
      );
      expect(Array.isArray(response.items)).toBe(true);
    }
  });
  test("reads practice questions and answered/rated states from an approved fixture", async () => {
    test.skip(
      !approvedSession,
      "Cần SNSQB_TEST_APPROVED_SESSION_ID của bộ test đã được duyệt.",
    );
    const response = await result(
      await student.get(`${base}/sessions/${approvedSession}/questions`),
    );
    expect(Array.isArray(response.questions)).toBe(true);
    expect(response.session_id).toBe(approvedSession);
  });
  test("proposes, views, updates and deletes only an owned PENDING collection", async () => {
    await withDraft(async (id) => {
      const own = await result(
        await student.get(`${base}/sessions/my-submissions/${id}`),
      );
      expect(own.status).toBe("PENDING");
      expect(own.course_class_id).toBe(proposalClassId);
      const question = own.questions?.[0];
      expect(Number.isSafeInteger(question?.question_id)).toBe(true);
      await result(
        await student.put(`${base}/sessions/my-submissions/${id}`, {
          data: {
            title: `${marker} updated`,
            course_class_id: proposalClassId,
            questions: [
              {
                question_id: question.question_id,
                content: `${marker}: Đã sửa câu hỏi?`,
                options: question.options,
                explanation: "Đã cập nhật lời giải.",
                source: "HOMO_SAPIENS",
                confidence: 3.5,
              },
            ],
          },
        }),
      );
      const updated = await result(
        await student.get(`${base}/sessions/my-submissions/${id}`),
      );
      expect(updated.title).toBe(`${marker} updated`);
      expect(updated.questions[0].content).toBe(`${marker}: Đã sửa câu hỏi?`);
    });
  });
  test("rejects invalid proposal input without leaving an accepted fixture behind", async () => {
    await assertEnrolled();
    const invalid = await student.post(`${base}/sessions/propose`, {
      data: { course_class_id: proposalClassId, title: marker, questions: [] },
    });
    if (invalid.status() === 201) {
      const body = await invalid.json();
      if (Number.isSafeInteger(body.data?.session_id))
        await cleanupOwned(body.data.session_id);
    }
    expect(invalid.status()).toBe(400);
  });
  test("another student cannot read, modify or delete the owned submission", async () => {
    test.skip(!peer, "Cần tài khoản test sinh viên thứ hai.");
    await withDraft(async (id) => {
      expect(
        (await peer!.get(`${base}/sessions/my-submissions/${id}`)).status(),
      ).toBe(403);
      expect(
        (
          await peer!.put(`${base}/sessions/my-submissions/${id}`, {
            data: { title: "Unauthorized change" },
          })
        ).status(),
      ).toBe(403);
      expect(
        (await peer!.delete(`${base}/sessions/my-submissions/${id}`)).status(),
      ).toBe(403);
      expect(
        (
          await result(
            await student.get(`${base}/sessions/my-submissions/${id}`),
          )
        ).title,
      ).toBe(marker);
    });
  });
  test("a student cannot use the lecturer-only question edit API", async () => {
    await withDraft(async (id) => {
      const own = await result(
        await student.get(`${base}/sessions/my-submissions/${id}`),
      );
      const questionId = own.questions?.[0]?.question_id;
      expect(Number.isSafeInteger(questionId)).toBe(true);
      expect(
        (
          await student.put(`${base}/lecturer/questions/${questionId}`, {
            data: {
              content: "Student lecturer-endpoint edit",
              auto_approve: false,
            },
          })
        ).status(),
      ).toBe(403);
    });
  });
  test("missing authentication is rejected for academic resources", async () => {
    expect((await anonymous.get(`${base}/subjects`)).status()).toBe(401);
    expect(
      (await anonymous.get(`${base}/sessions/my-submissions`)).status(),
    ).toBe(401);
  });
  test("reads question statistics and cursor ratings from an approved fixture", async () => {
    test.skip(!approvedSession, "Cần approved session test.");
    const session = await result(
      await student.get(`${base}/sessions/${approvedSession}/questions`),
    );
    const questionId = session.questions?.[0]?.question_id;
    expect(Number.isSafeInteger(questionId)).toBe(true);
    const stats = await result(
      await student.get(`${base}/questions/${questionId}/statistics`),
    );
    expect(stats).toBeTruthy();
    const ratings = await result(
      await student.get(`${base}/questions/${questionId}/ratings`, {
        params: { limit: 10 },
      }),
    );
    expect(Array.isArray(ratings.items)).toBe(true);
  });
  test("stale question timestamp returns 412 before any accepted answer", async () => {
    const { option } = await freshPracticeQuestion();
    const response = await student.post(
      `${base}/questions/${answerId}/answer`,
      {
        data: {
          selected_options: [option],
          question_updated_at: "1970-01-01T00:00:00Z",
        },
      },
    );
    expect(response.status()).toBe(412);
  });
  test("submits once, receives server evaluation, rejects duplicates and restores answered state", async () => {
    const { question, option } = await freshPracticeQuestion();
    const body = {
      selected_options: [option],
      ...(question.updated_at
        ? { question_updated_at: question.updated_at }
        : {}),
    };
    const answer = await result(
      await student.post(`${base}/questions/${answerId}/answer`, {
        data: body,
      }),
    );
    expect(typeof answer.is_correct).toBe("boolean");
    expect(typeof answer.correct_answer).toBe("string");
    expect(
      (
        await student.post(`${base}/questions/${answerId}/answer`, {
          data: body,
        })
      ).status(),
    ).toBe(409);
    const reloaded = await result(
      await student.get(`${base}/sessions/${approvedSession}/questions`),
    );
    const saved = reloaded.questions.find(
      (item: { question_id?: number }) => item.question_id === answerId,
    );
    expect(saved.my_interaction.answered).toBe(true);
    expect(saved.hidden_fields.correct_answer).toBe(answer.correct_answer);
    test.info().annotations.push({
      type: "retained-fixture",
      description: `Answer for dedicated question ${answerId}: no reset/delete answer API.`,
    });
  });
  test("rating rejects out-of-range input and accepts 0–4 on a dedicated question", async () => {
    test.skip(!answerId, "Cần question test cụ thể; rating không có API xóa.");
    expect(
      (
        await student.post(`${base}/questions/${answerId}/rate`, {
          data: { rating: 5 },
        })
      ).status(),
    ).toBe(400);
    const rated = await result(
      await student.post(`${base}/questions/${answerId}/rate`, {
        data: { rating: 3, is_error: false, comment: marker },
      }),
    );
    expect(typeof rated.new_avg_rating).toBe("number");
    expect(typeof rated.new_rating_count).toBe("number");
    test.info().annotations.push({
      type: "retained-fixture",
      description: `Dedicated question ${answerId}: rating retained because no delete/reset endpoint.`,
    });
  });
  test("lecturer reads pending reviews, own classes and exam list", async () => {
    test.skip(!lecturer, "Cần tài khoản test giảng viên.");
    for (const path of [
      "/lecturer/sessions/reviewable",
      "/lecturer/course-classes/my-classes",
      "/lecturer/exams/my-exams",
    ])
      expect(await result(await lecturer!.get(`${base}${path}`))).toBeTruthy();
  });
  test("lecturer explicitly opens, edits, approves and completes only a newly created test session", async () => {
    test.skip(
      !lecturer,
      "Cần tài khoản giảng viên: phiên REVIEWING/RESOLVED không có API cleanup.",
    );
    await withDraft(async (id) => {
      const review = await result(
        await lecturer!.get(`${base}/lecturer/sessions/${id}`),
      );
      expect(review.items.length).toBe(2);
      const question = review.items[0];
      const edited = await result(
        await lecturer!.put(`${base}/lecturer/questions/${question.question_id}`, {
          data: {
            content: `${marker}: Lecturer edit?`,
            options: question.options,
            explanation: "Đã biên tập trong fixture test.",
            auto_approve: false,
          },
        }),
      );
      expect(edited.question_id).toBe(question.question_id);
      const approved = await result(
        await lecturer!.post(`${base}/lecturer/sessions/approve`, {
          data: { question_ids: [question.question_id] },
        }),
      );
      expect(typeof approved.points_earned).toBe("number");
      await result(
        await lecturer!.post(`${base}/lecturer/sessions/${id}/complete-review`),
      );
      expect(
        (
          await student.put(`${base}/sessions/my-submissions/${id}`, {
            data: { title: "Cannot edit processed session" },
          })
        ).status(),
      ).toBe(403);
    }, 2);
  });
  test("lecturer rejects a newly created test question through the bulk endpoint", async () => {
    test.skip(
      !lecturer,
      "Cần tài khoản giảng viên cho phiên không thể xóa sau duyệt.",
    );
    await withDraft(async (id) => {
      const review = await result(
        await lecturer!.get(`${base}/lecturer/sessions/${id}`),
      );
      await result(
        await lecturer!.post(`${base}/lecturer/sessions/reject`, {
          data: { question_ids: [review.items[0].question_id], reason: marker },
        }),
      );
    });
  });
  test("lecturer generates, reads and exports an exam only for a dedicated subject/class", async () => {
    test.skip(
      !lecturer || !subjectId || !classId,
      "Cần giảng viên và môn/lớp phù hợp; Swagger không có API xóa đề thi.",
    );
    const classes = await result(
      await lecturer!.get(`${base}/lecturer/course-classes/my-classes`),
    );
    expect(
      classes.some(
        (course: { course_class_id?: number; subject_id?: number }) =>
          course.course_class_id === classId && course.subject_id === subjectId,
      ),
    ).toBe(true);
    const exam = await result(
      await lecturer!.post(`${base}/lecturer/exams/generate`, {
        data: {
          subject_id: subjectId,
          class_ids: [classId],
          title: marker,
          question_count: 1,
          shuffle_options: true,
          include_answer_key: false,
        },
      }),
    );
    expect(Number.isSafeInteger(exam.exam_id)).toBe(true);
    const read = await result(
      await lecturer!.get(`${base}/lecturer/exams/${exam.exam_id}`),
    );
    expect(read.exam_id).toBe(exam.exam_id);
    const exported = await result(
      await lecturer!.get(`${base}/lecturer/exams/${exam.exam_id}/export`, {
        params: { format: "pdf", include_answer_key: false },
      }),
    );
    expect(typeof exported.download_url).toBe("string");
    test.info().annotations.push({
      type: "retained-fixture",
      description: `Dedicated exam ${exam.exam_id}: no permitted delete/reset API.`,
    });
  });
  test("lecturer exports the dedicated subject question bank", async () => {
    test.skip(
      !lecturer || !subjectId,
      "Cần giảng viên và môn hợp lệ để xuất ngân hàng câu hỏi.",
    );
    const exported = await result(
      await lecturer!.get(`${base}/lecturer/questions/export`, {
        params: {
          subject_id: subjectId!,
          format: "xlsx",
          include_answer: true,
        },
      }),
    );
    expect(typeof exported.download_url).toBe("string");
  });
});
