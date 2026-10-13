import { expect, test, type Page } from "@playwright/test";
import { APP_FRAME, app, commentToggle, expectState, focusParent, open, settle, tab } from "./helpers";

// The app under review runs in its own frame, so focus and keys are split between two documents:
// Stateview's shortcuts belong to the viewer page, and anything typed in the app belongs to the app.

// Owner states have a Remove button for Priya. typical-team is the first state; new-team comes next.
const TYPICAL = "/app/members?sv=typical-team";

function removePriya(page: Page) {
  return app(page).getByRole("button", { name: "Remove Priya Raman", exact: true });
}

test("the skip link moves keyboard focus into the app", async ({ page }) => {
  await open(page, TYPICAL);
  await tab(page);
  await expect(page.locator(":focus")).toHaveAccessibleName("Skip to app");
  await page.keyboard.press("Enter");
  // From the viewer page, focus inside a frame shows as the frame element itself.
  await expect.poll(() => page.evaluate((frame) => document.activeElement?.matches(frame) ?? false, APP_FRAME)).toBe(true);
  await tab(page);
  // The next stop is the app's first one (the team switcher), in the frame's document rather than the bar's.
  await expect(app(page).locator(":focus")).toHaveAccessibleName(/^Halcyon/);
});

test("keys typed in the app stay in the app", async ({ page }) => {
  await open(page, TYPICAL);
  const remove = removePriya(page);
  await remove.focus();
  // Every viewer shortcut except Escape, which has its own test. If all three steps leaked, the net is still one state on.
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("k");
  await page.keyboard.press("j");
  await page.keyboard.press("s");
  await page.keyboard.press("c");
  await settle(page);
  // None of these reached Stateview: same state, no panel, no comment mode.
  await expectState(page, "typical-team");
  // The panel is always mounted, so it can animate out; closed, it's hidden.
  await expect(page.locator("[data-state-panel]")).toBeHidden();
  await expect(commentToggle(page)).toHaveAttribute("aria-pressed", "false");
  await expect(remove).toBeFocused();
});

test("Escape in the app doesn't leave the viewer", async ({ page }) => {
  await open(page, TYPICAL);
  await removePriya(page).focus();
  await page.keyboard.press("Escape");
  await settle(page);
  await expectState(page, "typical-team");
});

test("when the app drops focus, keys still belong to the app", async ({ page }) => {
  await open(page, TYPICAL);
  const remove = removePriya(page);
  await remove.focus();
  await page.keyboard.press("Enter");
  // The sample app removes her row after a short "Removing…" and drops focus to the frame's body.
  await expect(remove).toHaveCount(0);
  await expect.poll(() => app(page).locator("body").evaluate((body) => body.ownerDocument.activeElement === body)).toBe(true);
  // Keys now land on the frame's body: still the app's, so Stateview ignores them.
  await page.keyboard.press("Escape");
  await page.keyboard.press("k");
  await settle(page);
  await expectState(page, "typical-team");
  // The screen wasn't re-rendered from its inputs either, which would bring Priya back.
  await expect(remove).toHaveCount(0);
});

test("stepping with the bar's Next state button keeps focus on it", async ({ page }) => {
  await open(page, TYPICAL);
  const next = page.locator('header[aria-label="Review"]').getByRole("button", { name: "Next state", exact: true });
  await next.focus();
  await page.keyboard.press("Enter");
  await expectState(page, "new-team");
  // The frame rendering a new state must not pull focus away from the bar.
  await expect(next).toBeFocused();
});

test("shortcuts work from the viewer page", async ({ page }) => {
  await open(page, TYPICAL);
  await focusParent(page);
  await page.keyboard.press("k");
  await expectState(page, "new-team");
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL((url) => url.pathname === "/");
});

test("Escape on the viewer page while commenting ends comment mode and stays", async ({ page }) => {
  await open(page, TYPICAL);
  await focusParent(page);
  await page.keyboard.press("c");
  const toggle = commentToggle(page);
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await settle(page);
  await expectState(page, "typical-team");
});

test("Escape in the app while commenting ends comment mode and stays", async ({ page }) => {
  await open(page, TYPICAL);
  await page.keyboard.press("c");
  const toggle = commentToggle(page);
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await removePriya(page).focus();
  await page.keyboard.press("Escape");
  // The frame tells the bar comment mode ended.
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await settle(page);
  await expectState(page, "typical-team");
});

test.describe("media queries see the frame, not the viewer", () => {
  // The phone frame opens at DEVICE_SIZE.initial (src/stateview/device-size.ts), the iPhone 15's 393 CSS px.
  test("a phone state gets a phone-sized window", async ({ page }) => {
    await open(page, "/app/members?sv=mobile");
    const box = await page.locator(APP_FRAME).boundingBox();
    expect(Math.round(box?.width ?? 0)).toBe(393);
    const inside = await app(page)
      .locator("body")
      .evaluate(() => ({ width: window.innerWidth, phone: window.matchMedia("(max-width: 767px)").matches }));
    expect(inside).toEqual({ width: 393, phone: true });
  });

  test("a desktop state gets the room beside the filmstrip", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, TYPICAL);
    const width = await app(page)
      .locator("body")
      .evaluate(() => window.innerWidth);
    expect(width).toBeGreaterThan(768);
    expect(width).toBeLessThan(1440);
  });
});
