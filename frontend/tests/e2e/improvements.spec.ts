import { test, expect, signIn, ok, profile, openNavigation } from "./fixtures";
import { goTo, socialState, installSocialMock } from "./social-fixture";
import { academicState, installAcademicMock } from "./academic-fixture";
import type { Page } from "@playwright/test";

async function lecturer(page: Page) {
  await page.route("**/api/v1/users/me", (route) =>
    route.fulfill({ json: ok({ ...profile, role: "LECTURER" }) }),
  );
}
const course = {
  course_class_id: 120,
  class_code: "171200",
  subject_id: 10,
  subject_code: "IT3070",
  subject_name: "Hệ điều hành",
  semester_name: "20261",
  lecturer_id: 101,
  lecturer_name: profile.full_name,
  total_students: 1,
};

test("notification destinations use typed targets and reject external or unsupported URLs", async ({
  page,
}) => {
  await signIn(page);
  const targets = await page.evaluate(async () => {
    const path = "/src/lib/notificationTarget.ts";
    const { notificationDestination, supportedDestination } = await import(
      /* @vite-ignore */ path
    );
    return {
      routes: [
        notificationDestination({ type: "POST", target_id: 7 }),
        notificationDestination({ type: "CONVERSATION", target_id: 8 }),
        notificationDestination({ type: "SESSION", target_id: 9 }),
        notificationDestination({ type: "USER", target_id: 10 }),
      ],
      blocked: [
        "https://outside.test/",
        "//outside.test/",
        "/admin/users",
        "/unknown",
        "/\\outside.test",
      ].map(supportedDestination),
    };
  });
  expect(targets.routes).toEqual([
    "/posts/7",
    "/chat?id=8",
    "/practice/9",
    "/users/10",
  ]);
  expect(targets.blocked).toEqual(Array(5).fill(undefined));
});

test("notifications open a documented target without a supplied URL", async ({
  page,
}) => {
  const state = socialState();
  await installSocialMock(page, state);
  await page.route("**/api/v1/notifications**", (route) =>
    route.fulfill({
      json: ok(
        route.request().method() === "GET"
          ? {
              items: [
                {
                  notification_id: 11,
                  title: "Thảo luận mới",
                  target: { type: "POST", target_id: 10 },
                },
              ],
              unread_count: 1,
            }
          : {},
      ),
    }),
  );
  await signIn(page);
  await goTo(page, "/notifications");
  await page.getByRole("link", { name: "Xem chi tiết", exact: true }).click();
  await expect(page).toHaveURL("/posts/10");
  await expect(
    page.getByText("Cùng thảo luận về cấu trúc dữ liệu nhé!", { exact: true }),
  ).toBeVisible();
});

test("quiet hours submit the default times displayed by the form", async ({
  page,
}) => {
  let body: unknown;
  await page.route("**/api/v1/settings/push", (route) => {
    if (route.request().method() === "PUT")
      body = route.request().postDataJSON();
    return route.fulfill({ json: ok({ push_enabled: true, categories: {} }) });
  });
  await signIn(page);
  await goTo(page, "/settings/notifications");
  await page.getByLabel("Bật khung giờ yên tĩnh").check();
  await expect(page.getByLabel("Bắt đầu")).toHaveValue("22:00");
  await page.getByRole("button", { name: "Lưu cài đặt", exact: true }).click();
  await expect(page.getByText("Đã lưu cài đặt.")).toBeVisible();
  expect(body).toMatchObject({
    quiet_hours: { enabled: true, start_time: "22:00", end_time: "07:00" },
  });
});

test("report dialog contains keyboard focus, restores it, and submits contract enums", async ({
  page,
}) => {
  const state = socialState();
  await installSocialMock(page, state);
  let body: unknown;
  await page.route("**/api/v1/report", (route) => {
    body = route.request().postDataJSON();
    return route.fulfill({ json: ok({ report_id: 1 }) });
  });
  await signIn(page);
  await goTo(page, "/posts/10");
  const trigger = page.getByRole("button", { name: "Báo cáo", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Báo cáo vi phạm" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  expect(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByLabel("Lý do").selectOption("HATE_STATEMENT");
  await dialog
    .getByRole("button", { name: "Gửi báo cáo", exact: true })
    .click();
  await expect(page.getByText("Đã gửi báo cáo")).toBeVisible();
  expect(body).toMatchObject({
    target_type: "POST",
    target_id: 10,
    violation_type: "HATE_STATEMENT",
  });
});

test("device revocation and record deletion use different documented operations", async ({
  page,
}) => {
  const operations: string[] = [];
  await page.route("**/api/v1/devices**", (route) => {
    const request = route.request();
    operations.push(`${request.method()} ${new URL(request.url()).pathname}`);
    return route.fulfill({
      json: ok(
        request.method() === "GET"
          ? {
              devices: [
                {
                  device_id: "peer-device",
                  device_name: "Chrome test",
                  platform: "WEB",
                  is_active: true,
                },
              ],
            }
          : null,
      ),
    });
  });
  await signIn(page);
  await goTo(page, "/settings/devices");
  await page
    .getByRole("button", { name: "Thu hồi phiên", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Thu hồi phiên", exact: true })
    .click();
  await expect(
    page.getByText("Máy chủ đã xác nhận thu hồi phiên của thiết bị."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xóa bản ghi", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xóa bản ghi", exact: true })
    .click();
  await expect(
    page.getByText("Đã xóa bản ghi thiết bị.", { exact: true }),
  ).toBeVisible();
  expect(operations).toContain("POST /api/v1/devices/peer-device/logout");
  expect(operations).toContain("DELETE /api/v1/devices/peer-device");
});

test("revoking the current device clears the local session", async ({
  page,
}) => {
  await page.route("**/api/v1/devices**", (route) =>
    route.fulfill({
      json: ok(
        route.request().method() === "GET"
          ? {
              devices: [
                {
                  device_id: "current",
                  device_name: "This browser",
                  is_current_device: true,
                },
              ],
            }
          : null,
      ),
    }),
  );
  await signIn(page);
  await goTo(page, "/settings/devices");
  await page
    .getByRole("button", { name: "Thu hồi phiên", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Bạn cũng sẽ đăng xuất");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Thu hồi phiên", exact: true })
    .click();
  await expect(page).toHaveURL("/login");
});

test("lecturer creates a class, reads its roster and sees partial enrollment results", async ({
  page,
}, info) => {
  await lecturer(page);
  let created = false;
  let createBody: unknown;
  let enrollBody: unknown;
  await page.route("**/api/v1/subjects", (route) =>
    route.fulfill({
      json: ok([{ subject_id: 10, code: "IT3070", name: "Hệ điều hành" }]),
    }),
  );
  await page.route("**/api/v1/lecturer/course-classes**", (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (method === "POST" && path.endsWith("/students")) {
      enrollBody = route.request().postDataJSON();
      return route.fulfill({
        json: ok({
          total_enrolled: 1,
          already_enrolled_count: 1,
          not_found_count: 1,
          not_found_codes: ["missing"],
        }),
      });
    }
    if (method === "POST") {
      created = true;
      createBody = route.request().postDataJSON();
      return route.fulfill({ json: ok(course) });
    }
    if (path.endsWith("/my-classes"))
      return route.fulfill({ json: ok(created ? [course] : []) });
    if (path.endsWith("/students"))
      return route.fulfill({
        json: ok([
          {
            user_id: 202,
            student_code: "20230001",
            full_name: "Sinh viên kiểm thử",
            email: "student@example.test",
          },
        ]),
      });
    return route.fulfill({ json: ok(course) });
  });
  await signIn(page);
  await goTo(page, "/lecturer/course-classes");
  await page
    .getByRole("button", { name: "Tạo lớp học phần", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Mã lớp học phần").fill("171200");
  await dialog.getByLabel("Môn học", { exact: true }).selectOption("10");
  await dialog.getByRole("button", { name: "Tạo lớp", exact: true }).click();
  await expect(page).toHaveURL("/lecturer/course-classes/120");
  await expect(
    page.getByText("Sinh viên kiểm thử", { exact: true }),
  ).toBeVisible();
  expect(createBody).toEqual({ class_code: "171200", subject_id: 10 });
  await page
    .getByRole("button", { name: "Thêm sinh viên", exact: true })
    .click();
  await page
    .getByLabel("Danh sách mã số sinh viên")
    .fill("20230001, 20230001\n20230002;missing");
  await page
    .getByRole("button", { name: "Ghi danh sinh viên", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Kiểm tra lại: missing");
  expect(enrollBody).toEqual({
    student_codes: ["20230001", "20230002", "missing"],
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: info.outputPath("class-roster.png"),
    fullPage: true,
  });
});

test("students cannot invoke class management through a lecturer route", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/lecturer/course-classes"))
      calls.push(request.url());
  });
  await signIn(page);
  await goTo(page, "/lecturer/course-classes/120");
  await expect(
    page.getByText("Chức năng này dành cho giảng viên."),
  ).toBeVisible();
  expect(calls).toEqual([]);
});

test("a lecturer cannot load or modify another lecturer's roster from the UI", async ({
  page,
}) => {
  await lecturer(page);
  let rosterCalls = 0;
  await page.route("**/api/v1/lecturer/course-classes/**", (route) => {
    if (route.request().url().endsWith("/students")) rosterCalls++;
    return route.fulfill({ json: ok({ ...course, lecturer_id: 999 }) });
  });
  await signIn(page);
  await goTo(page, "/lecturer/course-classes/120");
  await expect(
    page.getByText(
      "Chỉ giảng viên phụ trách mới có thể quản lý danh sách sinh viên tại đây.",
    ),
  ).toBeVisible();
  expect(rosterCalls).toBe(0);
  await expect(
    page.getByRole("button", { name: "Thêm sinh viên", exact: true }),
  ).toHaveCount(0);
});

test("profile image uploads use the right purpose and apply only when the profile is saved", async ({
  page,
}) => {
  let saved: unknown;
  let purpose: string | null = null;
  let uploaded = false;
  await page.route("**/api/v1/users/me", (route) => {
    if (route.request().method() === "PUT") {
      saved = route.request().postDataJSON();
      return route.fulfill({
        json: ok({
          ...profile,
          avatar_url: "http://127.0.0.1:4173/test-avatar.png",
        }),
      });
    }
    return route.fulfill({ json: ok(profile) });
  });
  await page.route("**/test-avatar.png", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1kAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  await page.route("**/api/v1/medias/upload?**", (route) => {
    purpose = new URL(route.request().url()).searchParams.get("purpose");
    uploaded = true;
    return route.fulfill({
      json: ok({
        url: "http://127.0.0.1:4173/test-avatar.png",
        media_type: "IMAGE",
        object_key: "test/avatar.png",
      }),
    });
  });
  await signIn(page);
  await goTo(page, "/settings/profile");
  await page
    .getByLabel("Tải ảnh đại diện", { exact: true })
    .setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: Buffer.from("image"),
    });
  await expect(page.getByAltText("Xem trước ảnh đại diện")).toBeVisible();
  expect(uploaded).toBe(true);
  expect(saved).toBeUndefined();
  expect(purpose).toBe("AVATAR");
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page).toHaveURL("/me");
  expect(saved).toEqual({
    avatar_url: "http://127.0.0.1:4173/test-avatar.png",
  });
});

test("question discussion uses QUESTION targets and has a separate comment cache", async ({
  page,
}) => {
  const state = academicState();
  await installAcademicMock(page, state);
  const bodies: unknown[] = [];
  await page.route("**/api/v1/comments**", (route) => {
    if (route.request().method() === "POST") {
      bodies.push(route.request().postDataJSON());
      return route.fulfill({ json: ok({ comment_id: 900 }) });
    }
    expect(new URL(route.request().url()).searchParams.get("target_type")).toBe(
      "QUESTION",
    );
    return route.fulfill({
      json: ok({ items: [], pagination: { has_next: false } }),
    });
  });
  await signIn(page);
  await goTo(page, "/question-bank?type=QUESTION");
  await page
    .getByRole("button", { name: "Xem chi tiết câu hỏi", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Thảo luận cùng cộng đồng", exact: true })
    .click();
  await page
    .getByLabel("Nội dung bình luận", { exact: true })
    .fill("Mình muốn trao đổi cách giải.");
  await page
    .getByRole("button", { name: "Gửi bình luận", exact: true })
    .click();
  await expect.poll(() => bodies.length).toBe(1);
  expect(bodies[0]).toMatchObject({
    target_type: "QUESTION",
    content: "Mình muốn trao đổi cách giải.",
  });
});

test("search renders all documented entity types without a standalone question GET", async ({
  page,
}) => {
  let unsupported = 0;
  await page.route("**/api/v1/search?**", (route) =>
    route.fulfill({
      json: ok({
        items: [
          {
            type: "QUESTION",
            question: {
              question_id: 1,
              question_code: "Q1",
              content: "Câu hỏi tìm kiếm",
              options: [{ key: "A", text: "Phương án A" }],
            },
          },
          {
            type: "SESSION",
            session: { session_id: 2, title: "Bộ tìm kiếm", question_count: 3 },
          },
          {
            type: "SUBJECT",
            subject: {
              subject_id: 10,
              subject_code: "IT3070",
              subject_name: "Hệ điều hành",
            },
          },
        ],
        pagination: { has_next: false },
      }),
    }),
  );
  page.on("request", (request) => {
    if (/\/questions\/\d+$/.test(request.url())) unsupported++;
  });
  await signIn(page);
  await goTo(page, "/search?query=CPU&type=ALL");
  await expect(
    page.getByRole("heading", { name: "Bộ tìm kiếm", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Hệ điều hành", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Xem chi tiết câu hỏi", exact: true })
    .click();
  await expect(page.getByText("Phương án A", { exact: true })).toBeVisible();
  expect(unsupported).toBe(0);
});

test("feed shows new count and safely opens session activities", async ({
  page,
}) => {
  const state = socialState();
  await installSocialMock(page, state);
  await page.route("**/api/v1/activity-feeds/new-count?**", (route) =>
    route.fulfill({ json: ok({ new_count: 2 }) }),
  );
  await page.route("**/api/v1/activity-feeds?**", (route) =>
    route.fulfill({
      json: ok({
        items: [
          {
            feed_id: 1,
            target_type: "SESSION",
            target_id: 70,
            action_type: "SESSION_RESOLVED_APPROVED",
            actor: { full_name: "Thành viên" },
          },
        ],
        pagination: { has_next: false },
      }),
    }),
  );
  await signIn(page);
  await goTo(page, "/");
  await expect(
    page.getByRole("button", {
      name: "2 hoạt động mới · Cập nhật bảng tin",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Khám phá bộ câu hỏi →", exact: true }),
  ).toHaveAttribute("href", "/practice/70");
  await page.getByRole("button", { name: "Video", exact: true }).click();
  await expect(
    page.getByText("Đang lọc trong các hoạt động đã tải.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Chưa có hoạt động phù hợp trong phần đã tải",
      exact: true,
    }),
  ).toBeVisible();
});

test("chat keeps drafts per conversation and supports mobile list-to-thread navigation", async ({
  page,
}) => {
  await page.route("**/api/v1/conversations**", (route) =>
    route.fulfill({
      json: ok(
        route.request().url().includes("/messages")
          ? { messages: [], pagination: { has_next: false } }
          : {
              items: [
                { conversation_id: 7, display_name: "Bạn A" },
                { conversation_id: 8, display_name: "Bạn B" },
              ],
              pagination: { has_next: false },
            },
      ),
    }),
  );
  await signIn(page);
  await goTo(page, "/chat?id=7");
  await page.getByLabel("Nội dung tin nhắn").fill("Bản soạn cho A");
  await goTo(page, "/chat?id=8");
  await expect(page.getByLabel("Nội dung tin nhắn")).toHaveValue("");
  await page.getByLabel("Nội dung tin nhắn").fill("Bản soạn cho B");
  await goTo(page, "/chat?id=7");
  await expect(page.getByLabel("Nội dung tin nhắn")).toHaveValue(
    "Bản soạn cho A",
  );
  await page.setViewportSize({ width: 375, height: 812 });
  await page
    .getByRole("button", { name: "Trở về danh sách hội thoại", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Tin nhắn", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Bạn B/ }).click();
  await expect(page.getByLabel("Nội dung tin nhắn")).toHaveValue(
    "Bản soạn cho B",
  );
});

test("login returns to the intended supported route", async ({ page }) => {
  await page.route("**/api/v1/devices", (route) =>
    route.fulfill({ json: ok({ devices: [] }) }),
  );
  await page.goto("/settings/devices");
  await expect(page).toHaveURL("/login");
  await page.getByLabel("Email", { exact: true }).fill(profile.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL("/settings/devices");
});

test("navigation drawer traps focus and closes on Escape", async ({ page }) => {
  await signIn(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await openNavigation(page);
  const dialog = page.getByRole("dialog", { name: "Điều hướng SNSQB" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  expect(
    await dialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mở điều hướng", exact: true }),
  ).toBeFocused();
});
