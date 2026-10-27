import {
  test,
  expect,
  signIn,
  openNavigation,
  profile,
  tokens,
  ok,
} from "./fixtures";

test("renders Vietnamese login without unsupported registration", async ({
  page,
}, testInfo) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Hôm nay, mình học gì?" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  await page.getByRole("button", { name: "Hiện mật khẩu" }).click();
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await expect(
    page.getByRole("link", { name: /Đăng ký|Quên mật khẩu/ }),
  ).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("login.png"),
    fullPage: true,
  });
});

test("validates empty and malformed inputs without API calls", async ({
  page,
}) => {
  let calls = 0;
  page.on("request", (request) => {
    if (request.url().includes("/auth/login")) calls++;
  });
  await page.goto("/login");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByText("Vui lòng nhập email.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Vui lòng nhập mật khẩu.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
  await page.getByLabel("Email", { exact: true }).fill("khong-phai-email");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("x");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByText("Vui lòng nhập email hợp lệ.")).toBeVisible();
  expect(calls).toBe(0);
});

test("login sends exact Swagger payload and uses bearer token for profile", async ({
  page,
}) => {
  const loginRequest = page.waitForRequest("**/auth/login");
  const profileRequest = page.waitForRequest("**/users/me");
  await signIn(page);
  expect((await loginRequest).postDataJSON()).toEqual({
    email: profile.email,
    password: "dedicated-mock-password",
    device_id: expect.stringMatching(/^web-browser-/),
    platform: "WEB",
  });
  expect((await profileRequest).headers().authorization).toBe(
    `Bearer ${tokens.access_token}`,
  );
  await expect(
    page.getByRole("heading", { name: profile.full_name }),
  ).toBeVisible();
  const stored = await page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
  }));
  expect(Object.keys(stored.local)).toEqual(["snsqb.device_id"]);
  expect(stored.session).toEqual({});
});

test("shows login API rejection and allows retry", async ({ page }) => {
  await page.route("**/auth/login", (route) =>
    route.fulfill({
      status: 400,
      json: { code: "INCORRECT_IDENTIFIER", message: "Sai tài khoản" },
    }),
  );
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(profile.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Email hoặc mật khẩu không chính xác",
  );
  await expect(page).toHaveURL("/login");
  await expect(
    page.getByRole("button", { name: "Đăng nhập", exact: true }),
  ).toBeEnabled();
});

test("handles locked accounts and network errors", async ({ page }) => {
  await page.route("**/auth/login", (route) =>
    route.fulfill({ status: 403, json: { code: "ACCOUNT_NOT_ACTIVE" } }),
  );
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(profile.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Tài khoản chưa được kích hoạt",
  );
  await page.route("**/auth/login", (route) =>
    route.abort("internetdisconnected"),
  );
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Không thể kết nối máy chủ",
  );
});

test("does not accept business failures or missing tokens as a session", async ({
  page,
}) => {
  await page.route("**/auth/login", (route) =>
    route.fulfill({
      json: {
        code: "INCORRECT_IDENTIFIER",
        message: "Đăng nhập không thành công",
      },
    }),
  );
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(profile.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Đăng nhập không thành công",
  );
  await page.route("**/auth/login", (route) =>
    route.fulfill({ json: ok({ user_id: 101 }) }),
  );
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("thiếu token");
  await expect(page).toHaveURL("/login");
});

for (const refreshToken of [null, undefined]) {
  test(`accepts deployed success code 1000 with ${refreshToken === null ? "null" : "omitted"} refresh token`, async ({
    page,
  }) => {
    const deployedSuccess = (data: unknown) => ({
      code: "1000",
      message: "SUCCESS",
      data,
    });
    await page.route("**/auth/login", (route) =>
      route.fulfill({
        json: deployedSuccess({
          access_token: tokens.access_token,
          refresh_token: refreshToken,
        }),
      }),
    );
    await page.route("**/users/me", (route) =>
      route.fulfill({ json: deployedSuccess(profile) }),
    );
    await page.route("**/auth/logout", (route) =>
      route.fulfill({ json: deployedSuccess(null) }),
    );
    const profileRequest = page.waitForRequest("**/users/me");
    await signIn(page);
    expect((await profileRequest).headers().authorization).toBe(
      `Bearer ${tokens.access_token}`,
    );
    await expect(
      page.getByRole("heading", { name: profile.full_name }),
    ).toBeVisible();
    await openNavigation(page);
    await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
    await expect(page).toHaveURL("/login");
    await expect(page.getByRole("status")).toContainText("đăng xuất an toàn");
  });
}

test("returns to login on 401 without sending a null refresh token", async ({
  page,
}) => {
  let refreshCalls = 0;
  await page.route("**/auth/login", (route) =>
    route.fulfill({
      json: {
        code: "1000",
        message: "SUCCESS",
        data: { access_token: tokens.access_token, refresh_token: null },
      },
    }),
  );
  await page.route("**/users/me", (route) =>
    route.fulfill({ status: 401, json: { code: "TOKEN_INVALID_OR_EXPIRED" } }),
  );
  await page.route("**/auth/refresh", (route) => {
    refreshCalls++;
    return route.fulfill({
      status: 401,
      json: { code: "TOKEN_INVALID_OR_EXPIRED" },
    });
  });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(profile.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Phiên đăng nhập đã hết hạn",
  );
  await expect(page).toHaveURL("/login");
  expect(refreshCalls).toBe(0);
});

test("rejects a non-string access token even with success code 1000", async ({
  page,
}) => {
  await page.route("**/auth/login", (route) =>
    route.fulfill({
      json: {
        code: "1000",
        message: "SUCCESS",
        data: { access_token: 123, refresh_token: null },
      },
    }),
  );
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(profile.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("thiếu token");
  await expect(page).toHaveURL("/login");
});

test("shows pending login and prevents duplicate submission", async ({
  page,
}) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  await page.route("**/auth/login", async (route) => {
    calls++;
    await pending;
    await route.fulfill({ json: ok(tokens) });
  });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(profile.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Đang đăng nhập…" }),
  ).toBeDisabled();
  await expect.poll(() => calls).toBe(1);
  release();
  await expect(page).toHaveURL("/me");
});

for (const path of ["/", "/me", "/settings/profile"]) {
  test(`protects ${path} without a session`, async ({ page }) => {
    let calls = 0;
    page.on("request", (request) => {
      if (request.url().includes("/api/v1/")) calls++;
    });
    await page.goto(path);
    await expect(page).toHaveURL("/login");
    expect(calls).toBe(0);
  });
}

test("refreshes once on 401, retries with new token, then logs out without body", async ({
  page,
}) => {
  let refreshes = 0;
  await page.route("**/users/me", (route) =>
    route.request().headers().authorization === `Bearer ${tokens.access_token}`
      ? route.fulfill({
          status: 401,
          json: { code: "TOKEN_INVALID_OR_EXPIRED" },
        })
      : route.fulfill({ json: ok(profile) }),
  );
  await page.route("**/auth/refresh", async (route) => {
    refreshes++;
    expect(route.request().postDataJSON()).toEqual({
      refresh_token: tokens.refresh_token,
    });
    expect(route.request().headers().authorization).toBeUndefined();
    await route.fulfill({
      json: ok({ access_token: "new-access", refresh_token: "new-refresh" }),
    });
  });
  await signIn(page);
  await expect(
    page.getByRole("heading", { name: profile.full_name }),
  ).toBeVisible();
  expect(refreshes).toBe(1);
  await openNavigation(page);
  const logoutRequest = page.waitForRequest("**/auth/logout");
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  const request = await logoutRequest;
  expect(request.headers().authorization).toBe("Bearer new-access");
  expect(request.postData()).toBeNull();
  await expect(page).toHaveURL("/login");
  await expect(page.getByRole("status")).toContainText("đăng xuất an toàn");
});

test("expires session when refresh fails", async ({ page }) => {
  let refreshes = 0;
  await page.route("**/users/me", (route) =>
    route.fulfill({ status: 401, json: { code: "TOKEN_INVALID_OR_EXPIRED" } }),
  );
  await page.route("**/auth/refresh", (route) => {
    refreshes++;
    return route.fulfill({
      status: 401,
      json: { code: "TOKEN_INVALID_OR_EXPIRED" },
    });
  });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(profile.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Phiên đăng nhập đã hết hạn",
  );
  await expect(page).toHaveURL("/login");
  expect(refreshes).toBe(1);
});

test("never loops on repeated 401 or refreshes on 403", async ({ page }) => {
  let refreshes = 0;
  await page.route("**/auth/refresh", (route) => {
    refreshes++;
    return route.fulfill({
      json: ok({ access_token: "new", refresh_token: "new-refresh" }),
    });
  });
  await page.route("**/users/me", (route) =>
    route.fulfill({ status: 401, json: { code: "TOKEN_INVALID_OR_EXPIRED" } }),
  );
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(profile.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("không còn hợp lệ");
  expect(refreshes).toBe(1);
  await page.route("**/users/me", (route) =>
    route.fulfill({ status: 403, json: { code: "ACCOUNT_NOT_ACTIVE" } }),
  );
  await signIn(page);
  await expect(page.getByRole("alert")).toContainText(
    "Tài khoản chưa được kích hoạt",
  );
  expect(refreshes).toBe(1);
});

test("logout clears local session even if server is unreachable", async ({
  page,
}) => {
  await signIn(page);
  await page.route("**/auth/logout", (route) =>
    route.abort("internetdisconnected"),
  );
  await openNavigation(page);
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL("/login");
  await expect(page.getByRole("status")).toContainText(
    "Chưa thể xác nhận thu hồi phiên",
  );
  await page.goto("/me");
  await expect(page).toHaveURL("/login");
});

test("reload requires login because tokens are memory-only", async ({
  page,
}) => {
  await signIn(page);
  await page.reload();
  await expect(page).toHaveURL("/login");
});
