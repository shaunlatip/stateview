#!/usr/bin/env node
// Opens a review's hub and every state in a headless browser against a running
// app, and reports page errors, console errors and states that don't resolve.
// Saves a screenshot of each one so the agent can look at what it built.
//
//   node skills/stateview/scripts/verify.mjs <review-id> [--url http://localhost:3000] [--app <dir>]
//
// Uses the app's own Playwright (`playwright` or `@playwright/test`), or the one
// installed with Stateview. Exit 1 if anything failed.

import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { appLayout, fail, parseArgs, stateviewRoot } from "./lib.mjs";

const { options, positional } = parseArgs(process.argv.slice(2), { url: "string", app: "string" });
const [id] = positional;
if (!id) fail("Name the review to verify, e.g. `verify.mjs team-members`.", 2);

const appRoot = options.app ?? process.cwd();
const baseUrl = (options.url ?? "http://localhost:3000").replace(/\/$/, "");
const { srcDir } = appLayout(appRoot);
const manifest = JSON.parse(readFileSync(join(srcDir, "stateview-reviews", id, "review.json"), "utf8"));
const shots = join(tmpdir(), "stateview-shots", basename(appRoot), id);
// Start empty, so screenshots of states that no longer exist don't linger.
rmSync(shots, { recursive: true, force: true });
mkdirSync(shots, { recursive: true });

const pages = [{ key: "hub", href: `/stateview/${id}` }, ...listFrames(manifest)];
const browser = await launch();
const results = [];
// One page at a time: keeps one WebGL context live and doesn't pile compiles onto a dev server.
// oxlint-disable-next-line no-await-in-loop
for (const target of pages) results.push(await visit(target));
await browser.close();

const failed = results.filter((result) => result.problems.length > 0);
for (const result of results) {
  console.log(`${result.problems.length === 0 ? "ok  " : "FAIL"}  ${result.key}  ${result.href}`);
  for (const problem of result.problems) console.log(`        ${problem}`);
}
console.log(`\n${results.length - failed.length} of ${results.length} pages ok. Screenshots: ${shots}`);
process.exit(failed.length > 0 ? 1 : 0);

/** Every state, and every step of every sequence, with its URL. Mirrors listFrames in the engine. */
function listFrames(m) {
  return m.sections.flatMap((section) =>
    section.items.flatMap((item) => {
      if (item.kind === "state") return [{ key: item.id, href: `${m.route}?sv=${item.id}` }];
      return item.steps.map((_, index) => ({
        key: `${item.id}/${index + 1}`,
        href: `${m.route}?sv=${item.id}${index > 0 ? `&step=${index + 1}` : ""}`,
      }));
    }),
  );
}

/** The app's Playwright, or else the one installed with Stateview itself. */
async function launch() {
  const candidates = [appRoot, stateviewRoot()].flatMap((root) =>
    ["playwright", "@playwright/test"].map((name) => ({ require: createRequire(join(root, "package.json")), name })),
  );
  const found = candidates.find(({ require, name }) => {
    try {
      require.resolve(name);
      return true;
    } catch {
      return false;
    }
  });
  if (found) return found.require(found.name).chromium.launch();
  const list = pages.map((page) => `  ${baseUrl}${page.href}`).join("\n");
  fail(`Playwright isn't installed in this app. Add it as a dev dependency, or open each page yourself:\n${list}`);
}

async function visit({ key, href }) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const problems = [];
  page.on("pageerror", (error) => problems.push(`page error: ${error.message}`));
  page.on("console", (message) => {
    // Failed loads are reported below with their URL; the console's copy doesn't name it.
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) {
      problems.push(`console error: ${message.text()}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && response.url() !== `${baseUrl}${href}`) {
      problems.push(`HTTP ${response.status()} loading ${response.url().replace(baseUrl, "")}`);
    }
  });
  page.on("requestfailed", (request) => {
    // Requests the page cancels itself (map tiles dropped when the camera moves, superseded fetches) aren't failures.
    if (request.failure()?.errorText.includes("ERR_ABORTED")) return;
    problems.push(`request failed: ${request.url().replace(baseUrl, "")} (${request.failure()?.errorText ?? "unknown"})`);
  });
  try {
    const response = await page.goto(`${baseUrl}${href}`, { waitUntil: "load" });
    if (!response?.ok()) problems.push(`HTTP ${response?.status() ?? "no response"}`);
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    if (await page.getByText(/There’s no state called/).count()) problems.push("the review has no state with this id");
    // A state renders in the viewer's iframe, which marks itself ready once it has the state.
    else if (key !== "hub") {
      await page
        .locator("iframe[data-stateview-frame][data-ready]")
        .waitFor({ state: "attached", timeout: 15000 })
        .catch(() => problems.push("the app's frame never reported ready"));
    }
    await page.screenshot({ path: join(shots, `${key.replace("/", "--")}.png`) });
  } catch (error) {
    problems.push(`couldn't load: ${error.message.split("\n")[0]}`);
  }
  await page.close();
  return { key, href, problems };
}
