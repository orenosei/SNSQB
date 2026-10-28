import {
  test,
  expect,
  type APIRequestContext,
  type APIResponse,
} from "@playwright/test";
import { randomUUID } from "node:crypto";

const base = (
  process.env.SNSQB_TEST_API_BASE_URL || "https://snsqb.duckdns.org/api/v1"
).replace(/\/+$/, "");
const enabled =
  !!process.env.SNSQB_TEST_EMAIL && !!process.env.SNSQB_TEST_PASSWORD;
const successCodes = ["0000", "1000"];
const marker = `SNSQB-E2E-${randomUUID()}`;
async function data(response: APIResponse) {
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(successCodes).toContain(body.code);
  return body.data;
}

// Mutations use only resources created by this suite; a second account is optional.
test.describe("Real social API", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(
    !enabled,
    "Cần SNSQB_TEST_EMAIL và SNSQB_TEST_PASSWORD trong môi trường chạy test.",
  );
  let a: APIRequestContext;
  let b: APIRequestContext;
  let anonymous: APIRequestContext;
  let aid: number;
  let bid: number;
  let pairIsolated = false;

  async function cleanupPair() {
    if (!pairIsolated) return;
    for (const [client, other] of [
      [a, bid],
      [b, aid],
    ] as const) {
      const relation = await data(
        await client.get(`${base}/users/${other}/relationship-stats`),
      );
      if (relation.relationship_with_me?.blocked)
        await data(await client.delete(`${base}/blocks/${other}`));
    }
    const relation = await data(
      await a.get(`${base}/users/${bid}/relationship-stats`),
    );
    if (relation.relationship_with_me?.friend)
      await data(await a.delete(`${base}/friendships/${bid}`));
    for (const [client, other] of [
      [a, bid],
      [b, aid],
    ] as const) {
      const relation = await data(
        await client.get(`${base}/users/${other}/relationship-stats`),
      );
      if (relation.relationship_with_me?.following)
        await data(await client.delete(`${base}/follows/${other}`));
      const received = await data(
        await client.get(`${base}/friendships/requests/received`, {
          params: { limit: 50 },
        }),
      );
      if (
        received.items?.some(
          (item: { requester?: { user_id?: number } }) =>
            item.requester?.user_id === other,
        )
      )
        await data(
          await client.post(`${base}/friendships/decline`, {
            data: { requester_id: other },
          }),
        );
    }
  }
  async function withPost(
    visibility: "PUBLIC" | "FRIENDS" | "ONLY_ME",
    run: (id: number) => Promise<void>,
  ) {
    const created = await data(
      await a.post(`${base}/posts`, {
        data: { content: marker, visibility, post_type: "SOCIAL_POST" },
      }),
    );
    const id = created.post_id;
    expect(Number.isSafeInteger(id)).toBe(true);
    try {
      await run(id);
    } finally {
      const cleanup = await a.delete(`${base}/posts/${id}`);
      expect([200, 404], `Cleanup owned post ${id}`).toContain(
        cleanup.status(),
      );
    }
  }
  test.beforeAll(async ({ playwright, request }) => {
    async function session(email: string, password: string) {
      const auth = await data(
        await request.post(`${base}/auth/login`, {
          data: {
            email,
            password,
            device_id: `web-social-test-${randomUUID()}`,
            platform: "WEB",
          },
        }),
      );
      expect(typeof auth.access_token).toBe("string");
      return playwright.request.newContext({
        extraHTTPHeaders: { Authorization: `Bearer ${auth.access_token}` },
        timeout: 15_000,
      });
    }
    // Assignment is sequential so afterAll can clean up even if the second login fails.
    a = await session(
      process.env.SNSQB_TEST_EMAIL!,
      process.env.SNSQB_TEST_PASSWORD!,
    );
    if (
      process.env.SNSQB_TEST_PEER_EMAIL &&
      process.env.SNSQB_TEST_PEER_PASSWORD
    )
      b = await session(
        process.env.SNSQB_TEST_PEER_EMAIL,
        process.env.SNSQB_TEST_PEER_PASSWORD,
      );
    anonymous = await playwright.request.newContext({ timeout: 15_000 });
    const me = await data(await a.get(`${base}/users/me`));
    aid = me.user_id;
    expect(Number.isSafeInteger(aid)).toBe(true);
    expect(["STUDENT", "LECTURER"]).toContain(me.role);
    if (!b) return;
    const peer = await data(await b.get(`${base}/users/me`));
    bid = peer.user_id;
    expect(Number.isSafeInteger(bid) && aid !== bid).toBe(true);
    expect(peer.role).toBe(me.role);
    for (const [client, other] of [
      [a, bid],
      [b, aid],
    ] as const) {
      const state = (
        await data(
          await client.get(`${base}/users/${other}/relationship-stats`),
        )
      ).relationship_with_me;
      expect(
        state?.friend,
        "Dedicated pair must have no pre-existing friendship",
      ).toBe(false);
      expect(state?.following).toBe(false);
      expect(state?.blocked).toBe(false);
      expect(["NONE", "DECLINED"]).toContain(state?.friend_request_status);
    }
    pairIsolated = true;
  });
  test.afterEach(async () => {
    await cleanupPair();
  });
  test.afterAll(async () => {
    try {
      await cleanupPair();
    } finally {
      for (const client of [a, b])
        if (client) {
          try {
            const logout = await client.post(`${base}/auth/logout`);
            expect([200, 401]).toContain(logout.status());
          } finally {
            await client.dispose();
          }
        }
      if (anonymous) await anonymous.dispose();
    }
  });

  test("reads feed, own/public profiles, own posts and relationship lists", async () => {
    for (const path of [
      "/activity-feeds",
      "/posts/me",
      `/users/${aid}`,
      `/users/${aid}/posts`,
      ...(b ? [`/users/${bid}/relationship-stats`] : []),
      "/friendships",
      "/friendships/requests/received",
      "/friendships/requests/sent",
      "/follows/following",
      "/follows/followers",
      "/blocks",
    ]) {
      const result = await data(await a.get(`${base}${path}`));
      expect(result).toBeTruthy();
    }
  });
  test("creates, reads, edits and deletes an owned post", async () => {
    await withPost("PUBLIC", async (id) => {
      expect((await data(await a.get(`${base}/posts/${id}`))).content).toBe(
        marker,
      );
      await data(
        await a.put(`${base}/posts/${id}`, {
          data: {
            content: `${marker} updated`,
            visibility: "PUBLIC",
            media_urls: [],
          },
        }),
      );
      expect(
        (await data(await (b || a).get(`${base}/posts/${id}`))).content,
      ).toBe(`${marker} updated`);
      await data(await a.delete(`${base}/posts/${id}`));
      expect((await a.get(`${base}/posts/${id}`)).status()).toBe(404);
    });
  });
  test("rejects another author editing or deleting an owned post", async () => {
    test.skip(!b, "Cần tài khoản thứ hai để kiểm quyền tác giả khác.");
    await withPost("PUBLIC", async (id) => {
      expect(
        (
          await b.put(`${base}/posts/${id}`, {
            data: { content: "unauthorized", visibility: "PUBLIC" },
          })
        ).status(),
      ).toBe(403);
      expect((await b.delete(`${base}/posts/${id}`)).status()).toBe(403);
      expect((await data(await a.get(`${base}/posts/${id}`))).content).toBe(
        marker,
      );
    });
  });
  test("ONLY_ME posts cannot be read by the peer", async () => {
    test.skip(!b, "Cần tài khoản thứ hai để kiểm riêng tư.");
    await withPost("ONLY_ME", async (id) => {
      await data(await a.get(`${base}/posts/${id}`));
      expect((await b.get(`${base}/posts/${id}`)).status()).toBe(403);
    });
  });
  test("FRIENDS visibility changes only after friendship acceptance", async () => {
    test.skip(!b, "Cần tài khoản thứ hai để kiểm quan hệ bạn bè.");
    await withPost("FRIENDS", async (id) => {
      expect((await b.get(`${base}/posts/${id}`)).status()).toBe(403);
      await data(
        await a.post(`${base}/friendships/request`, {
          data: { addressee_id: bid },
        }),
      );
      await data(
        await b.post(`${base}/friendships/accept`, {
          data: { requester_id: aid },
        }),
      );
      await data(await b.get(`${base}/posts/${id}`));
    });
  });
  test("comment/reply lifecycle and non-owner authorization", async () => {
    await withPost("PUBLIC", async (id) => {
      const owned: number[] = [];
      try {
        const comment = await data(
          await a.post(`${base}/comments`, {
            data: { target_type: "POST", target_id: id, content: marker },
          }),
        );
        owned.push(comment.comment_id);
        const reply = await data(
          await a.post(`${base}/comments`, {
            data: {
              target_type: "POST",
              target_id: id,
              parent_comment_id: comment.comment_id,
              content: `${marker} reply`,
            },
          }),
        );
        owned.push(reply.comment_id);
        expect(
          (
            await data(
              await a.get(`${base}/comments`, {
                params: {
                  parent_comment_id: comment.comment_id,
                  limit: 20,
                  sort: "oldest",
                },
              }),
            )
          ).items.some(
            (item: { comment_id?: number }) =>
              item.comment_id === reply.comment_id,
          ),
        ).toBe(true);
        if (b) {
          expect(
            (
              await b.put(`${base}/comments/${comment.comment_id}`, {
                data: { content: "unauthorized" },
              })
            ).status(),
          ).toBe(403);
          expect(
            (await b.delete(`${base}/comments/${comment.comment_id}`)).status(),
          ).toBe(403);
        }
        await data(
          await a.put(`${base}/comments/${comment.comment_id}`, {
            data: { content: `${marker} edited`, media_url: "" },
          }),
        );
        const comments = await data(
          await a.get(`${base}/comments`, {
            params: {
              target_type: "POST",
              target_id: id,
              sort: "newest",
              limit: 20,
            },
          }),
        );
        expect(
          comments.items.some(
            (item: { content?: string }) => item.content === `${marker} edited`,
          ),
        ).toBe(true);
      } finally {
        for (const commentId of owned.reverse())
          expect([200, 404]).toContain(
            (await a.delete(`${base}/comments/${commentId}`)).status(),
          );
      }
    });
  });
  test("unauthorized post/comment/reaction requests return 401", async () => {
    await withPost("PUBLIC", async (id) => {
      expect((await anonymous.get(`${base}/posts/${id}`)).status()).toBe(401);
      expect(
        (
          await anonymous.get(`${base}/comments`, {
            params: { target_type: "POST", target_id: id },
          })
        ).status(),
      ).toBe(401);
      expect(
        (
          await anonymous.post(`${base}/react`, {
            data: { target_type: "POST", target_id: id, reaction_type: "LIKE" },
          })
        ).status(),
      ).toBe(401);
    });
  });
  test("invalid post, comment and reaction payloads are rejected", async () => {
    const invalid = await a.post(`${base}/posts`, {
      data: { content: marker },
    });
    if (invalid.status() === 200) {
      const unexpected = (await invalid.json()).data;
      if (Number.isSafeInteger(unexpected?.post_id))
        await a.delete(`${base}/posts/${unexpected.post_id}`);
    }
    expect(invalid.status()).toBe(400);
    await withPost("PUBLIC", async (id) => {
      expect(
        (
          await a.post(`${base}/comments`, {
            data: {
              target_type: "POST",
              target_id: id,
              content: "",
              media_url: "",
            },
          })
        ).status(),
      ).toBe(400);
      expect(
        (
          await a.post(`${base}/react`, {
            data: {
              target_type: "POST",
              target_id: id,
              reaction_type: "INVALID",
            },
          })
        ).status(),
      ).toBe(400);
    });
  });
  test("reactions add, change and remove without inflating counts", async () => {
    await withPost("PUBLIC", async (id) => {
      const react = async (reaction_type: string) =>
        data(
          await a.post(`${base}/react`, {
            data: { target_type: "POST", target_id: id, reaction_type },
          }),
        );
      const liked = await react("LIKE");
      expect(liked.my_reaction).toBe("LIKE");
      expect(liked.total_count).toBe(1);
      const loved = await react("LOVE");
      expect(loved.my_reaction).toBe("LOVE");
      expect(loved.total_count).toBe(1);
      const removed = await react("LOVE");
      expect(removed.my_reaction).not.toBe("LOVE");
      expect(removed.total_count).toBe(0);
    });
  });
  test("friend request send/accept/unfriend and send/decline lifecycle", async () => {
    test.skip(!b, "Cần tài khoản thứ hai để kiểm kết bạn.");
    const sent = await data(
      await a.post(`${base}/friendships/request`, {
        data: { addressee_id: bid },
      }),
    );
    expect(sent.status).toBe("PENDING");
    const received = await data(
      await b.get(`${base}/friendships/requests/received`, {
        params: { limit: 50 },
      }),
    );
    expect(
      received.items.some(
        (item: { requester?: { user_id?: number } }) =>
          item.requester?.user_id === aid,
      ),
    ).toBe(true);
    expect(
      (
        await data(
          await b.post(`${base}/friendships/accept`, {
            data: { requester_id: aid },
          }),
        )
      ).status,
    ).toBe("ACCEPTED");
    expect(
      (
        await data(
          await a.get(`${base}/friendships`, { params: { limit: 50 } }),
        )
      ).items.some((item: { user_id?: number }) => item.user_id === bid),
    ).toBe(true);
    await data(await a.delete(`${base}/friendships/${bid}`));
    await data(
      await b.post(`${base}/friendships/request`, {
        data: { addressee_id: aid },
      }),
    );
    expect(
      (
        await data(
          await a.post(`${base}/friendships/decline`, {
            data: { requester_id: bid },
          }),
        )
      ).status,
    ).toBe("DECLINED");
  });
  test("follow/unfollow updates relationship state and following list", async () => {
    test.skip(!b, "Cần tài khoản thứ hai để kiểm theo dõi.");
    expect((await data(await a.post(`${base}/follows/${bid}`))).following).toBe(
      true,
    );
    expect(
      (
        await data(
          await a.get(`${base}/follows/following`, { params: { limit: 50 } }),
        )
      ).items.some((item: { user_id?: number }) => item.user_id === bid),
    ).toBe(true);
    expect(
      (await data(await a.delete(`${base}/follows/${bid}`))).following,
    ).toBe(false);
  });
  test("block/unblock revokes access and clears friendship/follows", async () => {
    test.skip(!b, "Cần tài khoản thứ hai để kiểm chặn và quyền xem.");
    await withPost("PUBLIC", async (id) => {
      await data(
        await a.post(`${base}/friendships/request`, {
          data: { addressee_id: bid },
        }),
      );
      await data(
        await b.post(`${base}/friendships/accept`, {
          data: { requester_id: aid },
        }),
      );
      await data(await a.post(`${base}/follows/${bid}`));
      expect((await data(await a.post(`${base}/blocks/${bid}`))).blocked).toBe(
        true,
      );
      expect((await b.get(`${base}/posts/${id}`)).status()).toBe(403);
      const relation = (
        await data(await a.get(`${base}/users/${bid}/relationship-stats`))
      ).relationship_with_me;
      expect(relation.blocked).toBe(true);
      expect(relation.friend).toBe(false);
      expect(relation.following).toBe(false);
      expect(
        (await data(await a.delete(`${base}/blocks/${bid}`))).blocked,
      ).toBe(false);
      await data(await b.get(`${base}/posts/${id}`));
    });
  });
  test("search accepts only documented USER/POST filters", async () => {
    for (const type of ["USER", "POST"]) {
      const result = await data(
        await a.get(`${base}/search`, {
          params: { query: marker, type, limit: 10 },
        }),
      );
      expect(Array.isArray(result.items)).toBe(true);
    }
  });
  test("presigns a temporary upload URL without uploading a file", async () => {
    const result = await data(
      await a.post(`${base}/medias/presign`, {
        data: {
          files: [
            {
              file_name: `${marker}.png`,
              file_size: 67,
              content_type: "image/png",
              purpose: "POST",
            },
          ],
        },
      }),
    );
    expect(result.presigned_urls).toHaveLength(1);
    expect(typeof result.presigned_urls[0].object_key).toBe("string");
    expect(typeof result.presigned_urls[0].upload_url).toBe("string");
  });
  test("direct multipart upload attaches synthetic media to an owned post", async () => {
    // Valid 1x1 PNG, no personal file or external URL fixture.
    const uploaded = await data(
      await a.post(`${base}/medias/upload`, {
        params: { purpose: "POST" },
        multipart: {
          file: {
            name: `${marker}.png`,
            mimeType: "image/png",
            buffer: Buffer.from(
              "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC",
              "base64",
            ),
          },
        },
      }),
    );
    const verified = await data(
      await a.post(`${base}/medias/verify`, {
        data: { urls: [uploaded.url] },
      }),
    );
    expect(Array.isArray(verified.missing_urls)).toBe(true);
    expect(verified.missing_urls).not.toContain(uploaded.url);
    let id: number | undefined;
    try {
      const created = await data(
        await a.post(`${base}/posts`, {
          data: {
            content: marker,
            visibility: "ONLY_ME",
            post_type: "SOCIAL_POST",
            media_urls: [
              {
                key: uploaded.object_key,
                url: uploaded.url,
                type: uploaded.media_type,
                size: uploaded.file_size,
                width: uploaded.width,
                height: uploaded.height,
              },
            ],
          },
        }),
      );
      id = created.post_id;
      expect(created.media_urls?.length).toBe(1);
    } finally {
      if (id) await data(await a.delete(`${base}/posts/${id}`));
      else
        test.info().annotations.push({
          type: "cleanup",
          description:
            "Upload hoàn tất nhưng chưa tạo được post; Swagger không có API xóa media rời.",
        });
    }
  });
});
