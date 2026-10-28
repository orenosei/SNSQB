import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
const base = (
  process.env.SNSQB_TEST_API_BASE_URL || "https://snsqb.duckdns.org/api/v1"
).replace(/\/+$/, "");
const enabled =
  !!process.env.SNSQB_TEST_EMAIL && !!process.env.SNSQB_TEST_PASSWORD;
const good = ["0000", "1000"];
test.describe("Phase 4 real REST workflows", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!enabled, "Cần thông tin đăng nhập STUDENT trong frontend/.env.");
  let client: APIRequestContext;
  test.beforeAll(async ({ request, playwright }) => {
    const response = await request.post(`${base}/auth/login`, {
      data: {
        email: process.env.SNSQB_TEST_EMAIL,
        password: process.env.SNSQB_TEST_PASSWORD,
        device_id: `web-phase4-${randomUUID()}`,
        platform: "WEB",
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(good).toContain(body.code);
    expect(typeof body.data?.access_token).toBe("string");
    client = await playwright.request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${body.data.access_token}` },
      timeout: 15000,
    });
  });
  test.afterAll(async () => {
    if (client) {
      await client.post(`${base}/auth/logout`);
      await client.dispose();
    }
  });
  test("GET conversation list and message history from an existing conversation", async () => {
    const list = await client.get(`${base}/conversations`);
    expect(list.status()).toBe(200);
    const body = await list.json();
    expect(good).toContain(body.code);
    expect(Array.isArray(body.data?.items)).toBe(true);
    const id = body.data.items.find(
      (item: { conversation_id?: number }) =>
        Number.isSafeInteger(item.conversation_id) && item.conversation_id! > 0,
    )?.conversation_id;
    test.skip(!id, "Tài khoản chưa có cuộc hội thoại để đọc lịch sử.");
    const history = await client.get(`${base}/conversations/${id}/messages`);
    expect(history.status()).toBe(200);
    const result = await history.json();
    expect(good).toContain(result.code);
    expect(Array.isArray(result.data?.messages)).toBe(true);
  });
  test("POST direct conversation and GET history with a configured peer", async ({
    request,
  }) => {
    test.skip(
      !process.env.SNSQB_TEST_PEER_EMAIL ||
        !process.env.SNSQB_TEST_PEER_PASSWORD,
      "Cần tài khoản thứ hai để tạo direct conversation.",
    );
    const peer = await request.post(`${base}/auth/login`, {
      data: {
        email: process.env.SNSQB_TEST_PEER_EMAIL,
        password: process.env.SNSQB_TEST_PEER_PASSWORD,
        device_id: `web-phase4-peer-${randomUUID()}`,
        platform: "WEB",
      },
    });
    expect(peer.status()).toBe(200);
    const peerBody = await peer.json();
    expect(good).toContain(peerBody.code);
    const id = peerBody.data?.user_id;
    expect(Number.isSafeInteger(id) && id > 0).toBe(true);
    const created = await client.post(`${base}/conversations/direct`, {
      data: { target_user_id: id },
    });
    expect(created.status()).toBe(201);
    const detail = await created.json();
    expect(good).toContain(detail.code);
    expect(detail.data?.type).toBe("DIRECT");
    expect(Number.isSafeInteger(detail.data?.conversation_id)).toBe(true);
    const history = await client.get(
      `${base}/conversations/${detail.data.conversation_id}/messages`,
    );
    expect(history.status()).toBe(200);
    const body = await history.json();
    expect(good).toContain(body.code);
    expect(Array.isArray(body.data?.messages)).toBe(true);
  });
  test("GET notifications and unread count", async () => {
    const response = await client.get(`${base}/notifications`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(good).toContain(body.code);
    expect(Array.isArray(body.data?.items)).toBe(true);
    expect(typeof body.data?.unread_count).toBe("number");
  });
  test("POST notification read requires a test-created notification", async () => {
    test.skip(
      true,
      "Không có API tạo thông báo riêng và không đánh dấu đã đọc thông báo có sẵn.",
    );
  });
  test("POST notification read-all requires test-created unread notifications", async () => {
    test.skip(
      true,
      "Không thay đổi trạng thái thông báo có sẵn của người dùng.",
    );
  });
  test("GET video feed, saved search, and push settings", async () => {
    for (const path of ["/video-posts", "/search/saved", "/settings/push"]) {
      const response = await client.get(`${base}${path}`);
      expect(response.status(), path).toBe(200);
      const body = await response.json();
      expect(good, path).toContain(body.code);
      expect(body.data && typeof body.data === "object", path).toBe(true);
    }
  });
  test("DELETE a saved search created by this test", async () => {
    const marker = `snsqb-phase4-${randomUUID()}`;
    const search = await client.get(`${base}/search`, {
      params: { query: marker, type: "USER", limit: 10 },
    });
    expect(search.status()).toBe(200);
    expect(good).toContain((await search.json()).code);
    const list = await client.get(`${base}/search/saved`);
    expect(list.status()).toBe(200);
    const body = await list.json();
    expect(good).toContain(body.code);
    const entry = body.data?.saved_searches?.find(
      (item: { query_text?: string }) => item.query_text === marker,
    );
    test.skip(
      !entry?.saved_search_id,
      "Backend không lưu truy vấn tìm kiếm vừa tạo vào lịch sử.",
    );
    const removed = await client.delete(
      `${base}/search/saved/${entry.saved_search_id}`,
    );
    expect(removed.status()).toBe(200);
    expect(good).toContain((await removed.json()).code);
  });
  test("SockJS handshake metadata is available", async ({ request }) => {
    const response = await request.get(`${base}/ws/info`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(typeof body.websocket).toBe("boolean");
  });
});
