import { test, expect, signIn, openNavigation, profile } from "./fixtures";
import { installSocialMock, socialState, peer, goTo } from "./social-fixture";

// Entire suite uses isolated in-memory HTTP mocks. No real accounts or backend requests.
test("feed resolves post targets and loads the next server cursor", async ({
  page,
}, info) => {
  const state = socialState();
  await installSocialMock(page, state);
  await signIn(page);
  await goTo(page, "/");
  await expect(
    page.getByText("Cùng thảo luận về cấu trúc dữ liệu nhé!", { exact: true }),
  ).toBeVisible();
  const next = page.waitForRequest(
    (request) =>
      request.url().includes("/activity-feeds?") &&
      new URL(request.url()).searchParams.has("after"),
  );
  await page.getByRole("button", { name: "Xem thêm", exact: true }).click();
  expect(new URL((await next).url()).searchParams.get("after")).toBe("910");
  await expect(
    page.getByText("Một góc nhìn mới về thuật toán đồ thị.", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath("feed.png"), fullPage: true });
});

test("creates, edits and deletes an owned post with confirmation and privacy", async ({
  page,
}) => {
  const state = socialState();
  await installSocialMock(page, state);
  await signIn(page);
  await goTo(page, "/posts/new");
  await page
    .getByLabel("Nội dung bài viết", { exact: true })
    .fill("Ghi chú học tập hôm nay");
  await page.getByLabel("Quyền riêng tư").selectOption("FRIENDS");
  const create = page.waitForRequest(
    (request) =>
      request.url().endsWith("/posts") && request.method() === "POST",
  );
  await page.getByRole("button", { name: "Đăng bài", exact: true }).click();
  expect((await create).postDataJSON()).toMatchObject({
    content: "Ghi chú học tập hôm nay",
    visibility: "FRIENDS",
    post_type: "SOCIAL_POST",
    media_urls: [],
  });
  await expect(page).toHaveURL("/posts/100");
  await page.getByRole("link", { name: "Sửa bài viết", exact: true }).click();
  await page
    .getByLabel("Nội dung bài viết", { exact: true })
    .fill("Ghi chú đã cập nhật");
  await page.getByLabel("Quyền riêng tư").selectOption("ONLY_ME");
  await page.getByRole("button", { name: "Lưu bài viết", exact: true }).click();
  await expect(page).toHaveURL("/posts/100");
  await expect(
    page.getByText("Ghi chú đã cập nhật", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".post-meta")).toContainText("Chỉ mình tôi");
  await page.getByRole("button", { name: "Xóa bài viết", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Hủy", exact: true })
    .click();
  expect(state.posts.has(100)).toBe(true);
  await page.getByRole("button", { name: "Xóa bài viết", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xóa bài viết", exact: true })
    .click();
  await expect(page).toHaveURL("/my-posts");
  await expect(
    page.getByText("Bạn chưa có bài viết nào.", { exact: false }),
  ).toBeVisible();
  expect(state.posts.has(100)).toBe(false);
});

test("uploads a multipart attachment and sends only documented media fields", async ({
  page,
}) => {
  const state = socialState();
  await installSocialMock(page, state);
  await signIn(page);
  await goTo(page, "/posts/new");
  await page.getByRole("button", { name: "Đăng bài", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Hãy viết nội dung hoặc đính kèm",
  );
  const upload = page.waitForRequest("**/medias/upload?purpose=POST");
  await page.getByLabel("Chọn tệp đính kèm").setInputFiles({
    name: "lecture.png",
    mimeType: "image/png",
    buffer: Buffer.from("mock-image"),
  });
  expect((await upload).headers()["content-type"]).toContain(
    "multipart/form-data; boundary=",
  );
  await expect(page.getByText("lecture.png", { exact: true })).toBeVisible();
  const create = page.waitForRequest(
    (request) =>
      request.url().endsWith("/posts") && request.method() === "POST",
  );
  await page.getByRole("button", { name: "Đăng bài", exact: true }).click();
  const payload = (await create).postDataJSON();
  expect(payload.media_urls).toEqual([
    {
      key: "test/photo.png",
      url: "http://127.0.0.1:4173/mock-media/photo.png",
      type: "IMAGE",
      size: 68,
      name: "lecture.png",
    },
  ]);
  await expect(page.getByAltText("lecture.png")).toBeVisible();
});

test("comment, reply, edit and delete use owner rules; reactions toggle with authoritative counts", async ({
  page,
}) => {
  const state = socialState();
  await installSocialMock(page, state);
  await signIn(page);
  await goTo(page, "/posts/10");
  await page
    .getByLabel("Nội dung bình luận", { exact: true })
    .fill("Mình có một cách giải khác.");
  await page
    .getByRole("button", { name: "Gửi bình luận", exact: true })
    .click();
  await expect(
    page.getByText("Mình có một cách giải khác.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Trả lời", exact: true }).click();
  await page
    .getByLabel("Nội dung phản hồi", { exact: true })
    .fill("Mình bổ sung ví dụ ở đây.");
  await page.getByRole("button", { name: "Gửi phản hồi", exact: true }).click();
  await expect(
    page.getByText("Mình bổ sung ví dụ ở đây.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Sửa bình luận", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Nội dung bình luận đã sửa")
    .fill("Đã bổ sung lời giải chi tiết.");
  await page
    .getByRole("button", { name: "Lưu bình luận", exact: true })
    .click();
  await expect(
    page.getByText("Đã bổ sung lời giải chi tiết.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Thích", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Thích/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText("1 cảm xúc", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Yêu thích/ }).click();
  await expect(
    page.getByRole("button", { name: /^Yêu thích/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("1 cảm xúc", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Yêu thích/ }).click();
  await expect(page.getByText("0 cảm xúc", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Xóa bình luận", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xóa bình luận", exact: true })
    .click();
  await expect(
    page.getByText("Bình luận đã được xóa.", { exact: true }),
  ).toBeVisible();
});

test("hides edit/delete for another author and rejects direct edit routes", async ({
  page,
}) => {
  const state = socialState();
  state.comments.set(50, {
    comment_id: 50,
    target_type: "POST",
    target_id: 10,
    content: "Bình luận của người khác",
    author: { user_id: 202, full_name: peer.full_name },
    created_at: "2026-10-27T04:00:00Z",
  });
  await installSocialMock(page, state);
  await signIn(page);
  await goTo(page, "/posts/10");
  await expect(
    page.getByText("Bình luận của người khác", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sửa bài viết", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Xóa bài viết", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Sửa bình luận", exact: true }),
  ).toHaveCount(0);
  await goTo(page, "/posts/10/edit");
  await expect(page.getByRole("alert")).toContainText(
    "Bạn chỉ được chỉnh sửa bài viết của chính mình",
  );
  expect(
    state.operations.some((operation) => operation.startsWith("PUT ")),
  ).toBe(false);
});

test("private or blocked posts display an access error and no discussion form", async ({
  page,
}) => {
  const state = socialState();
  state.posts.get(10)!.visibility = "ONLY_ME";
  await installSocialMock(page, state);
  await signIn(page);
  await goTo(page, "/posts/10");
  await expect(page.getByRole("alert")).toContainText(
    "quyền riêng tư hoặc chặn",
  );
  await expect(
    page.getByLabel("Nội dung bình luận", { exact: true }),
  ).toHaveCount(0);
});

test("friend request is sent by one session and accepted by another", async ({
  page,
  browser,
}) => {
  const state = socialState();
  await installSocialMock(page, state);
  await signIn(page);
  await goTo(page, "/users/202");
  const request = page.waitForRequest("**/friendships/request");
  await page.getByRole("button", { name: "Kết bạn", exact: true }).click();
  expect((await request).postDataJSON()).toEqual({ addressee_id: 202 });
  await expect(
    page.getByText("Lời mời đang chờ", { exact: true }),
  ).toBeVisible();
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
  });
  try {
    const other = await context.newPage();
    await installSocialMock(other, state, 202);
    await other.goto("/login");
    await other.getByLabel("Email", { exact: true }).fill(peer.email);
    await other
      .getByLabel("Mật khẩu", { exact: true })
      .fill("mock-peer-password");
    await other.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(other).toHaveURL("/me");
    await goTo(other, "/friends?tab=received");
    await expect(
      other.getByRole("heading", { name: profile.full_name }),
    ).toBeVisible();
    const accept = other.waitForRequest("**/friendships/accept");
    await other.getByRole("button", { name: "Chấp nhận", exact: true }).click();
    expect((await accept).postDataJSON()).toEqual({ requester_id: 101 });
    await expect(
      other.getByRole("heading", { name: "Danh sách đang trống" }),
    ).toBeVisible();
    await page.reload(); // Memory-only auth requires signing in again after a full reload.
    await expect(page).toHaveURL("/login");
    await signIn(page, "/users/202");
    await goTo(page, "/users/202");
    await page
      .getByRole("button", { name: "Hủy kết bạn", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Hủy kết bạn", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Kết bạn", exact: true }),
    ).toBeEnabled();
    expect(state.friends).toBe(false);
  } finally {
    await context.close();
  }
});

test("declines an incoming request and lists outgoing pending requests", async ({
  page,
}) => {
  const state = socialState();
  state.requests.set(202, "PENDING");
  await installSocialMock(page, state);
  await signIn(page);
  await goTo(page, "/friends?tab=received");
  await page.getByRole("button", { name: "Từ chối", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Từ chối", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Danh sách đang trống" }),
  ).toBeVisible();
  state.requests.set(101, "PENDING");
  await page
    .getByRole("button", { name: "Lời mời đã gửi", exact: true })
    .click();
  await expect(
    page.getByText("Đang chờ phản hồi", { exact: true }),
  ).toBeVisible();
});

test("follows and unfollows with server relationship state", async ({
  page,
}) => {
  const state = socialState();
  await installSocialMock(page, state);
  await signIn(page);
  await goTo(page, "/users/202");
  await page.getByRole("button", { name: "Theo dõi", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Bỏ theo dõi", exact: true }),
  ).toBeEnabled();
  await goTo(page, "/friends?tab=following");
  await expect(
    page.getByRole("heading", { name: peer.full_name }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Xem trang cá nhân" }).click();
  await page.getByRole("button", { name: "Bỏ theo dõi", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Theo dõi", exact: true }),
  ).toBeEnabled();
  expect(state.following.has(101)).toBe(false);
});

test("block removes stale social content and unblock restores access without restoring relationships", async ({
  page,
}) => {
  const state = socialState();
  state.friends = true;
  state.following.add(101);
  await installSocialMock(page, state);
  await signIn(page);
  await goTo(page, "/users/202");
  await expect(
    page.getByText("Cùng thảo luận về cấu trúc dữ liệu nhé!", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Chặn", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "hủy kết bạn và hủy theo dõi hai chiều",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Chặn người dùng", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Bạn đang chặn người dùng này" }),
  ).toBeVisible();
  await expect(
    page.getByText("Cùng thảo luận về cấu trúc dữ liệu nhé!", { exact: true }),
  ).toHaveCount(0);
  await goTo(page, "/friends?tab=blocked");
  await page.getByRole("button", { name: "Bỏ chặn", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Bỏ chặn", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Danh sách đang trống" }),
  ).toBeVisible();
  await goTo(page, "/users/202");
  await expect(
    page.getByRole("button", { name: "Kết bạn", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Theo dõi", exact: true }),
  ).toBeEnabled();
});

test("searches only supported user/post types and follows offset pagination", async ({
  page,
}) => {
  const state = socialState();
  await installSocialMock(page, state);
  await signIn(page);
  await goTo(page, "/search");
  await page.getByLabel("Từ khóa tìm kiếm").fill("Nam");
  const request = page.waitForRequest("**/search?**");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  expect(new URL((await request).url()).searchParams.get("type")).toBe("USER");
  await expect(
    page.getByRole("heading", { name: peer.full_name }),
  ).toBeVisible();
  await page.getByLabel("Từ khóa tìm kiếm").fill("về");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await page.getByRole("button", { name: "Bài viết", exact: true }).click();
  await expect(
    page.getByText("Cùng thảo luận về cấu trúc dữ liệu nhé!", { exact: true }),
  ).toBeVisible();
  const next = page.waitForRequest(
    (request) =>
      request.url().includes("/search?") &&
      new URL(request.url()).searchParams.get("after") === "1",
  );
  await page.getByRole("button", { name: "Xem thêm", exact: true }).click();
  await next;
  await expect(
    page.getByText("Một góc nhìn mới về thuật toán đồ thị.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Từ khóa tìm kiếm").fill("không-có-kết-quả");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Chưa tìm thấy kết quả" }),
  ).toBeVisible();
});

test("feed empty/error, search error and mutation draft preservation are recoverable", async ({
  page,
}) => {
  const state = socialState();
  state.posts.clear();
  await installSocialMock(page, state);
  await signIn(page);
  await goTo(page, "/");
  await expect(
    page.getByRole("heading", { name: "Kết nối để khám phá thêm" }),
  ).toBeVisible();
  await page.route("**/activity-feeds?**", (route) =>
    route.fulfill({ status: 503, json: { code: "ERROR" } }),
  );
  await page.getByRole("button", { name: "Làm mới bảng tin" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page
    .getByLabel("Nội dung bài viết", { exact: true })
    .fill("Bản nháp cần được giữ lại");
  await page.route("**/api/v1/posts", (route) =>
    route.fulfill({ status: 500, json: { code: "ERROR" } }),
  );
  await page.getByRole("button", { name: "Đăng bài", exact: true }).click();
  await expect(
    page.getByLabel("Nội dung bài viết", { exact: true }),
  ).toHaveValue("Bản nháp cần được giữ lại");
  await page.route("**/search?**", (route) =>
    route.fulfill({ status: 503, json: { code: "ERROR" } }),
  );
  await goTo(page, "/search?query=Nam&type=USER");
  await expect(
    page.getByRole("heading", { name: "Tìm kiếm", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toBeVisible();
});

test("social pages stay responsive and protected navigation exposes only implemented modules", async ({
  page,
}, info) => {
  const state = socialState();
  await installSocialMock(page, state);
  await signIn(page);
  for (const path of [
    "/",
    "/posts/10",
    "/friends",
    "/search",
    "/users/202",
    "/posts/new",
  ]) {
    await goTo(page, path);
    for (const width of [320, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await expect
        .poll(
          () =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          { message: `${path} at ${width}px` },
        )
        .toBe(true);
    }
  }
  await page.setViewportSize({
    width: info.project.name === "ui-mobile" ? 393 : 1280,
    height: 900,
  });
  await goTo(page, "/friends?tab=following");
  await expect(
    page.getByRole("link", { name: "Tin nhắn", exact: true }),
  ).toBeVisible();
  await openNavigation(page);
  await expect(
    page.getByRole("link", { name: "Bảng tin", exact: true }),
  ).toBeVisible();
});

test("comment validation and failed writes preserve drafts without automatic retry", async ({
  page,
}) => {
  const state = socialState();
  await installSocialMock(page, state);
  await signIn(page);
  await goTo(page, "/posts/10");
  await page
    .getByRole("button", { name: "Gửi bình luận", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Bình luận cần có nội dung hoặc ảnh",
  );
  expect(
    state.operations.filter((operation) => operation === "POST /comments"),
  ).toHaveLength(0);
  let calls = 0;
  await page.route("**/api/v1/comments", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    calls++;
    return route.fulfill({ status: 500, json: { code: "ERROR" } });
  });
  await page
    .getByLabel("Nội dung bình luận", { exact: true })
    .fill("Bản nháp bình luận");
  await page
    .getByRole("button", { name: "Gửi bình luận", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Đã có lỗi xảy ra");
  await expect(
    page.getByLabel("Nội dung bình luận", { exact: true }),
  ).toHaveValue("Bản nháp bình luận");
  expect(calls).toBe(1);
});

test("does not guess initial reaction type and prevents cross-role friend requests", async ({
  page,
}) => {
  const state = socialState();
  state.reactions.set("10:101", "WOW");
  await installSocialMock(page, state);
  await signIn(page);
  await goTo(page, "/posts/10");
  await expect(
    page.getByText("Bạn đã bày tỏ cảm xúc", { exact: true }),
  ).toBeVisible();
  for (const label of ["Thích", "Yêu thích", "Wow"])
    await expect(
      page.getByRole("button", { name: label, exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
  await page.route("**/api/v1/users/202", (route) =>
    route.fulfill({
      json: { code: "1000", data: { ...peer, role: "LECTURER" } },
    }),
  );
  await goTo(page, "/users/202");
  await expect(
    page.getByRole("button", { name: "Kết bạn", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Theo dõi", exact: true }),
  ).toBeEnabled();
});
