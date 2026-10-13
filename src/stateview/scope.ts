import { execFileSync } from "node:child_process";
import type { Manifest } from "./manifest";

type Scope = Manifest["scope"];

/**
 * The review's scope as the repo has it now, for a server route to pass to the
 * hub. The manifest records the repo, branch and diff when the review was
 * written; the branch moves on after that (new commits, a rename, a fix the
 * agent made from a comment). On a Vercel preview this reads the deployment's
 * git metadata, in development it asks git, and anywhere else (or if git
 * isn't there) it keeps the manifest's values. Server only: it runs git.
 */
export function readScope(recorded: Scope): Scope {
  if (process.env.VERCEL_GIT_COMMIT_REF) {
    return {
      ...recorded,
      repo: process.env.VERCEL_GIT_REPO_SLUG || recorded.repo,
      branch: process.env.VERCEL_GIT_COMMIT_REF,
    };
  }
  if (process.env.NODE_ENV !== "development") return recorded;
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (!branch) return recorded;
  const base = recorded.base ?? "main";
  const baseRef = [base, `origin/${base}`].find((ref) => git(["rev-parse", "--verify", "--quiet", ref]) !== null);
  const mergeBase = baseRef ? git(["merge-base", "HEAD", baseRef]) : null;
  return {
    ...recorded,
    branch: branch === "HEAD" ? (git(["rev-parse", "--short", "HEAD"]) ?? recorded.branch) : branch,
    diff: mergeBase ? (diffStat(mergeBase) ?? recorded.diff) : recorded.diff,
  };
}

// Stateview's own files: the engine, the reviews and their routes aren't part of the change under review.
const OWN = /(^|\/)stateview(-reviews)?\//;

/** Files changed since `from`, committed or not, with lines added and removed. */
function diffStat(from: string): Scope["diff"] | null {
  const numstat = git(["diff", "--numstat", from]);
  if (numstat === null) return null;
  let additions = 0;
  let deletions = 0;
  const files = new Set<string>();
  for (const line of numstat.split("\n")) {
    const [added, removed, path] = line.split("\t");
    if (!path || OWN.test(path)) continue;
    files.add(path);
    // Binary files show "-" for both counts.
    additions += Number(added) || 0;
    deletions += Number(removed) || 0;
  }
  for (const path of (git(["ls-files", "--others", "--exclude-standard"]) ?? "").split("\n")) {
    if (path && !OWN.test(path)) files.add(path);
  }
  return { files: files.size, additions, deletions };
}

function git(args: string[]) {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 2000 }).trim();
  } catch {
    return null;
  }
}
