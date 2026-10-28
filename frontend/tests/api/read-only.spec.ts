import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";

const base = (
  process.env.SNSQB_TEST_API_BASE_URL || "https://snsqb.duckdns.org/api/v1"
).replace(/\/+$/, "");
const hasCredentials =
  !!process.env.SNSQB_TEST_EMAIL && !!process.env.SNSQB_TEST_PASSWORD;

// Every path below is a documented, non-Admin GET with no required parameters.
const reads = [
  ["/users/me", "object"],
  ["/subjects", "array"],
  ["/sessions/my-enrolled-course-classes", "array"],
  ["/sessions/my-submissions", "object"],
  ["/activity-feeds", "object"],
  ["/activity-feeds/new-count", "object"],
  ["/posts/me", "object"],
  ["/friendships", "object"],
  ["/friendships/requests/received", "object"],
  ["/friendships/requests/sent", "object"],
  ["/follows/following", "object"],
  ["/follows/followers", "object"],
  ["/blocks", "object"],
  ["/search", "object"],
  ["/search/saved", "object"],
  ["/notifications", "object"],
  ["/video-posts", "object"],
  ["/settings/push", "object"],
  ["/devices", "object"],
  ["/badges", "array"],
  ["/badges/me", "array"],
  ["/cosmetics/shop", "object"],
  ["/cosmetics/my-inventory", "object"],
  ["/games/check-in", "object"],
  ["/games/leaderboard", "object"],
  ["/games/my-predictions", "object"],
  ["/games/prediction/game-1/classes", "array"],
  ["/conversations", "object"],
  ["/conversations/hidden", "object"],
] as const;

test.describe("Real authenticated read-only operations", () => {
  test.describe.configure({ mode: "default" });
  test.skip(
    !hasCredentials,
    "Cần SNSQB_TEST_EMAIL và SNSQB_TEST_PASSWORD trong môi trường chạy test.",
  );
  let client: APIRequestContext;
  let userId: number;
  test.beforeAll(async ({ request, playwright }) => {
    const login = await request.post(`${base}/auth/login`, {
      data: {
        email: process.env.SNSQB_TEST_EMAIL,
        password: process.env.SNSQB_TEST_PASSWORD,
        device_id: `web-api-read-${randomUUID()}`,
        platform: "WEB",
      },
    });
    expect(login.status()).toBe(200);
    const body = await login.json();
    expect(["0000", "1000"]).toContain(body.code);
    expect(typeof body.data?.access_token).toBe("string");
    userId = body.data?.user_id;
    expect(Number.isSafeInteger(userId) && userId > 0).toBe(true);
    client = await playwright.request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${body.data.access_token}` },
      timeout: 15_000,
    });
  });
  test.afterAll(async () => {
    if (!client) return;
    try {
      const logout = await client.post(`${base}/auth/logout`);
      expect(logout.status()).toBe(200);
      expect(["0000", "1000"]).toContain((await logout.json()).code);
    } finally {
      await client.dispose();
    }
  });
  for (const [path, dataType] of reads) {
    test(`GET ${path} returns its documented data type`, async () => {
      const response = await client.get(`${base}${path}`);
      expect(response.status(), path).toBe(200);
      const body = await response.json();
      expect(["0000", "1000"], path).toContain(body.code);
      if (dataType === "array")
        expect(Array.isArray(body.data), path).toBe(true);
      else
        expect(
          body.data !== null &&
            typeof body.data === "object" &&
            !Array.isArray(body.data),
          path,
        ).toBe(true);
    });
  }
  for (const [path, dataType] of [
    ["/users/{userId}/relationship-stats", "object"],
    ["/users/{userId}/sessions", "object"],
    ["/badges/users/{userId}", "array"],
  ] as const) {
    test(`GET ${path} succeeds for the signed-in user`, async () => {
      const response = await client.get(
        `${base}${path.replace("{userId}", String(userId))}`,
      );
      expect(response.status(), path).toBe(200);
      const body = await response.json();
      expect(["0000", "1000"], path).toContain(body.code);
      if (dataType === "array")
        expect(Array.isArray(body.data), path).toBe(true);
      else
        expect(
          body.data !== null &&
            typeof body.data === "object" &&
            !Array.isArray(body.data),
          path,
        ).toBe(true);
    });
  }
  test("GET /badges/{badgeId} reads an ID from the catalog", async () => {
    const catalog = await client.get(`${base}/badges`);
    expect(catalog.status()).toBe(200);
    const listed = await catalog.json();
    expect(["0000", "1000"]).toContain(listed.code);
    expect(Array.isArray(listed.data)).toBe(true);
    const id = listed.data.find(
      (item: { badge_id?: number }) =>
        Number.isSafeInteger(item.badge_id) && item.badge_id! > 0,
    )?.badge_id;
    test.skip(!id, "Danh mục huy hiệu không có ID hợp lệ để đọc chi tiết.");
    const detail = await client.get(`${base}/badges/${id}`);
    expect(detail.status()).toBe(200);
    const body = await detail.json();
    expect(["0000", "1000"]).toContain(body.code);
    expect(body.data?.badge_id).toBe(id);
  });
  async function searchId(type: "QUESTION" | "SESSION") {
    const response = await client.get(`${base}/search`, {
      params: { type, limit: 10 },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(["0000", "1000"]).toContain(body.code);
    expect(Array.isArray(body.data?.items)).toBe(true);
    const field = type === "QUESTION" ? "question_id" : "session_id";
    return body.data.items.find(
      (item: { question?: Record<string, number>; session?: Record<string, number> }) => {
        const id = (type === "QUESTION" ? item.question : item.session)?.[field];
        return Number.isSafeInteger(id) && id! > 0;
      },
    )?.[type === "QUESTION" ? "question" : "session"]?.[field] as number | undefined;
  }
  for (const path of [
    "/questions/{questionId}/statistics",
    "/questions/{questionId}/ratings",
  ]) {
    test(`GET ${path} reads a search result`, async () => {
      const id = await searchId("QUESTION");
      test.skip(!id, "Search chưa có câu hỏi với ID để đọc.");
      const response = await client.get(`${base}${path.replace("{questionId}", String(id))}`);
      expect(response.status(), path).toBe(200);
      const body = await response.json();
      expect(["0000", "1000"], path).toContain(body.code);
      expect(body.data !== null && typeof body.data === "object", path).toBe(true);
      if (path.endsWith("/ratings")) expect(Array.isArray(body.data.items)).toBe(true);
    });
  }
  test("GET /sessions/{sessionId}/questions reads a searched collection", async () => {
    const id = await searchId("SESSION");
    test.skip(!id, "Search chưa có bộ câu hỏi với ID để luyện tập.");
    const response = await client.get(`${base}/sessions/${id}/questions`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(["0000", "1000"]).toContain(body.code);
    expect(Array.isArray(body.data?.questions)).toBe(true);
  });
  for (const [path, groupOnly] of [
    ["/conversations/{id}/messages", false],
    ["/conversations/{id}/members", true],
  ] as const) {
    test(`GET ${path} reads an existing conversation`, async () => {
      const list = await client.get(`${base}/conversations`);
      expect(list.status()).toBe(200);
      const body = await list.json();
      expect(["0000", "1000"]).toContain(body.code);
      const item = body.data?.items?.find(
        (value: { conversation_id?: number; type?: string }) =>
          Number.isSafeInteger(value.conversation_id) &&
          value.conversation_id! > 0 &&
          (!groupOnly || value.type === "GROUP"),
      );
      test.skip(!item, groupOnly ? "Không có hội thoại nhóm." : "Không có hội thoại.");
      const response = await client.get(`${base}${path.replace("{id}", String(item.conversation_id))}`);
      expect(response.status(), path).toBe(200);
      const detail = await response.json();
      expect(["0000", "1000"], path).toContain(detail.code);
      expect(detail.data !== null && typeof detail.data === "object", path).toBe(true);
    });
  }
});

// These 23 paths each document a 401 response and need no path parameters.
for (const path of [
  "/users/me",
  "/settings/push",
  "/lecturer/course-classes",
  "/video-posts",
  "/subjects",
  "/search/saved",
  "/posts/me",
  "/notifications",
  "/lecturer/course-classes/my-classes",
  "/lecturer/course-classes/lecturers",
  "/friendships",
  "/friendships/requests/sent",
  "/friendships/requests/received",
  "/follows/following",
  "/follows/followers",
  "/devices",
  "/cosmetics/my-inventory",
  "/conversations",
  "/conversations/hidden",
  "/blocks",
  "/badges/me",
  "/activity-feeds",
  "/activity-feeds/new-count",
]) {
  test(`GET ${path} rejects a missing JWT`, async ({ request }) => {
    const response = await request.get(`${base}${path}`);
    expect(response.status(), path).toBe(401);
  });
}
