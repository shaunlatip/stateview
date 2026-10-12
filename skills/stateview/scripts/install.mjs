#!/usr/bin/env node
// Copies Stateview's review engine into a Next.js app and wires its routes.
//
//   node skills/stateview/scripts/install.mjs [--app <dir>] [--from <stateview repo>] [--dry-run] [--force]
//
// What it does, all of it deterministic:
//   1. Copies src/stateview/ (the engine) into the app's source root, replacing any earlier copy.
//      The copy is vendored like a shadcn component: the app owns it, re-running updates it.
//      The engine imports nothing from the app it's in, only npm packages.
//   2. Imports the engine's theme into the app's Tailwind stylesheet.
//   3. Writes the review routes and an empty review registry, unless they already exist:
//        /stateview                     every review
//        /stateview/<review>            the hub
//        /stateview/<review>/state?sv=  one state, with the review bar
//   4. Lists the packages the engine imports that the app doesn't have yet. It doesn't install them.

import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { appLayout, fail, git, importPath, packageManager, parseArgs, readJson, stateviewRoot, writeOnce } from "./lib.mjs";

const HOST_PACKAGES = new Set(["react", "react-dom", "next"]);

const { options } = parseArgs(process.argv.slice(2), { app: "string", from: "string", "dry-run": "boolean", force: "boolean" });
const appRoot = options.app ?? process.cwd();
const dryRun = Boolean(options["dry-run"]);
const source = stateviewRoot(options.from);
const { deps, srcDir, appDir } = appLayout(appRoot);
const engineDir = join(srcDir, "stateview");
const reviewsDir = join(srcDir, "stateview-reviews");
const report = [];
if (resolve(engineDir) === resolve(source, "src/stateview")) fail("That's Stateview's own repo; the engine can't be installed into itself.");

copyEngine();
const missing = missingPackages();
importTheme();
writeRoutes();
printReport();

function copyEngine() {
  const from = join(source, "src/stateview");
  for (const file of readdirSync(from)) {
    if (!/\.(ts|tsx)$/.test(file)) continue;
    const stray = readFileSync(join(from, file), "utf8").match(/from "@\/[^"]+"/);
    if (stray) fail(`The engine file ${file} imports ${stray[0].slice(5)}, which an app can't be assumed to have.`);
  }
  if (!dryRun) {
    rmSync(engineDir, { recursive: true, force: true });
    cpSync(from, engineDir, { recursive: true });
  }
  const commit = git(source, ["rev-parse", "--short", "HEAD"]);
  writeOnce(
    join(engineDir, "README.md"),
    [
      "# Stateview engine",
      "",
      `Copied from Stateview${commit ? ` (${commit})` : ""} by \`skills/stateview/scripts/install.mjs\`. Re-running the script replaces this folder, so change Stateview itself rather than this copy.`,
      "",
      "The reviews for this app live in `../stateview-reviews/`.",
      "",
    ].join("\n"),
    { force: true, dryRun },
  );
  report.push(`${(dryRun ? "would copy" : "copied").padEnd(8)} engine → ${relative(appRoot, engineDir)}/`);
}

/** Packages the engine imports that the app doesn't depend on yet, with Stateview's version ranges. */
function missingPackages() {
  const ours = readJson(join(source, "package.json"));
  const ourVersions = { ...ours.dependencies, ...ours.devDependencies };
  const needed = new Set();
  for (const file of readdirSync(join(source, "src/stateview"))) {
    if (!/\.(ts|tsx)$/.test(file)) continue;
    const text = readFileSync(join(source, "src/stateview", file), "utf8");
    for (const [, specifier] of text.matchAll(/(?:from|import\()\s*"([^"./@][^"]*|@[^"/]+\/[^"]+)"/g)) {
      const name = specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0];
      if (!HOST_PACKAGES.has(name) && name !== "@") needed.add(name);
    }
  }
  return [...needed].filter((name) => !deps[name]).map((name) => (ourVersions[name] ? `${name}@${ourVersions[name]}` : name));
}

/** Adds `@import "<engine>/theme.css"` to the stylesheet that imports Tailwind. */
function importTheme() {
  const stylesheet = findStylesheet(appDir) ?? findStylesheet(srcDir);
  if (!stylesheet) {
    report.push(`skipped  theme: no stylesheet imports Tailwind v4 (\`@import "tailwindcss"\`). Stateview's UI needs Tailwind v4.`);
    return;
  }
  const css = readFileSync(stylesheet, "utf8");
  const line = `@import "${importPath(stylesheet, join(engineDir, "theme.css"))}";`;
  if (css.includes(line)) {
    report.push(`kept     ${relative(appRoot, stylesheet)} (already imports the theme)`);
    return;
  }
  const updated = css.replace(/(@import\s+["']tailwindcss["'];?[^\n]*\n)/, `$1${line}\n`);
  if (!dryRun) writeFileSync(stylesheet, updated);
  report.push(`${dryRun ? "would edit" : "edited"}   ${relative(appRoot, stylesheet)} (imports the theme)`);
}

function findStylesheet(dir) {
  if (!existsSync(dir)) return null;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".css")) {
      const path = join(dir, entry.name);
      if (/@import\s+["']tailwindcss["']/.test(readFileSync(path, "utf8"))) return path;
    }
  }
  return null;
}

function writeRoutes() {
  const routeDir = join(appDir, "stateview");
  const files = {
    [join(routeDir, "layout.tsx")]: () => `import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";

/**
 * Stateview's review routes. They're served in development and on preview
 * deployments; on a production deployment they 404 unless STATEVIEW=1.
 */
export default function StateviewLayout({ children }: { children: ReactNode }) {
  if (process.env.VERCEL_ENV === "production" && process.env.STATEVIEW !== "1") notFound();
  return (
    <NuqsAdapter>
      <div className="flex min-h-dvh flex-col">{children}</div>
    </NuqsAdapter>
  );
}
`,
    [join(routeDir, "page.tsx")]: (file) => `import { ReviewIndex } from "${importPath(file, join(engineDir, "review"))}";
import { reviews } from "${importPath(file, reviewsDir)}";

export default function StateviewIndexPage() {
  return <ReviewIndex reviews={Object.values(reviews)} basePath="/stateview" />;
}
`,
    [join(routeDir, "[review]", "page.tsx")]: (file) => `import { notFound } from "next/navigation";
import { ReviewHub } from "${importPath(file, join(engineDir, "review"))}";
import { reviewParams, reviews } from "${importPath(file, reviewsDir)}";

export const generateStaticParams = reviewParams;

export default async function ReviewHubPage({ params }: { params: Promise<{ review: string }> }) {
  const { review: id } = await params;
  const review = reviews[id];
  if (!review) notFound();
  return <ReviewHub review={review} />;
}
`,
    [join(routeDir, "[review]", "state", "page.tsx")]: (file) => `import { Suspense } from "react";
import { reviewParams } from "${importPath(file, reviewsDir)}";
import { FocusRoute } from "./focus-route";

export const generateStaticParams = reviewParams;

// The state comes from \`?sv=\`, which is only known per request.
export default async function ReviewStatePage({ params }: { params: Promise<{ review: string }> }) {
  const { review } = await params;
  return (
    <Suspense>
      <FocusRoute id={review} />
    </Suspense>
  );
}
`,
    [join(routeDir, "[review]", "state", "focus-route.tsx")]: (file) => `"use client";

import { notFound } from "next/navigation";
import { ReviewFocus } from "${importPath(file, join(engineDir, "review-focus"))}";
import { reviews } from "${importPath(file, reviewsDir)}";

// A client component: a review's render function can't be passed from the server.
export function FocusRoute({ id }: { id: string }) {
  const review = reviews[id];
  if (!review) notFound();
  return <ReviewFocus review={review} hubHref={\`/stateview/\${id}\`} />;
}
`,
    [join(reviewsDir, "index.ts")]: (file) => `import type { Review } from "${importPath(file, join(engineDir, "review"))}";

/**
 * Every review in this app, by manifest id. \`new-review.mjs\` adds an entry
 * for each screen the /stateview skill reviews.
 */
export const reviews: Record<string, Review> = {
};

/**
 * The review routes' static params. With Cache Components on, Next needs at
 * least one, so an empty registry gets a placeholder that the pages 404.
 */
export function reviewParams() {
  const ids = Object.keys(reviews);
  return (ids.length > 0 ? ids : ["none"]).map((review) => ({ review }));
}
`,
  };
  for (const [path, content] of Object.entries(files)) {
    const result = writeOnce(path, content(path), { force: Boolean(options.force), dryRun });
    report.push(`${result.padEnd(8)} ${relative(appRoot, path)}`);
  }
}

function printReport() {
  console.log(`Stateview → ${appRoot}${dryRun ? " (dry run, nothing written)" : ""}\n`);
  for (const line of report) console.log(`  ${line}`);
  if (missing.length > 0) {
    console.log(`\nThe engine needs packages this app doesn't have. Install them with:\n\n  ${packageManager(appRoot).add} ${missing.join(" ")}`);
  } else {
    console.log("\nEvery package the engine imports is already installed.");
  }
  console.log(`\nNext: node ${join(source, "skills/stateview/scripts/new-review.mjs")} <review-id> --screen "<Screen name>"`);
}
