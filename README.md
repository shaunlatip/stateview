# Stateview

A review layer for web apps. Instead of clicking around a build from a cold start, the reviewer steps through a small set of named states for a change (role, plan, feature flag, data shape, loading and error, breakpoint), comments on elements, and ends with a prompt for their coding agent.

## Try it

Live at https://stateview-wine.vercel.app

- `/` is the hub: every state for the change, one row per section, with live thumbnails. The index on the left jumps to a section, and the button at the top right copies every open comment for a coding agent.
- Open a state to see the real page in that state, with a filmstrip of every state down the left (`F` shows and hides it). `J` and `K` (or the left and right arrows) step back and forward through states and `Esc` goes back to the hub; hover a control to see its shortcut. The app runs in a frame of its own, so keys pressed inside it belong to the app: the shortcuts work from Stateview's bar and filmstrip. "Skip to app", the first Tab stop, moves focus into the app.
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
npm run test:e2e   # the above, plus focus and keys across the app's frame and media queries inside it, in Chromium, WebKit and Firefox (`npx playwright install` first)
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

Next.js (App Router, React Compiler) · React · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui (Base UI) · Geist · Phosphor icons (Stateview) · Lucide icons (the sample app)

## Design language

Stateview's own UI (hub, viewer bar, filmstrip, state panel, toasts) uses the Graphical theme "Stateview" (`GUI.md`, `gui/`). Its light and dark tokens live in `src/stateview/theme.css`, scoped to `.stateview-theme`, and its primitives (button, toolbar control, badge, shortcut hint) in `src/stateview/ui.tsx`. The sample app uses the shadcn kit in `src/components/ui` with its own brand, a fictional product called Halcyon: blue, orange and cool-grey tokens in `src/sample-app/halcyon.css`, scoped to `.halcyon`, so it reads as a separate product, the way a real app under review would. Hub thumbnails and the phone frame reset to the app's own type (`host-frame`).

**Fonts.** Stateview's UI uses Geist and its data text Geist Mono, both loaded by `next/font`. The theme export in `gui/` names Timeless Grotesk; its license doesn't allow the files in a public repository, so the build uses Geist instead.

## Where to look

- `src/stateview/` — the review layer, and the engine the skill copies into other apps. It imports nothing from the app it's in. `manifest.ts` (state types and helpers), `hub.tsx` and `focus-view.tsx` (the two screens), `embedded-screen.tsx` and `frame-protocol.ts` (the app alone, as the viewer's iframe loads it, and the messages between them), `overrides.ts` (inputs changed in the state panel, kept in the URL), `focus-bar.tsx`, `filmstrip.tsx` and `state-panel.tsx` (the viewer's bar, state list and input panel), `thumbnail.tsx` and `card-chips.tsx` (state cards), `logo.tsx`, `agent-export.ts` (comments as Markdown for an agent), `store.ts` (comments and opened states in localStorage), `annotations.ts` (the comment interface), `comment-layer.tsx` (the comment engine behind it: picking, pins, composer), `describe-element.ts` (an element's name, selector, HTML and React components), `review.tsx` and `review-focus.tsx` (`defineReview` and the entry points the generated routes use), `use-frame-query.ts` (the state in the URL), `toast.tsx` (Stateview's own toasts) and `cn.ts` (class merging that knows the theme's utilities).
- `src/sample-app/` — the screen under review. `members-screen.tsx` renders entirely from the `MembersState` object in `state.ts`, `fixtures.ts` holds the canned data, and `review.json` lists the states for this change (typed in `manifest.ts`).
- `skills/stateview/` — the `/stateview` skill: `SKILL.md`, `references/` (composition rules, boundary patterns) and `scripts/` (install, new-review, check, verify).
- `src/app/` — routes: `/` (hub) and `/app/members?sv=<state>` (one state). The same route with `&embed=1` renders the screen alone; it's what the viewer's iframe loads.

## How a state reaches the screen

The Team members screen takes all of its state through one object (`MembersState`: role, plan, SSO beta flag, member data, pending invites, request states, the invite form, breakpoint). Each state in the manifest sets a few of those inputs on top of a baseline, and the screen's own logic derives everything else. Actions on the page (remove, revoke, invite) answer from canned responses after a short delay, so every state is the live, clickable page rather than a picture of it.

## Dependencies worth naming

- **Comments** are Stateview's own engine (`src/stateview/comment-layer.tsx`), written from scratch. Everything else depends on the `AnnotationLayer` interface in `src/stateview/annotations.ts`, so the engine could be swapped for another one by changing one file. React component names come from React's development build, so production builds show the selector and HTML without them.
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
- The viewer shows the app in a same-origin iframe, so the app has a window of its own. Media queries, viewport units, `innerWidth` and `matchMedia` measure the frame (a resizable 393 × 852 px phone frame in the phone state on wide screens), fixed elements stay inside it, and its focus and keys are its own: Escape or an arrow key in the app never steps the review, and when the app drops focus (removing a member drops it to the page body), that stays the app's bug to see rather than handing the keyboard to Stateview. After the first load the viewer sends each state by message, so stepping doesn't reload the frame. The comment engine runs inside the frame and shares comments with the viewer through localStorage.
- Thumbnails stay inline renders rather than iframes, so a phone-state thumbnail of an app that uses media queries shows its desktop layout. The sample screen uses container queries, so its thumbnails reflow correctly.
- A state card has one keyboard stop: its title, a link described by the why line and chips. The screen above it links to the same state for the pointer but is out of the tab order and hidden from assistive tech, so element pickers and screen readers each get one clear target.
- Each section is a band: its title and why line, then its cards in one row that scrolls sideways rather than wrapping. The index marks the section at the top of the window.
- A card shows a dot until its state has been opened, and a comment count when it has open comments. A flow shows as a stack of cards, one per further step up to three, with its step count.
- Coming back to the hub (Escape, the logo or the back button) returns to where the reviewer was, so stepping into a state and out again doesn't lose their place.
- The viewer bar runs across the top, ruled off from the app, so it reads as Stateview's frame around it. The filmstrip takes its own column on wide screens, so the app moves over rather than sliding under it, and the app scrolls inside its own frame, so its fixed sidebars stay beside the filmstrip. The strip scrolls to the state on screen without `scrollIntoView`, which in Chrome would also move the Tab starting point into the strip. Its right edge drags (or takes arrow keys) to resize it between 112 and 320 px thumbnails, and the width is remembered. On phones the filmstrip starts closed and covers the app when opened.
- The bar shows the state's title on one line; a step in a flow adds "· 3/4 Submitting".
- Bar controls are icon-only; the label and shortcut appear in a tooltip. Previous and Next stay focusable at the ends of the list, so keyboard focus is never dropped.
- Step changes are announced to screen readers ("Roles: Viewer checking who's on the team."), and the page title follows the state.
- Shortcuts don't fire inside the app, while typing, or inside a radio group or menu in Stateview's own controls. Escape first ends comment mode; only a second Escape leaves the state.
- Comments copied from the toolbar are prefixed with the state's title, URL and inputs, so an agent can open exactly what the reviewer saw.
- Component edges are inset or outset box shadows, never native borders, so adding an edge never shifts layout.
