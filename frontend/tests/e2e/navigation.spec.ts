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
      "/search",
      "/chat",
      "/question-bank",
      "/submissions",
      "/videos",
      ...(role === "LECTURER"
        ? ["/lecturer/reviews", "/lecturer/exams", "/lecturer/course-classes"]
        : []),
      "/me",
      "/notifications",
      "/settings/devices",
      "/settings/notifications",
    ];
    const destinations = [
      "/question-bank",
      "/notifications",
      "/search",
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
