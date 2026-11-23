import { test, expect, signIn, openNavigation, profile, ok } from "./fixtures";

test("renders profile fields and enabled messaging navigation", async ({
  page,
}, testInfo) => {
  await signIn(page);
  await expect(
    page.getByRole("heading", { name: profile.full_name }),
  ).toBeVisible();
  await expect(page.getByText(profile.email, { exact: true })).toBeVisible();
  await expect(page.getByText(profile.major, { exact: true })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("profile.png"),
    fullPage: true,
  });
  await expect(page.getByRole("link", { name: "Tin nhắn" })).toBeVisible();
});

test("edits only changed Swagger fields and updates cached profile", async ({
  page,
}) => {
  let body: unknown;
  await page.route("**/users/me", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: ok(profile) });
    expect(route.request().method()).toBe("PUT");
    body = route.request().postDataJSON();
    await route.fulfill({
      json: ok({
        ...profile,
        full_name: "Nguyễn Minh An",
        bio: "Yêu học hỏi.",
      }),
    });
  });
  await signIn(page);
  await page
    .getByRole("link", { name: "Chỉnh sửa hồ sơ", exact: true })
    .click();
  await page.getByLabel("Họ và tên", { exact: true }).fill("Nguyễn Minh An");
  await page.getByLabel("Giới thiệu bản thân").fill("Yêu học hỏi.");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page).toHaveURL("/me");
  await expect(
    page.getByRole("heading", { name: "Nguyễn Minh An" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Đã cập nhật hồ sơ");
  expect(body).toEqual({ full_name: "Nguyễn Minh An", bio: "Yêu học hỏi." });
});

test("keeps draft on save errors without retrying mutations", async ({
  page,
}) => {
  let updates = 0;
  await page.route("**/users/me", (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: ok(profile) });
    updates++;
    return route.fulfill({ status: 500, json: { code: "ERROR" } });
  });
  await signIn(page);
  await page
    .getByRole("link", { name: "Chỉnh sửa hồ sơ", exact: true })
    .click();
  await page
    .getByLabel("Họ và tên", { exact: true })
    .fill("Tên đang chỉnh sửa");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByRole("alert")).toContainText("Đã có lỗi xảy ra");
  await expect(page.getByLabel("Họ và tên", { exact: true })).toHaveValue(
    "Tên đang chỉnh sửa",
  );
  expect(updates).toBe(1);
});

test("validates profile constraints and timezone before saving", async ({
  page,
}) => {
  await signIn(page);
  await page
    .getByRole("link", { name: "Chỉnh sửa hồ sơ", exact: true })
    .click();
  await expect(page.getByLabel("Họ và tên", { exact: true })).toHaveAttribute(
    "maxlength",
    "100",
  );
  await expect(page.getByLabel("Giới thiệu bản thân")).toHaveAttribute(
    "maxlength",
    "500",
  );
  await page.getByLabel("Múi giờ", { exact: true }).fill("khong-hop-le");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByRole("alert")).toContainText("Múi giờ không hợp lệ");
});

test("shows profile error and supports explicit retry", async ({ page }) => {
  let fail = true;
  await page.route("**/users/me", (route) =>
    fail
      ? route.fulfill({ status: 503, json: { code: "ERROR" } })
      : route.fulfill({ json: ok(profile) }),
  );
  await signIn(page);
  await expect(page.getByRole("alert")).toContainText("Đã có lỗi xảy ra");
  fail = false;
  await page.getByRole("button", { name: "Thử lại" }).click();
  await expect(
    page.getByRole("heading", { name: profile.full_name }),
  ).toBeVisible();
});

test("handles missing optional fields without inventing statistics", async ({
  page,
}) => {
  await page.route("**/users/me", (route) =>
    route.fulfill({ json: ok({ full_name: "Thành viên mới" }) }),
  );
  await signIn(page);
  await expect(
    page.getByRole("heading", { name: "Thành viên mới" }),
  ).toBeVisible();
  await expect(page.getByText("Chưa cập nhật", { exact: true })).toHaveCount(8);
  await expect(page.locator(".stat-grid strong").first()).toHaveText("—");
});

test("responsive pages have no horizontal overflow and mobile menu closes with Escape", async ({
  page,
  isMobile,
}) => {
  await page.goto("/login");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await signIn(page);
  await expect(
    page.getByRole("heading", { name: profile.full_name }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  if (isMobile) {
    await openNavigation(page);
    await expect(
      page.getByRole("button", { name: "Đăng xuất", exact: true }),
    ).toBeInViewport();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Mở điều hướng" }),
    ).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Mở điều hướng" }),
    ).toHaveAttribute("aria-expanded", "false");
  }
  for (const width of [320, 375, 768, 1280, 1536]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const name = await page
      .getByRole("heading", { name: profile.full_name })
      .boundingBox();
    expect(name!.height).toBeLessThan(85);
    if (width <= 480) {
      const hero = await page.locator(".profile-hero").boundingBox();
      const stats = await page.locator(".stats-card").boundingBox();
      expect(Math.abs(hero!.width - stats!.width)).toBeLessThan(2);
    }
  }
  await page.setViewportSize({ width: 320, height: 900 });
  await page
    .getByRole("link", { name: "Chỉnh sửa hồ sơ", exact: true })
    .click();
  await expect(page.getByLabel("Họ và tên", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
