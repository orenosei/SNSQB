import { test, expect, ok, profile, signIn } from "./fixtures";
import { goTo, installSocialMock, socialState } from "./social-fixture";

test("creates a chat group using candidates and opens its member roster", async ({
  page,
}) => {
  let created = false;
  const members = [
    { user_id: 151, full_name: "Minh", role: "VILLAGER" },
    { user_id: 152, full_name: "Lan", role: "VILLAGER" },
  ];
  await page.route(
    (url) => url.pathname.startsWith("/api/v1/conversations"),
    async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/candidates"))
        return route.fulfill({ json: ok({ items: members }) });
      if (path.endsWith("/group")) {
        expect(route.request().method()).toBe("POST");
        expect(route.request().postDataJSON()).toEqual({
          name: "Nhóm môn Web",
          member_ids: [151, 152],
        });
        created = true;
        return route.fulfill({ json: ok({ conversation_id: 29 }) });
      }
      if (path.endsWith("/messages"))
        return route.fulfill({ json: ok({ messages: [] }) });
      if (path.endsWith("/members"))
        return route.fulfill({
          json: ok([{ ...profile, role: "CHIEF" }, ...members]),
        });
      return route.fulfill({
        json: ok({
          items: created
            ? [
                {
                  conversation_id: 29,
                  type: "GROUP",
                  display_name: "Nhóm môn Web",
                },
              ]
            : [],
        }),
      });
    },
  );
  await signIn(page);
  await goTo(page, "/chat");
  await page.getByRole("button", { name: "Tạo nhóm", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Tạo nhóm trò chuyện" });
  await form.getByLabel("Tên nhóm").fill("Nhóm môn Web");
  await form.getByRole("button", { name: "Chọn Minh" }).click();
  await form.getByRole("button", { name: "Chọn Lan" }).click();
  await form.getByRole("button", { name: "Tạo nhóm", exact: true }).click();
  await expect(page).toHaveURL(/\/chat\?id=29$/);
  await page.getByRole("button", { name: "Quản lý nhóm", exact: true }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Quản lý nhóm" })
      .getByRole("paragraph")
      .filter({ hasText: /^Tù trưởng$/ }),
  ).toBeVisible();
});

test("opens the hidden chat only after server accepts its PIN and clears it on lock", async ({
  page,
}) => {
  let unlocked = false;
  await page.route(
    (url) => url.pathname.startsWith("/api/v1/conversations"),
    async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/unlock")) {
        expect(route.request().postDataJSON()).toEqual({ pin: "123456" });
        unlocked = true;
        return route.fulfill({
          json: ok({ expires_at: new Date(Date.now() + 60000).toISOString() }),
        });
      }
      if (path.endsWith("/lock")) {
        unlocked = false;
        return route.fulfill({ json: ok(null) });
      }
      if (path.endsWith("/hidden")) {
        expect(unlocked).toBe(true);
        return route.fulfill({
          json: ok({
            items: [
              { conversation_id: 89, display_name: "Cuộc trò chuyện bí mật" },
            ],
          }),
        });
      }
      if (path.endsWith("/messages")) {
        expect(unlocked).toBe(true);
        return route.fulfill({
          json: ok({
            messages: [{ message_id: 500, content: "Nội dung riêng tư" }],
          }),
        });
      }
      return route.fulfill({ json: ok({ items: [] }) });
    },
  );
  await signIn(page);
  await goTo(page, "/chat");
  await page.getByRole("button", { name: "Kho chat ẩn" }).click();
  await page.getByLabel("PIN kho chat").fill("123456");
  await page.getByRole("button", { name: "Mở khóa", exact: true }).click();
  await page.getByRole("button", { name: "Cuộc trò chuyện bí mật" }).click();
  await expect(page.getByText("Nội dung riêng tư")).toBeVisible();
  if (
    await page
      .getByRole("button", { name: "Trở về danh sách hội thoại" })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Trở về danh sách hội thoại" })
      .click();
  await page.getByRole("button", { name: "Kho chat ẩn" }).click();
  await page.getByRole("button", { name: "Khóa kho chat" }).click();
  await expect(page.getByLabel("PIN kho chat")).toBeVisible();
  await expect(page.getByText("Nội dung riêng tư")).toHaveCount(0);
});

test("requests and confirms email OTP from the authenticated profile", async ({
  page,
}) => {
  let verified = false;
  await page.route("**/api/v1/users/me", (route) =>
    route.fulfill({ json: ok({ ...profile, verified }) }),
  );
  await page.route("**/api/v1/auth/email-verification/*", (route) => {
    if (route.request().url().endsWith("/confirm")) {
      expect(route.request().postDataJSON()).toEqual({ verify_code: "012345" });
      verified = true;
    }
    return route.fulfill({ json: ok(null) });
  });
  await signIn(page);
  await page
    .getByRole("button", { name: "Xác thực email", exact: true })
    .click();
  await page.getByRole("button", { name: "Gửi mã xác thực" }).click();
  await expect(
    page.getByText("Mã xác thực đã được gửi đến email của bạn."),
  ).toBeVisible();
  await page.getByLabel("Mã xác thực", { exact: true }).fill("012345");
  await page.getByRole("button", { name: "Xác nhận mã" }).click();
  await expect(
    page.getByRole("button", { name: "Xác thực email", exact: true }),
  ).toHaveCount(0);
  expect(verified).toBe(true);
});

test("saves only an explicitly submitted search", async ({ page }) => {
  const state = socialState();
  await installSocialMock(page, state);
  const saved: string[] = [];
  await page.route("**/api/v1/search/saved", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    saved.push(route.request().postDataJSON().query);
    return route.fulfill({ json: ok(null) });
  });
  await signIn(page);
  await goTo(page, "/search?query=deep-link&type=USER");
  await page.getByLabel("Từ khóa tìm kiếm").fill("môn Web");
  await expect(page.getByLabel("Từ khóa tìm kiếm")).toHaveValue("môn Web");
  expect(saved).toEqual([]);
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect.poll(() => saved).toEqual(["môn Web"]);
});
