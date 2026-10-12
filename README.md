# Stateview

A review layer for web apps. Instead of clicking around a build from a cold start, the reviewer steps through a small set of named states for a change (role, plan, feature flag, data shape, loading and error, breakpoint), comments on elements, and ends with a prompt for their coding agent.

## Try it

- `/` is the hub: every state for the change, one row per section, with live thumbnails. The index on the left jumps to a section, and the button at the top right copies every open comment for a coding agent.
- Open a state to see the real page in that state, with a filmstrip of every state down the left. `J` and `K` (or the left and right arrows) step back and forward through states and `Esc` goes back to the hub; hover a control to see its shortcut.
- `C` (or Comment in the viewer bar) turns on comment mode. Point at or tab to an element and it's outlined and named; click it or press `Enter` to comment on it instead of using it. `Alt` + arrow keys move to the parent, child or sibling element, so elements that can't take focus can still be picked. `Esc` leaves comment mode.
- Each comment is saved with the state it was made in, as a numbered pin that stays on its element. Hover a pin to read it; click it to edit or delete it. The caret beside Comment in the viewer bar opens a menu that can hide pins, copy the state's open comments as Markdown for a coding agent (state URL, inputs, and each element's selector, React components and HTML), copy a link to the state, or delete its comments (with undo).
- `S` (or the sliders button) opens the state panel: every input the screen reads, each one editable, kept in the URL.

The sample screen has one bug on purpose: viewers can see Remove buttons. The "Viewer checking who's on the team" state shows it.

## Run

```sh
npm install
npm run dev        # http://localhost:3000
```

## Checks

```sh
npm run lint       # Oxlint: React (incl. React Compiler rules), jsx-a11y, Next.js, @shadcn/lint design-system rules
npm run typecheck  # tsc --noEmit (strict)
npm run test:a11y  # Playwright + axe: WCAG A/AA, visible focus on the first tab stop, no sideways scroll at 375px
npm run check:states  # the sample manifest against the composition rules (--strict: warnings fail too)
npm run test:skill    # tests for the skill's manifest checker
npm run build
```

CI runs lint, typecheck, the manifest check, the checker's tests and the build on every push (`.github/workflows/ci.yml`).

## Use it on your own app: the `/stateview` skill

The sample screen's review is written by hand. The `/stateview` skill (`skills/stateview/`) has a coding agent write one for any Next.js app with Tailwind v4, on the App Router (Next 15+) or the Pages Router (Next 13.4+), React 18 or 19: it reads the branch's diff, finds the inputs the changed screen reads, gives the screen one boundary where a state can be injected, writes the manifest, checks it, and wires the review routes.

To make it available to Claude Code, link the folder into your skills directory, then run `/stateview` in the app's repo:

```sh
ln -s "$PWD/skills/stateview" ~/.claude/skills/stateview
```

What runs, in order (the skill's `SKILL.md` has the full procedure):

| Step | Who | What |
|---|---|---|
| `scripts/install.mjs` | script | Copies the engine (`src/stateview/`) into the app, imports its theme into the Tailwind stylesheet, writes `/stateview` routes and an empty review registry, and lists missing packages |
| `scripts/new-review.mjs <id>` | script | Reads the branch, base and changed files from git, writes a manifest skeleton and a render stub, and registers the review |
| Inputs and boundary | agent | Finds what the screen reads and makes it renderable from a state's inputs, without changing production behavior (`references/boundary.md`) |
| Manifest | agent | Chooses 8–15 states in sections by the composition rules (`references/composition.md`) |
| `scripts/check.mjs` | script | Validates the manifest: shape and values (errors), and the composition rules a script can test (warnings) |
| `scripts/verify.mjs <id>` | script | Opens the hub and every state in a headless browser, reports page errors, console errors and failed requests, and saves a screenshot of each |

In the app, the review lives at `/stateview/<review>` (hub) and `/stateview/<review>/state?sv=<state>` (one state). The routes are served in development and on preview deployments, and return 404 on a Vercel production deployment unless `STATEVIEW=1`. The manifest is JSON so the checker, CI and an agent can all read and rewrite it without a TypeScript toolchain; `defineReview` pairs it with the render function.

## Stack

Next.js (App Router, React Compiler) · React · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui (Base UI) · Geist · Phosphor icons

## Design language

Stateview's own UI (hub, viewer bar, filmstrip, state panel, toasts) uses the Graphical theme "Stateview" (`GUI.md`, `gui/`). Its light and dark tokens live in `src/stateview/theme.css`, scoped to `.stateview-theme`, and its primitives (button, toolbar control, badge, shortcut hint) in `src/stateview/ui.tsx`. The sample app uses the shadcn kit in `src/components/ui` with its own brand, a fictional product called Halcyon: blue, orange and cool-grey tokens in `src/sample-app/halcyon.css`, scoped to `.halcyon`, so it reads as a separate product, the way a real app under review would. Hub thumbnails and the phone frame reset to the app's own type (`host-frame`).

**Fonts.** Data text uses Geist Mono, which the app already loads. The UI face is **Timeless Grotesk** (Timeless Sans, Grotesk cut), loaded by the `@font-face` rules in `src/app/fonts.css` (kept out of the engine, so apps it's installed into don't request the files). Its license (Timeless Free Font License 1.2) allows embedding in a website but not putting the fonts in a public repository, so the files are gitignored and ship only with the deployed site. To run it locally with the right face:

1. Get the family at [timeless.co/type](https://timeless.co/type) ("Get access"; they email the files).
2. Copy `TimelessSans-GroteskRegular.woff2`, `TimelessSans-GroteskMedium.woff2` and `TimelessSans-GroteskSemibold.woff2` from `Sans-Grotesk/static/woff2/`, plus `LICENSE.pdf`, into `public/fonts/timeless-grotesk/`.

Without them, Stateview's UI falls back to the system sans-serif and nothing else changes.

## Where to look

- `src/stateview/` — the review layer, and the engine the skill copies into other apps. It imports nothing from the app it's in. `manifest.ts` (state types and helpers), `hub.tsx` and `focus-view.tsx` (the two screens), `focus-bar.tsx`, `filmstrip.tsx` and `state-panel.tsx` (the viewer's bar, state list and input panel), `thumbnail.tsx` and `card-chips.tsx` (state cards), `logo.tsx`, `agent-export.ts` (comments as Markdown for an agent), `store.ts` (comments and opened states in localStorage), `annotations.ts` (the comment interface), `comment-layer.tsx` (the comment engine behind it: picking, pins, composer), `describe-element.ts` (an element's name, selector, HTML and React components), `review.tsx` and `review-focus.tsx` (`defineReview` and the entry points the generated routes use), `use-frame-query.ts` (the state in the URL), `toast.tsx` (Stateview's own toasts) and `cn.ts` (class merging that knows the theme's utilities).
- `src/sample-app/` — the screen under review. `members-screen.tsx` renders entirely from the `MembersState` object in `state.ts`, `fixtures.ts` holds the canned data, and `review.json` lists the states for this change (typed in `manifest.ts`).
- `skills/stateview/` — the `/stateview` skill: `SKILL.md`, `references/` (composition rules, boundary patterns) and `scripts/` (install, new-review, check, verify).
- `src/app/` — routes: `/` (hub) and `/app/members?sv=<state>` (one state).

## How a state reaches the screen

The Team members screen takes all of its state through one object (`MembersState`: role, plan, SSO beta flag, member data, pending invites, request states, the invite form, breakpoint). Each state in the manifest sets a few of those inputs on top of a baseline, and the screen's own logic derives everything else. Actions on the page (remove, revoke, invite) answer from canned responses after a short delay, so every state is the live, clickable page rather than a picture of it.

## Dependencies worth naming

- **Comments** are Stateview's own engine (`src/stateview/comment-layer.tsx`), written from scratch. Everything else depends on the `AnnotationLayer` interface in `src/stateview/annotations.ts`, so the engine could be swapped for another one by changing one file. React component names come from React's development build, so production builds show the selector and HTML without them.
- **Agentation** (`agentation`, © Benji Taylor, [PolyForm Shield 1.0.0](https://polyformproject.org/licenses/shield/1.0.0/)) is a dev dependency only, for commenting on Stateview's own UI while building it (`src/components/dev/feedback-toolbar.tsx`, synced to the local Agentation server). It renders only under `next dev`; production builds contain none of it, and the engine the skill installs doesn't use it. None of its source is copied into this repo.
- The current state (`?sv=`, `?step=`, and any input changed in the state panel) lives in the URL, so every state has a link and the back button steps back. It's read and written through the History API (`src/stateview/use-frame-query.ts`) rather than a router library, so the same engine runs under the App Router and the Pages Router.

## Credits

The sample screen's layout follows the Team Settings page of Vercel's [Next.js SaaS Starter](https://github.com/nextjs/saas-starter) (MIT), rebuilt here with shadcn/ui components and without its database, auth or payments.

## Time log

6 hours of build. Problem research and UI references were done beforehand.

| Session | Time (PT) | Hours | Work |
|---|---|---|---|
| 1 | Sun Oct 11, 23:48– | | Scaffold, deploy, sample screen, manifest, hub, focus view, comments |

## UI details

A running list of interaction and visual details, kept while building.

- Thumbnails are the real screen rendered at 1088 px and scaled down to the card, so they always match the build. They are inert and hidden from assistive tech, animations inside them are off (a loading skeleton doesn't pulse in every card), and `content-visibility: auto` skips the ones far off screen.
- A review of a WebGL or video screen turns live thumbnails off (browsers cap active WebGL contexts at about 16); its cards and filmstrip show the inputs each state changes from the baseline instead, in the same frame.
- The sample screen uses container queries instead of viewport breakpoints, so it reflows the same way in a thumbnail, in the 375 px frame of the phone state and in a narrow window.
- Each section is a row: its title and why line on the left, its cards wrapping on the right. Below 1024 px the title goes above the cards. The index marks the section at the top of the window.
- A card shows a dot until its state has been opened, and a comment count when it has open comments. The screen and the title are separate links to the state: the screen for the pointer, the title (underlined on hover) for the keyboard and screen readers. A flow shows as a stack of cards with its step count; the stack fans out on hover.
- Combinations of inputs that no state shows are the last row, "Not covered", as dashed cards listing the inputs, with the combinations left out on purpose beside them.
- Coming back to the hub (Escape, the logo or the back button) returns to where the reviewer was, so stepping into a state and out again doesn't lose their place.
- The viewer bar runs across the top and is always dark, so it reads as Stateview's frame around the app. The filmstrip takes its own column on wide screens, so the app moves over rather than sliding under it, and the app scrolls inside its own frame, so its fixed sidebars stay beside the filmstrip. Its right edge drags (or takes arrow keys) to resize it between 112 and 320 px thumbnails, and the width is remembered. On phones the filmstrip starts closed and covers the app when opened.
- The bar shows the state's title on one line; a step in a flow adds a "3/4" badge and the step's title, which truncates first.
- Bar controls are icon-only; the label and shortcut appear in a tooltip. Previous and Next stay focusable at the ends of the list, so keyboard focus is never dropped.
- Step changes are announced to screen readers ("Roles: Viewer checking who's on the team."), and the page title follows the state.
- Shortcuts don't fire while typing, inside a radio group or menu, or inside the comment popover. Escape first closes the comment tools; only a second Escape leaves the state.
- Comments copied from the toolbar are prefixed with the state's title, URL and inputs, so an agent can open exactly what the reviewer saw.
- Component edges are inset or outset box shadows, never native borders, so adding an edge never shifts layout.
