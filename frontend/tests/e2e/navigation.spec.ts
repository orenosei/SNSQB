import { test, expect, signIn, openNavigation } from "./fixtures";
import { academicState, installAcademicMock } from "./academic-fixture";

for (const role of ["STUDENT", "LECTURER"] as const) {
  test(`sidebar preserves link order and scroll position across workspaces for ${role}`, async ({
    page,
  }) => {
    await installAcademicMock(page, academicState(), role);
    await signIn(page);
    const mobile = page.viewportSize()!.width < 768;
    const expectedLinks = [
      "/",
      "/my-posts",
      "/friends",
      "/question-bank",
      "/submissions",
      "/practice-catalog",
      "/videos",
      ...(role === "LECTURER"
        ? ["/lecturer/reviews", "/lecturer/exams", "/lecturer/course-classes"]
        : []),
      "/me",
      "/notifications",
      "/rewards",
      "/badges",
      "/cosmetics",
      "/settings/devices",
      "/settings/notifications",
    ];
    const destinations = [
      "/question-bank",
      "/notifications",
      ...(role === "LECTURER" ? ["/lecturer/reviews"] : []),
    ];

    for (const destination of destinations) {
      if (mobile) await openNavigation(page);
      const navigation = mobile
        ? page.locator("#mobile-navigation")
        : page.getByRole("complementary", { name: "Điều hướng không gian" });
      const links = navigation.locator("a.nav-item");
      await expect(links).toHaveCount(expectedLinks.length);
      const layout = () =>
        links.evaluateAll((elements) =>
          elements.map((element) => ({
            href: element.getAttribute("href"),
            top: (element as HTMLElement).offsetTop,
          })),
        );
      expect((await layout()).map((link) => link.href)).toEqual(expectedLinks);
      const initialLayout = await layout();
      const target = navigation.locator(`a[href="${destination}"]`);
      await target.scrollIntoViewIfNeeded();
      const scroller = navigation.locator(".sidebar-top");
      const initialScroll = mobile
        ? 0
        : await scroller.evaluate((element) => element.scrollTop);
      await target.click();
      await expect(page).toHaveURL(destination);
      if (mobile) await openNavigation(page);
      await expect(navigation.locator(`a[href="${destination}"]`)).toHaveClass(
        /nav-active/,
      );
      expect(await layout()).toEqual(initialLayout);
      if (!mobile) {
        await expect
          .poll(() => scroller.evaluate((element) => element.scrollTop))
          .toBe(initialScroll);
      } else {
        await page.keyboard.press("Escape");
        await expect(
          page.getByRole("dialog", { name: "Điều hướng SNSQB" }),
        ).not.toBeVisible();
      }
    }
  });
}

test("header keeps search, messages and notifications in order on narrow and wide screens", async ({ page }) => {
  await signIn(page);
  const header = page.getByRole("banner");
  const messages = header.getByRole("link", { name: "Tin nhắn", exact: true });
  const notifications = header.getByRole("link", { name: "Thông báo", exact: true });

  for (const width of [320, 1024, 1440]) {
    await page.setViewportSize({ width, height: 657 });
    const search = width <= 1150
      ? header.getByRole("link", { name: "Tìm kiếm", exact: true })
      : header.getByRole("search");
    await expect(search).toBeVisible();
    await expect(messages).toBeInViewport({ ratio: 1 });
    await expect(notifications).toBeInViewport({ ratio: 1 });
    expect((await search.boundingBox())!.x).toBeLessThan((await messages.boundingBox())!.x);
    expect((await messages.boundingBox())!.x).toBeLessThan((await notifications.boundingBox())!.x);
  }

  await expect(messages).toHaveAttribute("href", "/chat");
});
