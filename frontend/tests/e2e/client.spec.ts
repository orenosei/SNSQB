import { test, expect, signIn, profile, ok } from "./fixtures";

test("blocks unsupported and external URLs before transport", async ({
  page,
}) => {
  await signIn(page);
  await expect(
    page.getByRole("heading", { name: profile.full_name }),
  ).toBeVisible();
  const outgoing: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/")) outgoing.push(request.url());
  });
  const results = await page.evaluate(async () => {
    const modulePath = "/src/lib/api.ts";
    const { api } = await import(/* @vite-ignore */ modulePath);
    return Promise.all(
      [
        // These invocations exercise the deny rule locally; they must never reach HTTP.
        () => api.post("/auth/admin/register", {}),
        () => api.get("/admin/subjects"),
        () => api.get("https://outside.example.test/api/v1/users/me"),
        () =>
          api.get("/users/me", {
            baseURL: "https://outside.example.test/api/v1",
          }),
        () => api.delete("/users/me"),
      ].map(async (invoke) => {
        try {
          await invoke();
          return "sent";
        } catch {
          return "blocked";
        }
      }),
    );
  });
  expect(results).toEqual(Array(5).fill("blocked"));
  expect(outgoing).toEqual([]);
});

test("concurrent unauthorized requests share a single refresh", async ({
  page,
}) => {
  await signIn(page);
  await expect(
    page.getByRole("heading", { name: profile.full_name }),
  ).toBeVisible();
  let refreshes = 0;
  let rejected = 0;
  let bothRejected!: () => void;
  const ready = new Promise<void>((resolve) => {
    bothRejected = resolve;
  });
  await page.route("**/users/me", async (route) => {
    if (
      route.request().headers().authorization === "Bearer mock-access-token"
    ) {
      rejected++;
      if (rejected === 2) bothRejected();
      await ready;
      return route.fulfill({
        status: 401,
        json: { code: "TOKEN_INVALID_OR_EXPIRED" },
      });
    }
    await route.fulfill({ json: ok(profile) });
  });
  await page.route("**/auth/refresh", async (route) => {
    refreshes++;
    await route.fulfill({
      json: ok({
        access_token: "concurrent-access",
        refresh_token: "concurrent-refresh",
      }),
    });
  });
  const statuses = await page.evaluate(async () => {
    const modulePath = "/src/lib/api.ts";
    const { api } = await import(/* @vite-ignore */ modulePath);
    return Promise.all([api.get("/users/me"), api.get("/users/me")]).then(
      (responses) => responses.map((response) => response.status),
    );
  });
  expect(statuses).toEqual([200, 200]);
  expect(refreshes).toBe(1);
});

test("a late refresh cannot restore a logged-out session", async ({ page }) => {
  await signIn(page);
  await expect(
    page.getByRole("heading", { name: profile.full_name }),
  ).toBeVisible();
  let started!: () => void;
  let release!: () => void;
  const refreshing = new Promise<void>((resolve) => {
    started = resolve;
  });
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/users/me", (route) =>
    route.fulfill({ status: 401, json: { code: "TOKEN_INVALID_OR_EXPIRED" } }),
  );
  await page.route("**/auth/refresh", async (route) => {
    started();
    await pending;
    await route.fulfill({
      json: ok({ access_token: "late-access", refresh_token: "late-refresh" }),
    });
  });
  const result = page.evaluate(async () => {
    const modulePath = "/src/lib/api.ts";
    const { api } = await import(/* @vite-ignore */ modulePath);
    try {
      await api.get("/users/me");
      return "success";
    } catch {
      return "rejected";
    }
  });
  await refreshing;
  await page.evaluate(async () => {
    const modulePath = "/src/features/auth/session.ts";
    const { setSession } = await import(/* @vite-ignore */ modulePath);
    setSession(null);
  });
  release();
  expect(await result).toBe("rejected");
  await expect(page).toHaveURL("/login");
});
