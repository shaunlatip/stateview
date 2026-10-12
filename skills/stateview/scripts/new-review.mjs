#!/usr/bin/env node
// Starts a review for one screen: works out the branch's scope from git, writes
// a manifest skeleton and a render stub, and registers the review.
//
//   node skills/stateview/scripts/new-review.mjs <review-id> --screen "Team settings › Members" [--base main] [--app <dir>]
//
// Prints the files the branch changed (the review's scope), so the agent reads
// the right code next. Run install.mjs first.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { appLayout, camelCase, fail, git, parseArgs, writeOnce } from "./lib.mjs";

const { options, positional } = parseArgs(process.argv.slice(2), { screen: "string", base: "string", app: "string" });
const [id] = positional;
if (!id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) fail("Give the review a kebab-case id, e.g. `team-members`.", 2);
if (!options.screen) fail('Name the screen with --screen, e.g. --screen "Team settings › Members".', 2);

const appRoot = options.app ?? process.cwd();
const { srcDir, appDir } = appLayout(appRoot);
const reviewsDir = join(srcDir, "stateview-reviews");
const registry = join(reviewsDir, "index.ts");
if (!existsSync(registry)) fail("No review registry yet. Run install.mjs first.");

const scope = branchScope();
const manifest = {
  id,
  version: 1,
  route: `/stateview/${id}/state`,
  screen: options.screen,
  scope: { branch: scope.branch, base: scope.base, files: scope.files.length },
  baseline: {},
  inputs: [],
  sections: [],
  uncovered: [],
  excluded: [],
};

const written = [
  [join(reviewsDir, id, "review.json"), `${JSON.stringify(manifest, null, 2)}\n`],
  [
    join(reviewsDir, id, "index.tsx"),
    `import { defineReview } from "../../stateview/review";
import manifest from "./review.json";

/**
 * ${options.screen}: renders the real screen from one state's inputs. Replace
 * the stub with the screen and its fixtures (the skill's references/boundary.md).
 */
export default defineReview(manifest, () => null);
`,
  ],
].map(([path, content]) => `${writeOnce(path, content).padEnd(8)} ${relative(appRoot, path)}`);
written.push(`${register() ? "edited " : "kept   "}  ${relative(appRoot, registry)}`);

console.log(`Review "${id}" for ${options.screen}\n`);
for (const line of written) console.log(`  ${line}`);
console.log(`\nScope: ${scope.branch} against ${scope.base} · ${scope.files.length} ${scope.files.length === 1 ? "file" : "files"} changed`);
for (const file of scope.files) console.log(`  ${file}`);
if (!scope.found) console.log(`\n(Couldn't find the base branch "${scope.base}"; pass --base. The file count is 0 until then.)`);
console.log(`\nReview pages: /stateview/${id} (hub) and /stateview/${id}/state?sv=<state id>`);

/** The branch, its base, and the files it changed, committed or not, minus Stateview's own. */
function branchScope() {
  const branch = git(appRoot, ["rev-parse", "--abbrev-ref", "HEAD"]) ?? "HEAD";
  const exists = (ref) => git(appRoot, ["rev-parse", "--verify", "--quiet", ref]) !== null;
  // main or master before origin/HEAD, which in a local clone follows whatever the source repo has checked out.
  const base =
    options.base ??
    ["main", "master"].find((name) => exists(name) || exists(`origin/${name}`)) ??
    git(appRoot, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"])?.replace(/^origin\//, "") ??
    "main";
  const baseRef = [base, `origin/${base}`].find(exists);
  const mergeBase = baseRef ? git(appRoot, ["merge-base", "HEAD", baseRef]) : null;
  if (!mergeBase) return { branch, base, files: [], found: false };
  const changed = git(appRoot, ["diff", "--name-only", mergeBase]) ?? "";
  const untracked = git(appRoot, ["ls-files", "--others", "--exclude-standard"]) ?? "";
  const own = [join(srcDir, "stateview"), reviewsDir, join(appDir, "stateview")].map((dir) => `${relative(appRoot, dir)}/`);
  const files = [...new Set(`${changed}\n${untracked}`.split("\n").filter(Boolean))]
    .filter((file) => !own.some((dir) => file.startsWith(dir)))
    .toSorted();
  return { branch, base, files, found: true };
}

/** Adds the review to the registry's imports and its `reviews` object. Returns false if it's already there. */
function register() {
  const name = camelCase(id);
  const text = readFileSync(registry, "utf8");
  const importLine = `import ${name} from "./${id}";`;
  if (text.includes(importLine)) return false;
  const lines = text.split("\n");
  const lastImport = lines.findLastIndex((line) => line.startsWith("import "));
  lines.splice(lastImport + 1, 0, importLine);
  const updated = lines.join("\n").replace(/(export const reviews[^=]*=\s*\{\n?)/, `$1  [${name}.manifest.id]: ${name},\n`);
  if (!updated.includes(`[${name}.manifest.id]`)) fail(`Couldn't find \`export const reviews = {\` in ${relative(appRoot, registry)}. Add ${name} by hand.`);
  writeFileSync(registry, updated);
  return true;
}
