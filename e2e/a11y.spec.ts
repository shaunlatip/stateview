import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { APP_FRAME, DEV_CHROME, WCAG_TAGS, app, commentToggle, describeViolations, open } from "./helpers";

// Routes to check. Add stateful URLs too (e.g. "/?state=empty") so empty,
// error and loading states get the same scan as the default view.
// `viewer` routes render the app in a frame; the hub and an unknown state don't.
const routes = [
  { route: "/", viewer: false },
  { route: "/app/members?sv=viewer-view", viewer: true },
  { route: "/app/members?sv=invite-flow&step=3", viewer: true },
  { route: "/app/members?sv=nope", viewer: false },
];

for (const { route, viewer } of routes) {
  test.describe(`a11y ${route}`, () => {
    test("has no WCAG A/AA violations", async ({ page }) => {
      await open(page, route, { viewer });
      // AxeBuilder scans iframes by default, so the app in the viewer's frame is part of this scan.
      let axe = new AxeBuilder({ page }).withTags(WCAG_TAGS);
      for (const sel of DEV_CHROME) {
        axe = axe.exclude(sel);
        // A plain selector only reaches the top document; dev tools in the frame need a frame selector.
        if (viewer) axe = axe.exclude([APP_FRAME, sel]);
      }
      const { violations } = await axe.analyze();
      expect(describeViolations(violations)).toEqual([]);
    });

    test("is reachable by keyboard with a visible focus indicator", async ({ page }) => {
      await open(page, route, { viewer });
      await page.keyboard.press("Tab");
      const focused = page.locator(":focus");
      test.skip((await focused.count()) === 0, "no focusable element on this route yet");
      if (viewer) {
        // The viewer's first stop is the skip link, hidden until focused. toBeVisible alone passes a
        // 1px visually-hidden link, so check it's actually on screen at a readable size.
        await expect(focused).toHaveAccessibleName("Skip to app");
        await expect(focused).toBeInViewport();
        await expect
          .poll(async () => {
            const box = await focused.boundingBox();
            return box !== null && box.width > 8 && box.height > 8;
          }, { message: "skip link should be shown when focused" })
          .toBe(true);
      }
      await expect(focused).toBeVisible();
      const indicator = await focused.evaluate((el) => {
        const s = getComputedStyle(el);
        return { outline: s.outlineStyle !== "none" && Number.parseFloat(s.outlineWidth) > 0, shadow: s.boxShadow !== "none" };
      });
      expect(indicator.outline || indicator.shadow, "first tab stop should show a focus ring").toBe(true);
    });

    test("does not scroll sideways on a phone", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await open(page, route, { viewer });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  });
}

test.describe("a11y commenting", () => {
  test("a comment can be made by keyboard inside the app, and the composer passes axe", async ({ page }) => {
    await open(page, "/app/members?sv=viewer-view");
    // Comment mode is switched on from the viewer page; the comment engine lives in the app's frame.
    await page.keyboard.press("c");
    await expect(commentToggle(page)).toHaveAttribute("aria-pressed", "true");
    const frame = app(page);
    const remove = frame.getByRole("button", { name: "Remove Priya Raman", exact: true });
    await remove.focus();
    await page.keyboard.press("Enter");
    const composer = frame.getByRole("dialog");
    await expect(composer).toBeVisible();
    await expect(composer.getByRole("textbox", { name: "Comment" })).toBeFocused();
    // Comment mode stops the screen reacting: Enter opened the composer instead of removing Priya.
    await expect(remove).toBeVisible();
    // Scan the composer at rest: mid-fade, its text measures lighter than it is. The animations run in the frame's document.
    await expect
      .poll(() => composer.evaluate((el) => el.ownerDocument.getAnimations().every((animation) => animation.playState !== "running")))
      .toBe(true);

    const { violations } = await new AxeBuilder({ page }).include([APP_FRAME, "[role=dialog]"]).withTags(WCAG_TAGS).analyze();
    expect(describeViolations(violations)).toEqual([]);

    await page.keyboard.type("Viewers shouldn't see this");
    await page.keyboard.press("Enter");
    await expect(composer).toBeHidden();
    await expect(frame.getByRole("button", { name: /^Comment 1 on Remove Priya Raman button/ })).toBeVisible();
    // Focus goes back to where the reviewer was, inside the app.
    await expect(remove).toBeFocused();
  });
});

// The state panel only exists once opened, so the route scans above never see it. It stays on the viewer page, outside the frame.
for (const width of [1440, 375]) {
  test(`state panel at ${width}px has no WCAG A/AA violations and fits`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await open(page, "/app/members?sv=viewer-view");
    await page.keyboard.press("s");
    const panel = page.locator("[data-state-panel]");
    await expect(panel).toBeFocused();
    const { violations } = await new AxeBuilder({ page }).include("[data-state-panel]").withTags(WCAG_TAGS).analyze();
    expect(describeViolations(violations)).toEqual([]);
    const overflow = await panel.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
