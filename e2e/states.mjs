// Interaction states for the runtime gate (`harden-check --prod` reads this via .harden.json "steps").
// Each state is reached at 1440 and 375 and scanned like a route: axe (scoped to the dialog if one
// is open), focus inside open dialogs, overflow, screenshot.

const VIEWER = "/app/members?sv=typical-team";

/** Waits until the app's frame has rendered its state and both documents are listening. */
async function viewerReady(page) {
  await page.locator("iframe[data-stateview-frame][data-ready]").waitFor({ state: "attached", timeout: 10_000 });
}

const bar = (page) => page.locator('header[aria-label="Review"]');

export default [
  {
    name: "state-panel-from-keyboard",
    route: VIEWER,
    run: async (page) => {
      await viewerReady(page);
      await page.locator("body").focus();
      await page.keyboard.press("s");
      await page.locator("[data-state-panel]").waitFor();
    },
  },
  {
    name: "comment-options-menu",
    route: VIEWER,
    run: async (page) => {
      await viewerReady(page);
      await bar(page).getByRole("button", { name: "Comment options" }).click();
      await page.getByRole("menu").waitFor();
    },
  },
  {
    name: "filmstrip-toggled",
    route: VIEWER,
    run: async (page) => {
      await viewerReady(page);
      await bar(page).getByRole("button", { name: "States", exact: true }).click();
    },
  },
  {
    name: "comment-composer",
    route: VIEWER,
    run: async (page) => {
      await viewerReady(page);
      await bar(page).getByRole("button", { name: /^Comment/ }).and(page.locator("[aria-pressed]")).click();
      const app = page.frameLocator("iframe[data-stateview-frame]");
      await app.getByRole("heading").first().click();
      await app.getByRole("textbox").first().waitFor();
    },
  },
  {
    name: "unknown-state",
    route: "/app/members?sv=nope",
    run: async () => {},
  },
];
