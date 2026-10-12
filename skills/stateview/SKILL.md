---
name: stateview
description: Set up a Stateview review for the current branch of a Next.js app. Reads the diff, finds the inputs the changed screen reads (role, plan, flags, data, request states, moments, breakpoint), makes the screen start in any state at one boundary, writes a manifest of 8–15 named states in sections, checks it, and wires /stateview routes where a reviewer steps through each state and comments on elements. Use when the user says /stateview, "set up a state review", "review the states for this branch", "make this branch reviewable", or asks how a change looks across roles, plans, flags, data, loading/error and breakpoints.
---

# /stateview

Turn the current branch into a review: a small set of named states for the screen it changes, each one the real app started in that state, at `/stateview/<review>`. The reviewer steps through them (J/K) and comments on elements. Comments carry the state they were made in, so you can reproduce exactly what the reviewer saw.

Your job is the part only an agent can do from the code: find what the screen reads, give it one place to receive that state, and choose the states worth a person's attention. The scripts do the rest deterministically.

`<skill>` below is the folder this file is in. Run scripts from the app's root (or pass `--app <dir>`).

## Before you start

Check, and stop with a one-line reason if any fails:

- A Next.js app on the App Router (Next 15 or later) or the Pages Router (Next 13.4 or later), React 18 or 19, and Tailwind CSS v4. The installer detects the router and writes routes for it.
- A git repo on a branch with changes against its base. With no changes, ask whether to review a screen as a whole; the scope line then reads the branch against itself.
- The change touches UI. Stateview reviews screens; a backend-only change has nothing to show.

Ask the user only for what you can't work out: which screen, if the change touches more than three; the base branch, if it isn't `main` or `master`; and permission before installing packages if your environment requires it.

## Steps

### 1. Install the engine

```sh
node <skill>/scripts/install.mjs
```

It copies the engine into `src/stateview/` (vendored; don't edit the copy), imports its theme into the Tailwind stylesheet, and writes the routes (`app/stateview/…`, or `pages/stateview/…` on the Pages Router) and an empty registry (`stateview-reviews/index.ts`). It never overwrites route or registry files that exist. Install the packages it lists with the command it prints.

### 2. Start a review for each changed screen

```sh
node <skill>/scripts/new-review.mjs <review-id> --screen "<Area › Screen>"
```

Use a short kebab-case id named after the screen (`team-members`, `compare-places`). It writes `stateview-reviews/<id>/review.json` (with the branch, base and file count filled in from git), a render stub in `stateview-reviews/<id>/index.tsx`, and registers the review. It prints the changed files: that list is the scope. It counts uncommitted and untracked files too, so if the list includes files unrelated to the change (a lockfile touched by a package manager, say), correct `scope.files` by hand.

Paths below assume a `src/` folder; in apps without one, the folders sit at the project root (`stateview/`, `stateview-reviews/`, `app/stateview/`). The scripts print the real paths.

### 3. Find the inputs

Read every changed file, then what those files read: hooks, context, props, flags, fetches, local state, viewport hooks. List each input the change touches with its class, source and values. `references/composition.md` defines the classes (who, config, data, system, moment, environment) and sources (prop, flag, entitlement, api, viewport), and says which values come from code and which from product knowledge. Mark values you inferred rather than found, with "(inferred)" in the input's label.

Keep to the inputs the diff reads, plus the few that decide whether the changed UI shows at all. An input no state varies doesn't belong in the manifest.

### 4. Create the boundary

Make the screen renderable from a plain object of string inputs, then write the render function in `stateview-reviews/<id>/index.tsx`, with fixtures next to it. Follow `references/boundary.md`. In short:

- Prefer splitting a container (gathers real state, unchanged behavior) from a screen (takes everything as props). Use an override context only for state read deep in the tree.
- Request states are inputs: canned data for ready, a promise that never resolves for loading, a rejection for error. Actions answer from canned responses after a short delay, so every state is live and clickable. Never call real APIs or write real data from a review.
- Moments (open sheet, typed draft, selected row) become optional `initial*` props.
- The review narrows the frame to 375 px for the `mobile` value of the environment input, but the window stays desktop-sized: CSS media queries (Tailwind `sm:`), `100vw`, `matchMedia` and `innerWidth` all still see desktop. Convert the changed screen's breakpoint classes to container queries and pass an `isMobile` override for JavaScript checks. Fixed-position sheets need a `contain: layout` wrapper to stay in the frame.
- The review bar covers the bottom 6rem of the window. Full-height screens (maps, editors, anything `h-dvh`) need to be rendered in a box that stops above it.
- Production behavior doesn't change: every prop and override you add is optional and defaults to today's behavior. Keep a list of every production file you edit; it goes in your report.
- For WebGL, canvas or video screens, pass `{ thumbnails: "off" }` to `defineReview`: the hub shows each state's changed inputs instead of a live render, since browsers cap active WebGL contexts at about 16.

### 5. Write the manifest

Fill in `review.json`: `baseline`, `inputs`, `sections` of states and sequences, `uncovered` and `excluded`. Apply the composition rules in `references/composition.md`:

- The realistic baseline comes first. Each state is one moment a real person could be in, answering one question, changing one or two inputs from the baseline.
- Only stack what can be true at the same moment: who, config and data combine freely; one request state and one moment per state unless they truly co-occur. Use a sequence for anything that needs order (a flow, error then retry).
- Mark flag- and entitlement-gated states and sub-component loading/error states `"code-only"` (the hub labels them "Not in designs"). They're the states nobody draws, and the most valuable ones here.
- About 8–15 states in the standard section order, each section with the `tone` the order table gives it, a short "Nearby features" section for unchanged things the change could break, and an honest `uncovered` and `excluded` list.
- Titles name the state ("Viewer checking who's on the team"); each `why` is one sentence written as a person doing something; `checks` are short, observable things to verify.

Keep `route` as `/stateview/<id>/state`. Bump `version` whenever you change states in a review someone has started, so saved progress and comments don't map onto the wrong state.

### 6. Check it

```sh
node <skill>/scripts/check.mjs src/stateview-reviews
```

(Pass `stateview-reviews` instead in apps without `src/`.) Fix every error. For each warning, fix it or keep it on purpose and say why in your report. Then run the app's own typecheck and lint, and fix what they find in files you wrote or changed. If the app has no typecheck script, run `tsc --noEmit` from its own `node_modules`.

### 7. Verify it in the browser

Use the app's running dev server if there is one; otherwise start one, and stop it when you're done.

```sh
node <skill>/scripts/verify.mjs <review-id> --url http://localhost:3000
```

It opens the hub and every state, reports page errors, console errors, failed requests and unknown states, and saves a screenshot of each (requests the page cancels itself, like map tiles dropped mid-pan, aren't counted). Open the screenshots and check that each state shows what its title and inputs say, and that states differ the way the manifest claims. A state that renders but looks like the baseline means an input isn't reaching the screen. Fix and re-run until every page is ok. If the app has no Playwright, say so and list the URLs for the user to open.

### 8. Report

Tell the user, briefly:

- The hub URL (`/stateview/<id>`), and the count: states, sections, what's not covered.
- The states, by section, one line each, with code-only ones marked.
- Every production file you changed for the boundary and what you added (optional props, an override context), so they can confirm behavior didn't change.
- Inputs and values you inferred, and any checker warnings you kept on purpose.
- That the review routes are served in development and on preview deployments, and 404 on Vercel production unless `STATEVIEW=1`.

Don't commit unless asked. If they want the review on the branch's preview deployment, the review files need to be committed with it.

## Updating a review

When the branch changes, re-read the diff, update inputs, fixtures and states, bump `version`, and run steps 6–7 again. Re-running `install.mjs` updates the engine copy and leaves routes, registry and reviews alone.

## Removing Stateview from an app

Delete `src/stateview/`, `src/stateview-reviews/` and `app/stateview/` (or `pages/stateview/`), and remove the theme import from the stylesheet. The optional boundary props can stay; they default to the app's normal behavior.
