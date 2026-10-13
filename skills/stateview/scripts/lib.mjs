// Shared helpers for the /stateview scripts: finding the app's folders, writing
// files without clobbering the app's own, and building import paths.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** The Stateview repo this skill ships in (skills/stateview/scripts → repo root). */
export function stateviewRoot(from) {
  const root = from ? resolve(from) : resolve(dirname(realpathSync(fileURLToPath(import.meta.url))), "../../..");
  if (!existsSync(join(root, "src/stateview/manifest.ts"))) {
    fail(`Couldn't find Stateview's engine at ${join(root, "src/stateview")}. Pass --from <path to the Stateview repo>.`);
  }
  return root;
}

/**
 * The app's source root (`src/` or the project root), which router it uses,
 * and the folder its routes live in. The App Router wins when an app has both.
 */
export function appLayout(appRoot) {
  const pkgPath = join(appRoot, "package.json");
  if (!existsSync(pkgPath)) fail(`No package.json in ${appRoot}. Run this from the app's root or pass --app <dir>.`);
  const pkg = readJson(pkgPath);
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (!deps.next) fail("This isn't a Next.js app (no `next` dependency).");
  for (const router of ["app", "pages"]) {
    for (const srcDir of [join(appRoot, "src"), appRoot]) {
      const routesDir = join(srcDir, router);
      if (existsSync(routesDir)) return { pkg, deps, srcDir, router, routesDir };
    }
  }
  fail("No `app/` or `pages/` folder (or `src/app/`, `src/pages/`) found.");
}

/** A relative module specifier from one file to another path, with forward slashes. */
export function importPath(fromFile, toPath) {
  const path = relative(dirname(fromFile), toPath).split(sep).join("/");
  return path.startsWith(".") ? path : `./${path}`;
}

/** Writes a file unless it exists (the app owns it after the first write). Returns what happened. */
export function writeOnce(path, content, { force = false, dryRun = false } = {}) {
  const existed = existsSync(path);
  // "stale": the app's copy differs from what this version would write (an older template, or the app's own edits).
  if (existed && !force) return readFileSync(path, "utf8") === content ? "kept" : "stale";
  if (!dryRun) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  return existed ? "replaced" : "created";
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** The package manager the app uses, from its lockfile. */
export function packageManager(appRoot) {
  if (existsSync(join(appRoot, "pnpm-lock.yaml"))) return { name: "pnpm", add: "pnpm add" };
  if (existsSync(join(appRoot, "yarn.lock"))) return { name: "yarn", add: "yarn add" };
  if (existsSync(join(appRoot, "bun.lock")) || existsSync(join(appRoot, "bun.lockb"))) return { name: "bun", add: "bun add" };
  return { name: "npm", add: "npm install" };
}

export function git(cwd, args) {
  try {
    return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

/** `kebab-case` → `camelCase`, for import names. */
export function camelCase(id) {
  return id.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
}

export function parseArgs(argv, flags) {
  const options = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const name = arg.slice(2);
    if (!(name in flags)) fail(`Unknown option --${name}.`, 2);
    options[name] = flags[name] === "boolean" ? true : argv[++i];
    if (options[name] === undefined) fail(`--${name} needs a value.`, 2);
  }
  return { options, positional };
}

export function fail(message, code = 1) {
  console.error(`stateview: ${message}`);
  process.exit(code);
}
