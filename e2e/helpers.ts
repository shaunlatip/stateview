import type { AxeBuilder } from "@axe-core/playwright";
import { expect, type FrameLocator, type Page } from "@playwright/test";

type Violation = Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"][number];

/** The viewer renders the app under review in this same-origin frame, so the app gets its own window. */
export const APP_FRAME = "iframe[data-stateview-frame]";

// Next's dev overlay is injected into the page under `next dev` and isn't the product.
export const DEV_CHROME = ["nextjs-portal"];

export const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** One line per violation, so a failing test names the rule and the elements. */
export function describeViolations(violations: Violation[]) {
  return violations.map((v) => `${v.impact} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

/** The app under review, inside the viewer's frame. */
export function app(page: Page): FrameLocator {
  return page.frameLocator(APP_FRAME);
}

/**
 * One Tab stop forward, links included. Safari's Tab skips links unless the user turns on "Press
 * Tab to highlight each item"; Option+Tab is how its keyboard users reach them, so WebKit gets that.
 */
export function tab(page: Page) {
  return page.keyboard.press(page.context().browser()?.browserType().name() === "webkit" ? "Alt+Tab" : "Tab");
}

/** The bar's comment-mode toggle. The comment button is split, and only the toggle half has aria-pressed. */
export function commentToggle(page: Page) {
  return page
    .locator('header[aria-label="Review"]')
    .getByRole("button", { name: /^Comment/ })
    .and(page.locator("[aria-pressed]"));
}

/**
 * Loads a route and waits until it's worth scanning or typing into. Viewer routes also wait for the
 * app's frame to render its state; pass `{ viewer: false }` for pages without a frame (the hub, an
 * unknown state).
 */
export async function open(page: Page, route: string, { viewer = true }: { viewer?: boolean } = {}) {
  await page.goto(route);
  // Don't scan a loading skeleton: wait for the network to settle and for busy regions to finish.
  // Mark loading containers with aria-busy="true" (it's also what screen readers need).
  await page.waitForLoadState("networkidle");
  // Inert content (hub thumbnails, one of which shows a loading state on purpose) is hidden from users, so it doesn't count.
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]:not([inert] *)'), null, { timeout: 10_000 });
  await page.addStyleTag({ content: `${DEV_CHROME.join(",")}{display:none!important}` });
  if (!viewer) return;

  // The frame loads on its own schedule. data-state is server-rendered, so it shows before hydration;
  // data-ready on the iframe means both documents are listening, so keys pressed from here aren't lost.
  const frame = app(page);
  await expect(frame.locator("[data-stateview-screen][data-state]")).toBeAttached({ timeout: 10_000 });
  await expect(page.locator(`${APP_FRAME}[data-ready]`)).toBeAttached({ timeout: 10_000 });
  await expect(frame.locator('[aria-busy="true"]:not([inert] *)')).toHaveCount(0, { timeout: 10_000 });
  // The frame is a full page of its own, so dev tools can be injected there too.
  const handle = await page.locator(APP_FRAME).elementHandle();
  const content = await handle?.contentFrame();
  await content?.addStyleTag({ content: `${DEV_CHROME.join(",")}{display:none!important}` });
}

/** The viewer is on single state `id`, in the URL and in what the app has rendered. */
export async function expectState(page: Page, id: string) {
  await expect(page).toHaveURL((url) => url.pathname === "/app/members" && url.searchParams.get("sv") === id);
  await expect(app(page).locator("[data-stateview-screen]")).toHaveAttribute("data-state", id);
}

/** Moves focus out of the frame (if it's there) back to the viewer page's body, where shortcuts listen. */
export async function focusParent(page: Page) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await expect.poll(() => page.evaluate(() => document.activeElement === document.body)).toBe(true);
}

/**
 * For "nothing happens" checks: a leaked key would update the URL or the bar a moment later, and
 * there's no event to wait for when it correctly doesn't, so give it time to show.
 */
export async function settle(page: Page) {
  await page.waitForTimeout(500);
}
