import { expect, test } from "@playwright/test";

const enabled =
  !!process.env.SNSQB_TEST_EMAIL && !!process.env.SNSQB_TEST_PASSWORD;

test.describe("Real STOMP connection", () => {
  test.skip(
    !enabled || !process.env.SNSQB_REALTIME_E2E_ORIGIN,
    "Backend chặn CORS từ Vite local; cần origin frontend được backend cho phép để chạy STOMP thật.",
  );

  test("connects through SockJS and subscribes after login", async ({
    page,
  }) => {
    await page.goto("/login");
    await page
      .getByLabel("Email", { exact: true })
      .fill(process.env.SNSQB_TEST_EMAIL!);
    await page
      .getByLabel("Mật khẩu", { exact: true })
      .fill(process.env.SNSQB_TEST_PASSWORD!);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page).toHaveURL("/me");

    await page
      .getByRole("link", { name: "Tin nhắn", exact: true })
      .click();
    await expect(page.getByText("Đã kết nối", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  });
});
