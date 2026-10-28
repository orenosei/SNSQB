import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

const email = process.env.SNSQB_TEST_EMAIL;
const password = process.env.SNSQB_TEST_PASSWORD;
const enabled = !!email && !!password;
const successCodes = ["0000", "1000"];
const base = (
  process.env.SNSQB_TEST_API_BASE_URL || "https://snsqb.duckdns.org/api/v1"
).replace(/\/+$/, "");

test.describe("Real authentication API tests", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(
    !enabled,
    "Cần SNSQB_TEST_EMAIL và SNSQB_TEST_PASSWORD trong môi trường chạy test.",
  );

  test("login → current profile → refresh when available → logout", async ({
    request,
  }) => {
    let accessToken: string | undefined;
    try {
      const login = await request.post(`${base}/auth/login`, {
        data: {
          email,
          password,
          device_id: `web-test-${randomUUID()}`,
          platform: "WEB",
        },
      });
      expect(login.status()).toBe(200);
      const auth = await login.json();
      expect(successCodes).toContain(auth.code);
      expect(typeof auth.data?.access_token).toBe("string");
      accessToken = auth.data.access_token;
      const profile = await request.get(`${base}/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(profile.status()).toBe(200);
      const me = await profile.json();
      expect(successCodes).toContain(me.code);
      expect(me.data?.user_id).toBe(auth.data.user_id);
      if (
        typeof auth.data.refresh_token === "string" &&
        auth.data.refresh_token
      ) {
        const refresh = await request.post(`${base}/auth/refresh`, {
          data: { refresh_token: auth.data.refresh_token },
        });
        expect(refresh.status()).toBe(200);
        const renewed = await refresh.json();
        expect(successCodes).toContain(renewed.code);
        expect(typeof renewed.data?.access_token).toBe("string");
        accessToken = renewed.data.access_token;
      } else {
        test.info().annotations.push({
          type: "coverage",
          description:
            "Server không cấp refresh token; chưa kiểm chứng POST /auth/refresh.",
        });
      }
    } finally {
      if (accessToken) {
        const logout = await request.post(`${base}/auth/logout`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        expect(logout.status()).toBe(200);
        expect(successCodes).toContain((await logout.json()).code);
      }
    }
  });

  test("login rejects an incorrect password", async ({ request }) => {
    const response = await request.post(`${base}/auth/login`, {
      data: {
        email,
        password: `invalid-${randomUUID()}`,
        device_id: `web-test-${randomUUID()}`,
        platform: "WEB",
      },
    });
    expect(response.status()).toBe(400);
    expect(successCodes).not.toContain((await response.json()).code);
  });


});
