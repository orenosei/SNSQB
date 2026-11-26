import { test, expect, ok, openNavigation, signIn } from "./fixtures";

test("checks in and submits a prediction for an eligible class", async ({
  page,
}) => {
  let checkedIn = false;
  let predicted = false;
  await page.route("**/api/v1/games/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (path.endsWith("/check-in")) {
      if (method === "POST") {
        checkedIn = true;
        return route.fulfill({ json: ok({ coin_earned: 5 }) });
      }
      return route.fulfill({
        json: ok({
          has_checked_in_today: checkedIn,
          current_streak: checkedIn ? 4 : 3,
        }),
      });
    }
    if (path.endsWith("/game-1/classes")) {
      return route.fulfill({
        json: ok([
          {
            course_class_id: 9,
            class_code: "9001",
            subject_name: "Lập trình",
            already_predicted: predicted,
            predicted_count: predicted ? 5 : null,
          },
        ]),
      });
    }
    if (path.endsWith("/participants")) {
      expect(route.request().postDataJSON()).toEqual({
        course_class_id: 9,
        predicted_count: 5,
      });
      predicted = true;
      return route.fulfill({ json: ok({ prediction_id: 23 }) });
    }
    return route.fulfill({
      json: ok({
        contents: predicted
          ? [
              {
                prediction_id: 23,
                game_type: "GAME_1_PARTICIPANTS",
                status: "PENDING",
              },
            ]
          : [],
      }),
    });
  });
  await signIn(page);
  await openNavigation(page);
  await page.getByRole("link", { name: "Hoạt động & thành tích" }).click();
  await page.getByRole("button", { name: "Điểm danh", exact: true }).click();
  await expect(page.getByText("Đã nhận 5 xu.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Đã điểm danh hôm nay" }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "Dự đoán", exact: true }).click();
  await page.getByLabel("Lớp học phần").selectOption("9");
  await page.getByLabel("Số người dự đoán").fill("5");
  await page.getByRole("button", { name: "Gửi dự đoán" }).click();
  await expect(page.getByText("Đã dự đoán 5 người.")).toBeVisible();
  await expect(page.getByText("Đang chờ kết quả")).toBeVisible();
});

test("views personal badge details and loads the ranking", async ({ page }) => {
  const badge = { badge_id: 2, name: "Người đóng góp", badge_tier: "GOLD" };
  await page.route("**/api/v1/games/check-in", (route) =>
    route.fulfill({ json: ok({ current_streak: 0 }) }),
  );
  await page.route("**/api/v1/badges/**", (route) =>
    route.fulfill({
      json: ok(
        route.request().url().endsWith("/me")
          ? [badge]
          : { ...badge, total_earned_users: 12 },
      ),
    }),
  );
  await page.route("**/api/v1/subjects", (route) =>
    route.fulfill({ json: ok([{ subject_id: 7, name: "Giải tích" }]) }),
  );
  await page.route(
    (url) => url.pathname === "/api/v1/games/leaderboard",
    (route) => {
      const subject = new URL(route.request().url()).searchParams.get(
        "subject_id",
      );
      return route.fulfill({
        json: ok({
          entries: [
            {
              user_id: 21,
              full_name: subject ? "Hạng theo môn" : "Hạng học kỳ",
              rank: 1,
            },
          ],
          my_rank: { rank: 5 },
        }),
      });
    },
  );
  await signIn(page);
  await page
    .locator(".stats-card")
    .getByRole("link", { name: "Huy hiệu" })
    .click();
  await page.getByRole("link", { name: badge.name }).click();
  await expect(page.getByText("12 người đã nhận")).toBeVisible();
  await openNavigation(page);
  await page.getByRole("link", { name: "Hoạt động & thành tích" }).click();
  await page.getByRole("link", { name: "Xếp hạng" }).click();
  await expect(page.getByRole("link", { name: "Hạng học kỳ" })).toBeVisible();
  await page.getByLabel("Phạm vi xếp hạng").selectOption("7");
  await expect(page.getByRole("link", { name: "Hạng theo môn" })).toBeVisible();
});

test("buys, equips and removes a cosmetic using server state", async ({
  page,
}) => {
  const item = {
    cosmetic_id: 8,
    name: "Khung lá",
    type: "AVATAR_FRAME",
    price: 30,
  };
  let owned = false;
  let equipped = false;
  await page.route("**/api/v1/cosmetics/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/shop"))
      return route.fulfill({
        json: ok({
          items: [{ ...item, owned }],
          user_points: owned ? 70 : 100,
        }),
      });
    if (path.endsWith("/my-inventory"))
      return route.fulfill({
        json: ok({
          inventory: owned ? [item] : [],
          currently_equipped: equipped ? { AVATAR_FRAME: item } : {},
        }),
      });
    if (path.endsWith("/8/buy")) owned = true;
    else {
      expect(route.request().postDataJSON()).toEqual({ cosmetic_id: 8 });
      equipped = path.endsWith("/equip");
    }
    return route.fulfill({ json: ok(item) });
  });
  await signIn(page);
  await openNavigation(page);
  await page.getByRole("link", { name: "Vật phẩm trang trí" }).click();
  await page.getByRole("button", { name: "Mua · 30 xu" }).click();
  await page.getByRole("button", { name: "Xác nhận mua" }).click();
  await expect(page.getByRole("button", { name: "Đã sở hữu" })).toBeDisabled();
  await page.getByRole("link", { name: "Kho của tôi" }).click();
  await page.getByRole("button", { name: "Trang bị", exact: true }).click();
  await page.getByRole("button", { name: "Tháo vật phẩm" }).click();
  await expect(
    page.getByRole("button", { name: "Trang bị", exact: true }),
  ).toBeEnabled();
});

test("filters the practice catalog and preserves the filter when loading more", async ({
  page,
}) => {
  await page.route("**/api/v1/subjects", (route) =>
    route.fulfill({ json: ok([{ subject_id: 7, name: "Giải tích" }]) }),
  );
  await page.route("**/api/v1/subjects/7/topics", (route) =>
    route.fulfill({ json: ok([{ id: 10, name: "Tích phân", active: true }]) }),
  );
  await page.route(
    (url) => url.pathname === "/api/v1/sessions/practice-catalog",
    (route) => {
      const params = new URL(route.request().url()).searchParams;
      if (!params.has("subject_id"))
        return route.fulfill({ json: ok({ contents: [] }) });
      expect(params.get("subject_id")).toBe("7");
      const next = params.get("after") === "31";
      return route.fulfill({
        json: ok({
          contents: [
            {
              session_id: next ? 32 : 31,
              title: next ? "Bộ nâng cao" : "Bộ cơ bản",
              question_counts: 4,
            },
          ],
          pagination: { after: 31, has_next: !next },
        }),
      });
    },
  );
  await signIn(page);
  await openNavigation(page);
  await page.getByRole("link", { name: "Kho luyện tập" }).click();
  await page.getByRole("combobox", { name: "Môn học", exact: true }).selectOption("7");
  await expect(page.getByText("Tích phân")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bộ cơ bản" })).toBeVisible();
  await page.getByRole("button", { name: "Xem thêm" }).click();
  await expect(
    page.getByRole("heading", { name: "Bộ nâng cao" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Mở bộ & luyện tập" }).last(),
  ).toHaveAttribute("href", "/practice/32");
});

test("displays presence and accepts a chat group invitation", async ({
  page,
}) => {
  let accepted = false;
  await page.route(/\/api\/v1\/conversations(?:\/|\?|$)/, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/presence")) {
      expect(url.searchParams.get("conversation_ids")).toBe("3");
      return route.fulfill({
        json: ok([{ conversation_id: 3, active: true }]),
      });
    }
    if (url.pathname.endsWith("/invitations")) {
      return route.fulfill({
        json: ok({
          items: accepted
            ? []
            : [{ invitation_id: 19, group_name: "Nhóm ôn thi" }],
        }),
      });
    }
    if (url.pathname.endsWith("/19/accept")) {
      accepted = true;
      return route.fulfill({ json: ok(17) });
    }
    if (url.pathname.endsWith("/17/messages"))
      return route.fulfill({ json: ok({ messages: [] }) });
    return route.fulfill({
      json: ok({
        items: [
          { conversation_id: 3, type: "DIRECT", display_name: "Bạn học" },
          ...(accepted
            ? [
                {
                  conversation_id: 17,
                  type: "GROUP",
                  display_name: "Nhóm ôn thi",
                },
              ]
            : []),
        ],
      }),
    });
  });
  await signIn(page);
  await page
    .getByRole("link", { name: "Tin nhắn", exact: true })
    .first()
    .click();
  await expect(page.getByText("Đang hoạt động", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Lời mời vào nhóm" }).click();
  const dialog = page.getByRole("dialog", { name: "Lời mời vào nhóm" });
  await expect(dialog.getByText("Nhóm ôn thi")).toBeVisible();
  await dialog.getByRole("button", { name: "Chấp nhận" }).click();
  await expect(page).toHaveURL(/\/chat\?id=17$/);
  await expect(dialog).toBeHidden();
});

test("requires confirmation before requesting deletion and cancels the schedule", async ({
  page,
}) => {
  let scheduled = false;
  let requests = 0;
  await page.route(/\/api\/v1\/users\/me(?:\/deletion)?$/, async (route) => {
    const method = route.request().method();
    const deletion = route.request().url().endsWith("/deletion");
    if (method === "GET" && !deletion) return route.fallback();
    if (method === "DELETE") {
      requests++;
      scheduled = !deletion;
    }
    return route.fulfill({
      json: ok({
        scheduled_for: scheduled ? "2040-01-20T07:00:00Z" : null,
        can_cancel: scheduled,
      }),
    });
  });
  await signIn(page);
  await page.getByRole("link", { name: "Xóa tài khoản" }).click();
  await page.getByRole("button", { name: "Yêu cầu xóa tài khoản" }).click();
  await expect(
    page.getByRole("dialog", { name: "Lên lịch xóa tài khoản" }),
  ).toBeVisible();
  expect(requests).toBe(0);
  await page.getByRole("button", { name: "Xác nhận yêu cầu xóa" }).click();
  await expect(
    page.getByRole("heading", { name: "Đã lên lịch xóa" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hủy yêu cầu xóa" }).click();
  await expect(page.getByText("Đã hủy yêu cầu xóa tài khoản.")).toBeVisible();
  expect(requests).toBe(2);
});
