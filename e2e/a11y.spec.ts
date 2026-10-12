import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Routes to check. Add stateful URLs too (e.g. "/?state=empty") so empty,
// error and loading states get the same scan as the default view.
const routes: string[] = ["/", "/app/members?sv=viewer-view", "/app/members?sv=invite-flow&step=3", "/app/members?sv=nope"];

// Dev-only tools injected into the page (Agentation, Next's dev overlay) are not the product.
const DEV_CHROME = ["agentation-toolbar", "[data-agentation-root]", "[data-feedback-toolbar]", "nextjs-portal"];

async function open(page: Page, route: string) {
  await page.goto(route);
  // Don't scan a loading skeleton: wait for the network to settle and for busy regions to finish.
  // Mark loading containers with aria-busy="true" (it's also what screen readers need).
  await page.waitForLoadState("networkidle");
  // Inert content (hub thumbnails, one of which shows a loading state on purpose) is hidden from users, so it doesn't count.
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]:not([inert] *)'), null, { timeout: 10_000 });
  await page.addStyleTag({ content: `${DEV_CHROME.join(",")}{display:none!important}` });
}

for (const route of routes) {
  test.describe(`a11y ${route}`, () => {
    test("has no WCAG A/AA violations", async ({ page }) => {
      await open(page, route);
      let axe = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]);
      for (const sel of DEV_CHROME) axe = axe.exclude(sel);
      const { violations } = await axe.analyze();
      expect(violations.map((v) => `${v.impact} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });

    test("is reachable by keyboard with a visible focus indicator", async ({ page }) => {
      await open(page, route);
      await page.keyboard.press("Tab");
      const focused = page.locator(":focus");
      test.skip((await focused.count()) === 0, "no focusable element on this route yet");
      await expect(focused).toBeVisible();
      const indicator = await focused.evaluate((el) => {
        const s = getComputedStyle(el);
        return { outline: s.outlineStyle !== "none" && Number.parseFloat(s.outlineWidth) > 0, shadow: s.boxShadow !== "none" };
      });
      expect(indicator.outline || indicator.shadow, "first tab stop should show a focus ring").toBe(true);
    });

    test("does not scroll sideways on a phone", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await open(page, route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  });
}

// The state panel only exists once opened, so the route scans above never see it.
for (const width of [1440, 375]) {
  test(`state panel at ${width}px has no WCAG A/AA violations and fits`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await open(page, "/app/members?sv=viewer-view");
    await page.keyboard.press("s");
    const panel = page.locator("[data-state-panel]");
    await expect(panel).toBeFocused();
    const { violations } = await new AxeBuilder({ page })
      .include("[data-state-panel]")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(violations.map((v) => `${v.impact} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    const overflow = await panel.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
