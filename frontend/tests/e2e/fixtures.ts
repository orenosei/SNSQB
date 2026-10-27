import { test as base, expect, type Page } from "@playwright/test";

export const profile = {
  user_id: 101,
  email: "sinhvien@example.test",
  full_name: "Nguyễn Minh Anh",
  role: "STUDENT",
  bio: "Cùng chia sẻ để hiểu sâu hơn.",
  school_faculty: "Trường Công nghệ Thông tin và Truyền thông",
  major: "Khoa học máy tính",
  class_name: "KHMT 01",
  student_lecturer_code: "20220001",
  gender: "FEMALE",
  date_of_birth: "2004-08-05",
  timezone: "Asia/Ho_Chi_Minh",
  verified: true,
  profile_completed: true,
  total_proposed_questions: 12,
  gamification_points: 350.5,
  badges_count: 4,
  friends_count: 28,
  followers_count: 15,
  following_count: 20,
};
export const tokens = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
};
export const ok = (data: unknown) => ({
  code: "0000",
  message: "Thành công",
  data,
});

// Every API call is intercepted, including unexpected paths. No backend traffic in UI tests.
export const test = base.extend<{ apiMock: void }>({
  apiMock: [
    async ({ page }, use) => {
      await page.route("**/api/v1/**", async (route) => {
        const path = new URL(route.request().url()).pathname.replace(
          "/api/v1",
          "",
        );
        const method = route.request().method();
        if (path === "/auth/login" && method === "POST")
          return route.fulfill({
            json: ok({ ...tokens, user_id: 101, role: "STUDENT" }),
          });
        if (path === "/auth/refresh" && method === "POST")
          return route.fulfill({
            json: ok({
              access_token: "refreshed-access",
              refresh_token: "refreshed-refresh",
            }),
          });
        if (path === "/auth/logout" && method === "POST")
          return route.fulfill({ json: ok(null) });
        if (path === "/users/me" && method === "GET")
          return route.fulfill({ json: ok(profile) });
        throw new Error(`Unexpected API request: ${method} ${path}`);
      });
      await use();
    },
    { auto: true },
  ],
});

export async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(profile.email);
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("dedicated-mock-password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL("/me");
}
export async function openNavigation(page: Page) {
  const toggle = page.getByRole("button", { name: "Mở điều hướng" });
  if (await toggle.isVisible()) await toggle.click();
}
export { expect };
