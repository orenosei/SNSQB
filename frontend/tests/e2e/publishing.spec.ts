import { test, expect, signIn, ok, profile } from "./fixtures";
import { goTo, socialState, installSocialMock } from "./social-fixture";

test("lecturer publishing requires a subject and video and uses the documented post contract", async ({
  page,
}) => {
  const state = socialState();
  await installSocialMock(page, state);
  await page.route("**/api/v1/users/me", (route) =>
    route.fulfill({ json: ok({ ...profile, role: "LECTURER" }) }),
  );
  await page.route("**/api/v1/subjects", (route) =>
    route.fulfill({
      json: ok([{ subject_id: 10, code: "IT3070", name: "Hệ điều hành" }]),
    }),
  );
  await page.route("**/api/v1/medias/upload?**", (route) => {
    expect(new URL(route.request().url()).searchParams.get("purpose")).toBe(
      "POST",
    );
    return route.fulfill({
      json: ok({
        object_key: "test/lecture.mp4",
        url: "http://127.0.0.1:4173/test-lecture.mp4",
        media_type: "VIDEO",
        file_size: 32,
      }),
    });
  });
  let payload: unknown;
  await page.route("**/api/v1/posts", (route) => {
    payload = route.request().postDataJSON();
    return route.fulfill({ json: ok({ post_id: 100 }) });
  });
  await page.route("**/api/v1/posts/100", (route) =>
    route.fulfill({
      json: ok({
        post_id: 100,
        author: { user_id: 101, full_name: profile.full_name },
        content: "Giới thiệu thuật toán",
        post_type: "LEARNING_VIDEO",
        visibility: "PUBLIC",
        media_urls: [],
      }),
    }),
  );
  await signIn(page);
  await goTo(page, "/posts/new?type=video");
  await expect(page.getByLabel("Loại nội dung")).toHaveValue("LEARNING_VIDEO");
  await page.getByLabel("Môn học của video").selectOption("10");
  await page
    .getByLabel("Nội dung bài viết", { exact: true })
    .fill("Giới thiệu thuật toán");
  await page.getByRole("button", { name: "Đăng bài", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("ít nhất một tệp video");
  expect(payload).toBeUndefined();
  await page
    .getByLabel("Chọn tệp đính kèm")
    .setInputFiles({
      name: "lecture.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.from("test-video"),
    });
  await expect(page.getByText("lecture.mp4", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Đăng bài", exact: true }).click();
  await expect(page).toHaveURL("/posts/100");
  expect(payload).toMatchObject({
    post_type: "LEARNING_VIDEO",
    subject_id: 10,
    visibility: "PUBLIC",
    content: "Giới thiệu thuật toán",
    media_urls: [{ type: "VIDEO", key: "test/lecture.mp4" }],
  });
});

test("student cannot select lecturer publishing even from a video URL", async ({
  page,
}) => {
  const state = socialState();
  await installSocialMock(page, state);
  await signIn(page);
  await goTo(page, "/posts/new?type=video");
  await expect(page.getByLabel("Loại nội dung")).toHaveCount(0);
  await page
    .getByLabel("Nội dung bài viết", { exact: true })
    .fill("Bài viết của sinh viên");
  const posted = page.waitForRequest(
    (request) =>
      request.method() === "POST" && request.url().endsWith("/posts"),
  );
  await page.getByRole("button", { name: "Đăng bài", exact: true }).click();
  expect((await posted).postDataJSON().post_type).toBe("SOCIAL_POST");
});

test("lecturer note editor saves through lecturer-notes and refreshes displayed content", async ({
  page,
}) => {
  const state = socialState();
  await installSocialMock(page, state);
  await page.route("**/api/v1/users/me", (route) =>
    route.fulfill({ json: ok({ ...profile, role: "LECTURER" }) }),
  );
  let payload: unknown;
  await page.route("**/api/v1/posts/10/lecturer-notes", (route) => {
    payload = route.request().postDataJSON();
    state.posts.get(10)!.lecturer_note = (
      payload as { content: string }
    ).content;
    return route.fulfill({ json: ok(null) });
  });
  await signIn(page);
  await goTo(page, "/posts/10");
  await page
    .getByRole("button", { name: "Thêm nhận xét chuyên môn", exact: true })
    .click();
  await page
    .getByLabel("Nội dung nhận xét", { exact: true })
    .fill("Chú ý điều kiện biên.");
  await page.getByRole("button", { name: "Lưu nhận xét", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.locator(".lecturer-note"),
  ).toContainText("Chú ý điều kiện biên.");
  expect(payload).toEqual({ content: "Chú ý điều kiện biên." });
});

test("public profile shows server-visible contributed sessions", async ({
  page,
}) => {
  const state = socialState();
  await installSocialMock(page, state);
  await page.route("**/api/v1/users/202/sessions?**", (route) =>
    route.fulfill({
      json: ok({
        contents: [
          {
            session_id: 70,
            title: "Bộ đóng góp công khai",
            subject_name: "Hệ điều hành",
            question_counts: 3,
            status: "RESOLVED",
          },
        ],
        pagination: { has_next: false },
      }),
    }),
  );
  await signIn(page);
  await goTo(page, "/users/202");
  await page.getByRole("button", { name: "Bộ câu hỏi", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Bộ đóng góp công khai", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Mở luyện tập →", exact: true }),
  ).toHaveAttribute("href", "/practice/70");
});

test("chat preserves a published draft until a new server message is observed and never automatically resends", async ({
  page,
}) => {
  const sent: Record<string, unknown>[] = [];
  let echo = false;
  await page.exposeFunction(
    "recordTestMessage",
    (body: Record<string, unknown>) => {
      sent.push(body);
    },
  );
  // Only the transport module is replaced; UI, query lifecycle and REST history run normally.
  await page.route("**/src/features/chat/realtime.ts", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `export function connectChat(onEvent,onStatus){const timer=setTimeout(()=>onStatus(true),5);return {subscribeTyping(){return ()=>{}},send(destination,body){if(destination==='/app/chat.send')window.recordTestMessage(body);return true},close(){clearTimeout(timer)}}}`,
    }),
  );
  await page.route("**/api/v1/conversations**", (route) =>
    route.fulfill({
      json: ok(
        route.request().url().includes("/messages")
          ? {
              messages: echo
                ? [
                    {
                      message_id: 99,
                      sender_id: 101,
                      content: "Tin cần xác nhận",
                      created_at: "2026-11-03T00:00:00Z",
                    },
                  ]
                : [],
              pagination: { has_next: false },
            }
          : {
              items: [{ conversation_id: 7, display_name: "Bạn học" }],
              pagination: { has_next: false },
            },
      ),
    }),
  );
  await signIn(page);
  await goTo(page, "/chat?id=7");
  await expect(page.getByText("Đã kết nối", { exact: true })).toBeVisible();
  await page.getByLabel("Nội dung tin nhắn").fill("Tin cần xác nhận");
  const receiptCheck = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith("/conversations/7/messages"),
  );
  await page.getByRole("button", { name: "Gửi", exact: true }).click();
  await expect.poll(() => sent.length).toBe(1);
  await receiptCheck;
  await expect(page.getByLabel("Nội dung tin nhắn")).toHaveValue(
    "Tin cần xác nhận",
  );
  await expect(
    page.getByRole("button", { name: "Gửi", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Kiểm tra tin nhắn", exact: true })
    .click();
  await expect(page.getByLabel("Nội dung tin nhắn")).toHaveValue(
    "Tin cần xác nhận",
  );
  expect(sent).toHaveLength(1);
  echo = true;
  await page
    .getByRole("button", { name: "Kiểm tra tin nhắn", exact: true })
    .click();
  await expect(page.getByLabel("Nội dung tin nhắn")).toHaveValue("");
  expect(sent).toHaveLength(1);
});

test("a failed next notification page preserves loaded items and exposes retry", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/api/v1/notifications**", (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.has("after")) {
      if (fail)
        return route.fulfill({ status: 500, json: { message: "Failure" } });
      return route.fulfill({
        json: ok({
          items: [
            {
              notification_id: 12,
              title: "Thông báo trang hai",
              read_at: "2026-11-03",
            },
          ],
          pagination: { has_next: false },
        }),
      });
    }
    return route.fulfill({
      json: ok({
        items: [
          {
            notification_id: 11,
            title: "Thông báo đã tải",
            read_at: "2026-11-03",
          },
        ],
        pagination: { has_next: true, after: 11 },
      }),
    });
  });
  await signIn(page);
  await goTo(page, "/notifications");
  await page.getByRole("button", { name: "Xem thêm", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByText("Thông báo đã tải", { exact: true }),
  ).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(
    page.getByText("Thông báo trang hai", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Thông báo đã tải", { exact: true }),
  ).toBeVisible();
});

test("representative routes have no runtime exceptions or horizontal overflow at narrow widths and zoom", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const state = socialState();
  await installSocialMock(page, state);
  await page.route("**/api/v1/devices", (route) =>
    route.fulfill({
      json: ok({
        devices: [
          {
            device_id: "peer",
            device_name: "Chrome on Windows 11",
            platform: "WEB",
          },
        ],
      }),
    }),
  );
  await signIn(page);
  for (const path of [
    "/",
    "/search",
    "/settings/password",
    "/settings/devices",
  ]) {
    await goTo(page, path);
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await expect
        .poll(
          () =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          { message: `${path} at ${width}` },
        )
        .toBe(true);
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.evaluate(() => {
    document.documentElement.style.zoom = "";
  });
  await page.screenshot({
    path: info.outputPath("devices.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
