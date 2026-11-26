import { test, expect, signIn } from "./fixtures";
import { goTo } from "./social-fixture";
import {
  academicState,
  academicCourseClasses,
  installAcademicMock,
} from "./academic-fixture";

async function fillQuestion(
  page: import("@playwright/test").Page,
  content = "Câu hỏi mới về hệ điều hành?",
) {
  await page.getByLabel("Nội dung câu hỏi 1", { exact: true }).fill(content);
  await page
    .getByLabel("Nội dung phương án 1 câu 1", { exact: true })
    .fill("Đáp án đúng");
  await page
    .getByLabel("Nội dung phương án 2 câu 1", { exact: true })
    .fill("Đáp án khác");
  await page.getByLabel("Đúng", { exact: true }).first().check();
}

test("browses collections, searches questions and opens server-backed details without inventing a question GET", async ({
  page,
}, info) => {
  const state = academicState();
  await installAcademicMock(page, state);
  await signIn(page);
  await goTo(page, "/question-bank");
  await expect(
    page.getByRole("heading", { name: "Ôn tập bộ lập lịch CPU", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("question-bank.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Câu hỏi", exact: true }).click();
  await page.getByLabel("Tìm câu hỏi hoặc bộ câu hỏi").fill("Bộ lập lịch");
  const request = page.waitForRequest(
    (request) =>
      request.url().includes("/search?") &&
      new URL(request.url()).searchParams.get("query") === "Bộ lập lịch",
  );
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  expect(new URL((await request).url()).searchParams.get("type")).toBe(
    "QUESTION",
  );
  await page
    .getByRole("button", { name: "Xem chi tiết câu hỏi", exact: false })
    .click();
  await expect(
    page.getByRole("region", { name: "Chi tiết câu hỏi" }),
  ).toContainText("Phương án thứ nhất");
  expect(
    state.operations.some((operation) =>
      /^GET \/questions\/\d+$/.test(operation),
    ),
  ).toBe(false);
  await page.getByRole("button", { name: "Đóng chi tiết câu hỏi" }).click();
  await page.getByLabel("Tìm câu hỏi hoặc bộ câu hỏi").fill("không-có-kết-quả");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Chưa có kết quả phù hợp" }),
  ).toBeVisible();
});

test("question search and own collections follow only documented pagination and filters", async ({
  page,
}) => {
  const state = academicState();
  await installAcademicMock(page, state);
  await signIn(page);
  await goTo(page, "/question-bank?type=QUESTION");
  await expect(
    page.getByRole("heading", { name: "Bộ lập lịch CPU làm nhiệm vụ gì?" }),
  ).toBeVisible();
  const next = page.waitForRequest(
    (request) =>
      request.url().includes("/search?") &&
      new URL(request.url()).searchParams.get("after") === "1",
  );
  await page.getByRole("button", { name: "Xem thêm", exact: true }).click();
  await next;
  await expect(
    page.getByRole("heading", {
      name: "Những phương án nào mô tả tiến trình?",
    }),
  ).toBeVisible();
  await goTo(page, "/submissions");
  const filter = page.waitForRequest(
    (request) =>
      request.url().includes("/sessions/my-submissions?") &&
      new URL(request.url()).searchParams.get("subject_id") === "10" &&
      new URL(request.url()).searchParams.get("status") === "PENDING",
  );
  await page.getByLabel("Môn học", { exact: true }).selectOption("10");
  await page.getByLabel("Trạng thái", { exact: true }).selectOption("PENDING");
  await filter;
  await expect(
    page.getByRole("heading", {
      name: "Bộ câu hỏi đang soạn của tôi",
      exact: true,
    }),
  ).toBeVisible();
});

test("creates, edits and deletes a pending owned collection with correct create/update DTOs", async ({
  page,
}) => {
  const state = academicState();
  await installAcademicMock(page, state);
  await signIn(page);
  await goTo(page, "/submissions/new");
  await page.getByLabel("Tiêu đề bộ câu hỏi").fill("Bộ câu hỏi đóng góp mới");
  await page.getByLabel("Lớp học phần", { exact: true }).selectOption("100");
  await fillQuestion(page);
  await page.getByLabel("Nguồn câu 1", { exact: true }).selectOption("LLM");
  await page.getByLabel("Mức tự tin câu 1 (0–4)").fill("3.5");
  const create = page.waitForRequest("**/sessions/propose");
  await page.getByRole("button", { name: "Gửi đề xuất", exact: true }).click();
  const created = (await create).postDataJSON();
  expect(created).toMatchObject({
    title: "Bộ câu hỏi đóng góp mới",
    course_class_id: 100,
    questions: [{ llm_generated: true, confidence: 3.5 }],
  });
  expect(created).not.toHaveProperty("subject_id");
  expect(created.questions[0]).not.toHaveProperty("source");
  expect(created.questions[0]).not.toHaveProperty("question_id");
  await expect(page).toHaveURL("/submissions/100");
  await page
    .getByRole("link", { name: "Chỉnh sửa bộ câu hỏi", exact: true })
    .click();
  await page
    .getByLabel("Nội dung câu hỏi 1", { exact: true })
    .fill("Nội dung đã được sửa lại");
  await page.getByLabel("Lớp học phần", { exact: true }).selectOption("101");
  const update = page.waitForRequest(
    (request) =>
      request.url().endsWith("/sessions/my-submissions/100") &&
      request.method() === "PUT",
  );
  await page
    .getByRole("button", { name: "Lưu bộ câu hỏi", exact: true })
    .click();
  const updated = (await update).postDataJSON();
  expect(updated.course_class_id).toBe(101);
  expect(updated).not.toHaveProperty("subject_id");
  expect(updated.questions[0]).toMatchObject({
    question_id: 1001,
    source: "LLM",
    content: "Nội dung đã được sửa lại",
  });
  expect(updated.questions[0]).not.toHaveProperty("llm_generated");
  expect(updated).not.toHaveProperty("source_url");
  await expect(page).toHaveURL("/submissions/100");
  await expect(
    page.getByText("Nội dung đã được sửa lại", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Xóa bộ câu hỏi", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Hủy", exact: true })
    .click();
  expect(state.sessions.has(100)).toBe(true);
  await page
    .getByRole("button", { name: "Xóa bộ câu hỏi", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xóa bộ câu hỏi", exact: true })
    .click();
  await expect(page).toHaveURL("/submissions");
  expect(state.sessions.has(100)).toBe(false);
});

test("validates question choices and preserves proposal drafts on server rejection", async ({
  page,
}) => {
  const state = academicState();
  await installAcademicMock(page, state);
  await signIn(page);
  await goTo(page, "/submissions/new");
  await page.getByLabel("Tiêu đề bộ câu hỏi").fill("Bản nháp cần giữ");
  await page.getByLabel("Lớp học phần", { exact: true }).selectOption("100");
  await fillQuestion(page);
  await page.getByLabel("Đúng", { exact: true }).first().uncheck();
  await page.getByRole("button", { name: "Gửi đề xuất", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "ít nhất một đáp án đúng",
  );
  expect(
    state.operations.filter(
      (operation) => operation === "POST /sessions/propose",
    ),
  ).toHaveLength(0);
  await page.getByLabel("Đúng", { exact: true }).first().check();
  await page.getByLabel("Khóa phương án 2 câu 1", { exact: true }).fill("A");
  await page.getByRole("button", { name: "Gửi đề xuất", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("phải khác nhau");
  await page.getByLabel("Khóa phương án 2 câu 1", { exact: true }).fill("B");
  await page.route("**/sessions/propose", (route) =>
    route.fulfill({ status: 403, json: { code: "ACCESS_DENIED" } }),
  );
  await page.getByRole("button", { name: "Gửi đề xuất", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "không có quyền truy cập",
  );
  await expect(page.getByLabel("Tiêu đề bộ câu hỏi")).toHaveValue(
    "Bản nháp cần giữ",
  );
});

test("keeps a proposal draft on enrolled-course-classes 500 and retries without a subject fallback", async ({
  page,
}) => {
  const state = academicState();
  await installAcademicMock(page, state);
  await page.route("**/sessions/my-enrolled-course-classes", (route) =>
    route.fulfill({ status: 500, json: { code: "INTERNAL_ERROR" } }),
  );
  await signIn(page);
  await goTo(page, "/submissions/new");
  await expect(page.getByRole("alert")).toBeVisible();
  await page
    .getByLabel("Tiêu đề bộ câu hỏi")
    .fill("Giữ bản soạn khi lỗi lớp học");
  await fillQuestion(page);
  await expect(
    page.getByRole("button", { name: "Gửi đề xuất", exact: true }),
  ).toBeDisabled();
  expect(state.operations).not.toContain("GET /subjects");
  await expect(
    page.getByRole("button", { name: "Chọn từ danh mục môn học" }),
  ).toHaveCount(0);
  await page.unroute("**/sessions/my-enrolled-course-classes");
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await page.getByLabel("Lớp học phần", { exact: true }).selectOption("101");
  await expect(page.getByLabel("Tiêu đề bộ câu hỏi")).toHaveValue(
    "Giữ bản soạn khi lỗi lớp học",
  );
  let proposals = 0;
  await page.route("**/sessions/propose", (route) => {
    proposals++;
    expect(route.request().postDataJSON().course_class_id).toBe(101);
    expect(route.request().postDataJSON()).not.toHaveProperty("subject_id");
    return route.fulfill({ status: 403, json: { code: "ACCESS_DENIED" } });
  });
  await page.getByRole("button", { name: "Gửi đề xuất", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "không có quyền truy cập",
  );
  expect(proposals).toBe(1);
  await expect(
    page.getByLabel("Nội dung câu hỏi 1", { exact: true }),
  ).toHaveValue("Câu hỏi mới về hệ điều hành?");
  expect(state.operations).not.toContain("GET /sessions/my-enrolled-subjects");
});

for (const scenario of [
  "empty",
  "history",
  "missing-permission",
  "forbidden",
] as const) {
  test(`blocks new proposals when course classes are ${scenario}`, async ({
    page,
  }) => {
    const state = academicState();
    await installAcademicMock(page, state);
    const data =
      scenario === "history"
        ? academicCourseClasses.filter((item) => item.can_propose === false)
        : scenario === "missing-permission"
          ? [
              {
                course_class_id: 400,
                class_code: "171400",
                active_semester: true,
              },
            ]
          : [];
    await page.route("**/sessions/my-enrolled-course-classes", (route) =>
      route.fulfill({
        status: scenario === "forbidden" ? 403 : 200,
        json: {
          code: scenario === "forbidden" ? "ACCESS_DENIED" : "1000",
          data,
        },
      }),
    );
    await signIn(page);
    await goTo(page, "/submissions/new");
    if (scenario === "forbidden")
      await expect(page.getByRole("alert")).toContainText(
        "không có quyền truy cập",
      );
    else
      await expect(page.getByRole("status")).toContainText(
        "Không có lớp học phần được phép đề xuất",
      );
    await expect(
      page.getByRole("button", { name: "Gửi đề xuất", exact: true }),
    ).toBeDisabled();
    expect(state.operations).not.toContain("GET /subjects");
    expect(state.operations).not.toContain("POST /sessions/propose");
  });
}

test("shows historical classes but only enables explicitly permitted classes for new proposals", async ({
  page,
}) => {
  const state = academicState();
  await installAcademicMock(page, state);
  await signIn(page);
  await goTo(page, "/submissions/new");
  const select = page.getByLabel("Lớp học phần", { exact: true });
  await expect(select.locator("option[value='100']")).toHaveJSProperty(
    "disabled",
    false,
  );
  await expect(select.locator("option[value='101']")).toHaveJSProperty(
    "disabled",
    false,
  );
  await expect(select.locator("option[value='200']")).toHaveJSProperty(
    "disabled",
    true,
  );
  await expect(select.locator("option[value='300']")).toHaveJSProperty(
    "disabled",
    true,
  );
  await expect(select.locator("option[value='200']")).toContainText("20252");
  await page.getByLabel("Tiêu đề bộ câu hỏi").fill("Không gửi vào lớp lịch sử");
  await fillQuestion(page);
  // Even a DOM change cannot turn a disabled historical option into permission.
  await select
    .locator("option[value='200']")
    .evaluate((option: HTMLOptionElement) => {
      option.disabled = false;
    });
  await select.selectOption("200");
  await page.getByRole("button", { name: "Gửi đề xuất", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Chọn lớp học phần được phép đề xuất",
  );
  expect(state.operations).not.toContain("POST /sessions/propose");
});

test("preserves an existing historical class on a content edit even when enrollment lookup fails", async ({
  page,
}) => {
  const state = academicState();
  state.sessions.get(60)!.course_class_id = 200;
  await installAcademicMock(page, state);
  await page.route("**/sessions/my-enrolled-course-classes", (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await signIn(page);
  await goTo(page, "/submissions/60/edit");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Lớp học phần", { exact: true })).toHaveValue(
    "200",
  );
  await page
    .getByLabel("Tiêu đề bộ câu hỏi")
    .fill("Sửa nội dung, giữ nguyên lớp cũ");
  const update = page.waitForRequest(
    (request) =>
      request.method() === "PUT" &&
      request.url().endsWith("/sessions/my-submissions/60"),
  );
  await page
    .getByRole("button", { name: "Lưu bộ câu hỏi", exact: true })
    .click();
  const payload = (await update).postDataJSON();
  expect(payload).not.toHaveProperty("course_class_id");
  expect(payload).not.toHaveProperty("subject_id");
  await expect(page).toHaveURL("/submissions/60");
  await expect(
    page.getByText("Lớp 161146 · Học kỳ 20252 · Chờ duyệt", { exact: true }),
  ).toBeVisible();
  expect(state.sessions.get(60)!.course_class_id).toBe(200);
  expect(state.operations).not.toContain("GET /sessions/my-submissions");
});

test("uploads question images as URL arrays and blocks submission while uploading", async ({
  page,
}) => {
  const state = academicState();
  await installAcademicMock(page, state);
  await signIn(page);
  await goTo(page, "/submissions/new");
  await page.getByLabel("Tiêu đề bộ câu hỏi").fill("Bộ câu hỏi có ảnh");
  await page.getByLabel("Lớp học phần", { exact: true }).selectOption("100");
  await fillQuestion(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/medias/upload?purpose=QUESTION", async (route) => {
    await pending;
    await route.fulfill({
      json: {
        code: "1000",
        data: {
          object_key: "test/question.png",
          url: "https://images.example.test/question.png",
          media_type: "IMAGE",
        },
      },
    });
  });
  const uploaded = page.waitForRequest("**/medias/upload?purpose=QUESTION");
  await page.getByLabel("Chọn ảnh câu 1").setInputFiles({
    name: "question.png",
    mimeType: "image/png",
    buffer: Buffer.from("mock-image"),
  });
  await uploaded;
  await expect(
    page.getByRole("button", { name: "Gửi đề xuất", exact: true }),
  ).toBeDisabled();
  release();
  await expect(
    page.getByLabel("Ảnh minh họa câu 1", { exact: true }),
  ).toHaveValue("https://images.example.test/question.png");
  const request = page.waitForRequest("**/sessions/propose");
  await page.getByRole("button", { name: "Gửi đề xuất", exact: true }).click();
  expect((await request).postDataJSON().questions[0].media_urls).toEqual([
    "https://images.example.test/question.png",
  ]);
  await expect(page).toHaveURL("/submissions/100");
});

test("does not expose edits for processed collections or another owner", async ({
  page,
}) => {
  const state = academicState();
  state.sessions.get(60)!.status = "REVIEWING";
  await installAcademicMock(page, state);
  await signIn(page);
  await goTo(page, "/submissions/60");
  await expect(
    page.getByText(
      "Bộ câu hỏi không ở trạng thái chờ duyệt hoặc chưa có thông tin trạng thái.",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Chỉnh sửa bộ câu hỏi", exact: true }),
  ).toHaveCount(0);
  await goTo(page, "/submissions/60/edit");
  await expect(page.getByRole("alert")).toContainText(
    "đang chờ duyệt của chính bạn",
  );
  await goTo(page, "/submissions/70");
  await expect(page.getByRole("alert")).toContainText(
    "không có quyền truy cập",
  );
  expect(
    state.operations.some((operation) => operation.startsWith("PUT /sessions")),
  ).toBe(false);
});

test("does not grant edit/delete when owner detail omits status", async ({
  page,
}) => {
  const state = academicState();
  await installAcademicMock(page, state);
  await page.route("**/sessions/my-submissions/60", (route) =>
    route.fulfill({
      json: {
        code: "1000",
        data: { session_id: 60, title: "Thiếu trạng thái" },
      },
    }),
  );
  await signIn(page);
  await goTo(page, "/submissions/60");
  await expect(
    page.getByText("Chưa có trạng thái", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Chỉnh sửa bộ câu hỏi", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Xóa bộ câu hỏi", exact: true }),
  ).toHaveCount(0);
  await goTo(page, "/submissions/60/edit");
  await expect(page.getByRole("alert")).toContainText(
    "đang chờ duyệt của chính bạn",
  );
  expect(state.operations).not.toContain("GET /sessions/my-submissions");
});

test("practices single/multiple answers and reviews only server grading", async ({
  page,
}, info) => {
  const state = academicState();
  await installAcademicMock(page, state);
  await signIn(page);
  await goTo(page, "/practice/50");
  await expect(
    page.getByText("Giải thích học thuật cho câu 501.", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Gửi đáp án", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("ít nhất một phương án");
  const first = page.waitForRequest("**/questions/501/answer");
  await page
    .getByRole("form", { name: "Trả lời câu hỏi" })
    .getByRole("checkbox")
    .first()
    .check();
  await page.getByRole("button", { name: "Gửi đáp án", exact: true }).click();
  expect((await first).postDataJSON()).toEqual({
    selected_options: ["A"],
    question_updated_at: "2026-10-27T03:00:00Z",
  });
  await expect(
    page.getByText("Chính xác! Kết quả từ máy chủ.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Câu tiếp", exact: true }).click();
  const options = page
    .getByRole("form", { name: "Trả lời câu hỏi" })
    .getByRole("checkbox");
  await options.nth(0).check();
  await options.nth(2).check();
  const second = page.waitForRequest("**/questions/502/answer");
  await page.getByRole("button", { name: "Gửi đáp án", exact: true }).click();
  expect((await second).postDataJSON().selected_options).toEqual(["A", "C"]);
  await expect(
    page.getByText("Đã trả lời 2/2 câu", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Kết quả luyện tập", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Chính xác! Kết quả từ máy chủ.", { exact: true }),
  ).toHaveCount(2);
  await expect(
    page.getByText("Lựa chọn trong lượt này: A, C", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("practice-results.png"),
    fullPage: true,
  });
});

test("restores answered state without fabricating an old selection or score", async ({
  page,
}) => {
  const state = academicState();
  state.answers.set("101:501", ["B"]);
  await installAcademicMock(page, state);
  await signIn(page);
  await goTo(page, "/practice/50");
  await expect(
    page.getByText("Bạn đã trả lời câu hỏi này.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Chưa có thông tin lựa chọn và kết quả đúng/sai của lượt trước.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Chính xác! Kết quả từ máy chủ.", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Gửi đáp án", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Giải thích học thuật cho câu 501.", { exact: true }),
  ).toBeVisible();
});

test("412 requires explicit reload, resets choices and sends the fresh timestamp", async ({
  page,
}) => {
  const state = academicState();
  await installAcademicMock(page, state);
  await signIn(page);
  await goTo(page, "/practice/50");
  await page
    .getByRole("form", { name: "Trả lời câu hỏi" })
    .getByRole("checkbox")
    .first()
    .check();
  state.sessions.get(50)!.questions[0].updated_at = "2026-10-27T04:00:00Z";
  await page.getByRole("button", { name: "Gửi đáp án", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Câu hỏi đã thay đổi");
  expect(
    state.operations.filter(
      (operation) => operation === "POST /questions/501/answer",
    ),
  ).toHaveLength(1);
  await expect(
    page.getByRole("button", { name: "Gửi đáp án", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Tải lại câu hỏi", exact: true })
    .click();
  const option = page
    .getByRole("form", { name: "Trả lời câu hỏi" })
    .getByRole("checkbox")
    .first();
  await expect(option).not.toBeChecked();
  await option.check();
  const request = page.waitForRequest("**/questions/501/answer");
  await page.getByRole("button", { name: "Gửi đáp án", exact: true }).click();
  expect((await request).postDataJSON().question_updated_at).toBe(
    "2026-10-27T04:00:00Z",
  );
  await expect(
    page.getByText("Chính xác! Kết quả từ máy chủ.", { exact: true }),
  ).toBeVisible();
});

test("409 never automatically resubmits and reload reveals server state", async ({
  page,
}) => {
  const state = academicState();
  await installAcademicMock(page, state);
  await signIn(page);
  await goTo(page, "/practice/50");
  await page
    .getByRole("form", { name: "Trả lời câu hỏi" })
    .getByRole("checkbox")
    .first()
    .check();
  state.answers.set("101:501", ["A"]);
  await page.getByRole("button", { name: "Gửi đáp án", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Câu hỏi này đã được trả lời",
  );
  await page
    .getByRole("button", { name: "Tải lại câu hỏi", exact: true })
    .click();
  await expect(
    page.getByText("Bạn đã trả lời câu hỏi này.", { exact: true }),
  ).toBeVisible();
  expect(
    state.operations.filter(
      (operation) => operation === "POST /questions/501/answer",
    ),
  ).toHaveLength(1);
});

test("question ratings use 0–4 and render server statistics/results", async ({
  page,
}) => {
  const state = academicState();
  await installAcademicMock(page, state);
  await signIn(page);
  await goTo(page, "/practice/50");
  await page
    .getByRole("button", { name: "Xem thống kê và đánh giá", exact: true })
    .click();
  await expect(page.getByText("75%", { exact: true })).toBeVisible();
  await page
    .getByLabel("Mức đánh giá câu hỏi", { exact: true })
    .selectOption("0");
  await page.getByLabel("Báo câu hỏi có lỗi", { exact: false }).check();
  await page
    .getByLabel("Nhận xét", { exact: true })
    .fill("Cần kiểm tra cách diễn đạt.");
  const request = page.waitForRequest("**/questions/501/rate");
  await page.getByRole("button", { name: "Gửi đánh giá", exact: true }).click();
  expect((await request).postDataJSON()).toEqual({
    rating: 0,
    is_error: true,
    comment: "Cần kiểm tra cách diễn đạt.",
  });
  await expect(page.getByRole("status")).toContainText("Trung bình mới: 3.75");
});

for (const path of [
  "/lecturer/reviews",
  "/lecturer/reviews/70",
  "/lecturer/exams",
  "/lecturer/exams/new",
]) {
  test(`student is denied ${path} before lecturer APIs run`, async ({
    page,
  }) => {
    const state = academicState();
    await installAcademicMock(page, state);
    await signIn(page);
    await goTo(page, path);
    await expect(page.getByRole("alert")).toContainText("dành cho giảng viên");
    expect(
      state.operations.some((operation) =>
        /\/lecturer\/|\/exams|GET \/sessions\/70$|\/sessions\/pending/.test(
          operation,
        ),
      ),
    ).toBe(false);
  });
}

test("review opens only by explicit action and approve/reject never reopen it automatically", async ({
  page,
}) => {
  const state = academicState();
  await installAcademicMock(page, state, "LECTURER");
  await signIn(page);
  await goTo(page, "/lecturer/reviews/70");
  await expect(
    page.getByRole("button", {
      name: "Mở phiên và bắt đầu duyệt",
      exact: true,
    }),
  ).toBeVisible();
  expect(state.reviewOpens).toBe(0);
  await page
    .getByRole("button", { name: "Mở phiên và bắt đầu duyệt", exact: true })
    .click();
  await expect(
    page.getByText("Cảnh báo trùng lặp từ hệ thống", { exact: true }),
  ).toBeVisible();
  expect(state.reviewOpens).toBe(1);
  await page.getByLabel("Chọn câu 1 để duyệt").check();
  await page
    .getByRole("button", { name: "Duyệt câu đã chọn", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await expect(
    page.getByText("Đã ghi quyết định phê duyệt.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Chọn câu 2 để duyệt").check();
  await page
    .getByLabel("Lý do từ chối (tùy chọn)")
    .fill("Cần bổ sung dẫn chứng.");
  const request = page.waitForRequest("**/sessions/reject");
  await page
    .getByRole("button", { name: "Từ chối câu đã chọn", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  expect((await request).postDataJSON()).toEqual({
    question_ids: [702],
    reason: "Cần bổ sung dẫn chứng.",
  });
  await expect(
    page.getByText("Không còn câu hỏi chờ xử lý.", { exact: false }),
  ).toBeVisible();
  expect(state.reviewOpens).toBe(1);
});

test("complete review warns that remaining pending questions will be rejected", async ({
  page,
}) => {
  const state = academicState();
  await installAcademicMock(page, state, "LECTURER");
  await signIn(page);
  await goTo(page, "/lecturer/reviews/70");
  await page
    .getByRole("button", { name: "Mở phiên và bắt đầu duyệt", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Chốt hoàn tất duyệt", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Tất cả câu hỏi còn PENDING",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Hủy", exact: true })
    .click();
  expect(
    state.sessions
      .get(70)!
      .questions.every((question) => question.status === "PENDING"),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Chốt hoàn tất duyệt", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Chốt và từ chối câu còn chờ", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Đã chốt hoàn tất duyệt phiên" }),
  ).toBeVisible();
  expect(state.sessions.get(70)!.status).toBe("RESOLVED");
  expect(state.reviewOpens).toBe(1);
});

test("lecturer edits through the supported question endpoint without auto-approval by default", async ({
  page,
}) => {
  const state = academicState();
  await installAcademicMock(page, state, "LECTURER");
  await signIn(page);
  await goTo(page, "/lecturer/reviews/70");
  await page
    .getByRole("button", { name: "Mở phiên và bắt đầu duyệt", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Biên tập câu 1", exact: true })
    .click();
  await page
    .getByLabel("Nội dung câu hỏi 1", { exact: true })
    .fill("Nội dung biên tập chính xác hơn");
  const request = page.waitForRequest(
    (request) =>
      request.url().endsWith("/questions/701") && request.method() === "PUT",
  );
  await page.getByRole("button", { name: "Lưu câu hỏi", exact: true }).click();
  const payload = (await request).postDataJSON();
  expect(payload.auto_approve).toBe(false);
  expect(payload.content).toBe("Nội dung biên tập chính xác hơn");
  expect(payload).not.toHaveProperty("media_urls");
  await expect(
    page.getByText("Nội dung biên tập chính xác hơn", { exact: true }),
  ).toBeVisible();
  expect(state.reviewOpens).toBe(1);
});

test("lecturer generates an exam with classes/distribution and exports a server download link", async ({
  page,
}) => {
  const state = academicState();
  await installAcademicMock(page, state, "LECTURER");
  await signIn(page);
  await goTo(page, "/lecturer/exams/new");
  await page.getByLabel("Môn học", { exact: true }).selectOption("10");
  await page.getByLabel("Tiêu đề đề thi (tùy chọn)").fill("Đề ôn tập mới");
  await page.getByLabel("Số câu hỏi (tùy chọn)").fill("2");
  await page.getByLabel("171146 · Hệ điều hành", { exact: true }).check();
  await page.getByLabel("Tùy chỉnh phân bổ độ khó").check();
  await page.getByLabel("Tỷ lệ dễ", { exact: true }).fill("0.4");
  await page.getByRole("button", { name: "Tạo đề thi", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("tổng bằng 1");
  await page.getByLabel("Tỷ lệ dễ", { exact: true }).fill("0.3");
  await page
    .getByRole("button", { name: "Thêm trọng số chủ đề", exact: true })
    .click();
  await page.getByRole("combobox", { name: "Chủ đề 1", exact: true }).selectOption("11");
  await page.getByLabel("Trọng số 1", { exact: true }).fill("1");
  const request = page.waitForRequest("**/exams/generate");
  await page.getByRole("button", { name: "Tạo đề thi", exact: true }).click();
  expect((await request).postDataJSON()).toMatchObject({
    subject_id: 10,
    class_ids: [100],
    question_count: 2,
    difficulty_distribution: {
      easy: 0.3,
      medium: 0.5,
      hard: 0.2,
      unclassified: 0,
    },
    topic_weights: { "11": 1 },
    shuffle_options: true,
    include_answer_key: false,
  });
  await expect(page).toHaveURL("/lecturer/exams/900");
  await expect(
    page.getByRole("heading", { name: "Đề ôn tập mới", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Định dạng", { exact: true }).selectOption("xlsx");
  await page.getByLabel("Kèm đáp án", { exact: true }).check();
  const exported = page.waitForRequest((request) =>
    request.url().includes("/exams/900/export?"),
  );
  await page
    .getByRole("button", { name: "Tạo tệp tải về", exact: true })
    .click();
  const url = new URL((await exported).url());
  expect(url.searchParams.get("include_answer_key")).toBe("true");
  expect(url.searchParams.get("format")).toBe("xlsx");
  await expect(
    page.getByRole("link", { name: "Tải tệp XLSX", exact: true }),
  ).toHaveAttribute("href", "http://127.0.0.1:4173/mock-export/900.xlsx");
});

test("lecturer exports a selected subject bank without inventing topic APIs", async ({
  page,
}) => {
  const state = academicState();
  await installAcademicMock(page, state, "LECTURER");
  await signIn(page);
  await goTo(page, "/lecturer/exams");
  await page.getByLabel("Môn học", { exact: true }).selectOption("10");
  await page.getByLabel("Kèm đáp án và lời giải", { exact: true }).check();
  const request = page.waitForRequest((request) =>
    request.url().includes("/lecturer/questions/export?"),
  );
  await page
    .getByRole("button", { name: "Tạo tệp tải về", exact: true })
    .click();
  expect(new URL((await request).url()).searchParams.get("subject_id")).toBe(
    "10",
  );
  await expect(
    page.getByRole("link", { name: "Tải tệp PDF", exact: true }),
  ).toBeVisible();
});

test("academic errors and empty lists expose recovery, without a fabricated practice history", async ({
  page,
}) => {
  const state = academicState();
  await installAcademicMock(page, state);
  await signIn(page);
  await page.route("**/sessions/50/questions", (route) =>
    route.fulfill({ status: 403, json: { code: "ACCESS_DENIED" } }),
  );
  await goTo(page, "/practice/50");
  await expect(page.getByRole("alert")).toContainText(
    "không có quyền truy cập",
  );
  await page.route("**/api/v1/search?**", (route) =>
    route.fulfill({ status: 503, json: { code: "ERROR" } }),
  );
  await goTo(page, "/question-bank");
  await expect(page.getByRole("alert")).toContainText("Đã có lỗi xảy ra");
  await page.unroute("**/api/v1/search?**");
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ôn tập bộ lập lịch CPU", exact: true }),
  ).toBeVisible();
  await goTo(page, "/submissions?status=RESOLVED");
  await expect(
    page.getByRole("heading", { name: "Ý tưởng mới đang chờ bạn" }),
  ).toBeVisible();
  expect(
    state.operations.some((operation) =>
      /\/practice-sessions|\/quiz|\/history/.test(operation),
    ),
  ).toBe(false);
});

test("academic pages remain responsive across bank, editor, practice, review and exams", async ({
  page,
}) => {
  const state = academicState();
  await installAcademicMock(page, state, "LECTURER");
  await signIn(page);
  for (const [path, heading] of [
    ["/question-bank", "Ngân hàng câu hỏi"],
    ["/submissions/new", "Tạo bộ câu hỏi"],
    ["/practice/50", "Ôn tập bộ lập lịch CPU"],
    ["/lecturer/reviews/70", "Duyệt phiên #70"],
    ["/lecturer/exams/new", "Tạo đề thi tự động"],
    ["/lecturer/exams/80", "Đề thi ôn tập học phần"],
  ]) {
    await goTo(page, path);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await expect
        .poll(
          () =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          { message: `${path} at ${width}px` },
        )
        .toBe(true);
    }
  }
});

test("changing review target clears old selections and requires a new explicit open", async ({
  page,
}) => {
  const state = academicState();
  await installAcademicMock(page, state, "LECTURER");
  await signIn(page);
  await goTo(page, "/lecturer/reviews/70");
  await page
    .getByRole("button", { name: "Mở phiên và bắt đầu duyệt", exact: true })
    .click();
  await page.getByLabel("Chọn câu 1 để duyệt").check();
  await goTo(page, "/lecturer/reviews/60");
  await expect(
    page.getByRole("button", {
      name: "Mở phiên và bắt đầu duyệt",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Câu hỏi cần thẩm định thứ nhất?", { exact: true }),
  ).toHaveCount(0);
  expect(state.reviewOpens).toBe(1);
  await page
    .getByRole("button", { name: "Mở phiên và bắt đầu duyệt", exact: true })
    .click();
  await expect(
    page.getByText("Câu hỏi đang chờ duyệt của tôi?", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Chọn câu 1 để duyệt")).not.toBeChecked();
  expect(state.reviewOpens).toBe(2);
});
