# Stateview

A review layer for web apps. Instead of clicking around a build from a cold start, the reviewer steps through a small set of named states for a change (role, plan, feature flag, data shape, loading and error, breakpoint), comments on elements, and ends with a prompt for their coding agent.

## Try it

- `/` is the hub: every state for the change, grouped into sections, with live thumbnails.
- Open a state to see the real page in that state. `J` / `K` (or the arrow keys) step through states and `Esc` goes back to the hub; hover a control to see its shortcut.
- Comment on any element with the toolbar in the bottom-right corner (or `⌘⇧F`). Each comment is saved with the state it was made in.

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
npm run build
```

CI runs lint, typecheck and build on every push (`.github/workflows/ci.yml`).

## Stack

Next.js (App Router, React Compiler) · React · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui (Base UI) · Geist · nuqs · Agentation · Phosphor icons

## Design language

Stateview's own UI (hub, review bar, toasts) uses the Graphical theme "Stateview" (`GUI.md`, `gui/`). Its light and dark tokens live in `src/stateview/theme.css`, scoped to `.stateview-theme`, and its primitives (button, toolbar control, badge, shortcut hint) in `src/stateview/ui.tsx`. The sample app keeps the default shadcn kit in `src/components/ui`, so it reads as a separate product, the way a real app under review would. Hub thumbnails and the phone frame reset to the app's own type (`host-frame`).

**Fonts.** Data text uses Geist Mono, which the app already loads. The UI face is **Timeless Grotesk** (Timeless Sans, Grotesk cut), loaded by the `@font-face` rules in `src/stateview/theme.css`. Its license (Timeless Free Font License 1.2) allows embedding in a website but not putting the fonts in a public repository, so the files are gitignored and ship only with the deployed site. To run it locally with the right face:

1. Get the family at [timeless.co/type](https://timeless.co/type) ("Get access"; they email the files).
2. Copy `TimelessSans-GroteskLight.woff2`, `TimelessSans-GroteskRegular.woff2` and `TimelessSans-GroteskSemibold.woff2` from `Sans-Grotesk/static/woff2/`, plus `LICENSE.pdf`, into `public/fonts/timeless-grotesk/`.

Without them, Stateview's UI falls back to the system sans-serif and nothing else changes.

## Where to look

- `src/stateview/` — the review layer. `manifest.ts` (state types and helpers), `hub.tsx`, `focus-view.tsx` and `focus-bar.tsx` (the review screens), `store.ts` (comments in localStorage), `annotations.ts` (the comment interface) and `agentation-layer.tsx` (the one adapter behind it).
- `src/sample-app/` — the screen under review. `members-screen.tsx` renders entirely from the `MembersState` object in `state.ts`, `fixtures.ts` holds the canned data, and `manifest.ts` lists the states for this change.
- `src/app/` — routes: `/` (hub) and `/app/members?sv=<state>` (one state).

## How a state reaches the screen

The Team members screen takes all of its state through one object (`MembersState`: role, plan, SSO beta flag, member data, pending invites, request states, the invite form, breakpoint). Each state in the manifest sets a few of those inputs on top of a baseline, and the screen's own logic derives everything else. Actions on the page (remove, revoke, invite) answer from canned responses after a short delay, so every state is the live, clickable page rather than a picture of it.

## Dependencies worth naming

- **Agentation** (`agentation`, © Benji Taylor, [PolyForm Shield 1.0.0](https://polyformproject.org/licenses/shield/1.0.0/)) provides element picking and the comment popover. It is used as an npm dependency through its public props and exports only; none of its source is copied into this repo. Everything else depends on Stateview's own `AnnotationLayer` interface (`src/stateview/annotations.ts`), so the engine can be replaced with an in-house picker by swapping one file. Agentation keeps one comment list per pathname, and every state shares `/app/members`, so the adapter seeds Agentation's storage with the current state's comments and remounts it when the state changes. Stateview's copy is the one that counts.
- **Temporary:** while building, a plain Agentation toolbar also sits on the hub and the unknown-state page (`src/components/dev/feedback-toolbar.tsx`) for feedback on Stateview's own UI. It will be removed before the final build.
- **nuqs** keeps the current state (`?sv=`, `?step=`) in the URL, so every state has a link and the back button steps back.

## Credits

The sample screen's layout follows the Team Settings page of Vercel's [Next.js SaaS Starter](https://github.com/nextjs/saas-starter) (MIT), rebuilt here with shadcn/ui components and without its database, auth or payments.

## Time log

6 hours of build. Problem research and UI references were done beforehand.

| Session | Time (PT) | Hours | Work |
|---|---|---|---|
| 1 | Sun Oct 11, 23:48– | | Scaffold, deploy, sample screen, manifest, hub, focus view, comments |

## UI details

A running list of interaction and visual details, kept while building.

- Thumbnails are the real screen rendered at 1152 px and scaled to a quarter, so they always match the build. They are inert and hidden from assistive tech, and `content-visibility: auto` skips the ones far off screen.
- The sample screen uses container queries instead of viewport breakpoints, so it reflows the same way in a thumbnail, in the 375 px frame of the phone state and in a narrow window.
- The whole state card is one link, named by its title and described by its why line and chips, so element pickers and screen readers each get one clear target.
- Sections are tinted by question family (who, system, data, nearby) like Figma's section colors, with the title on a tab whose edge steps down into the body through an SVG tail glued to the tab, after Rauno's Next.js dev tools notch. The tab grows with its title.
- The hub is a bento grid of fixed one-card tracks; a section spans as many tracks as it has cards, so one-card sections share a row.
- The review bar floats over the page instead of framing it, so the app keeps its full width. It samples the colour behind it and takes the opposite scheme, so it stays distinct from any app. On phones it leaves room for the comment toolbar, and its text wraps instead of truncating.
- Bar controls are icon-only; the label and shortcut appear in a tooltip. Previous and Next stay focusable at the ends of the list, so keyboard focus is never dropped.
- Step changes are announced to screen readers ("Roles: Viewer checking who's on the team."), and the page title follows the state.
- Shortcuts don't fire while typing, inside a radio group or menu, or inside the comment popover. Escape first closes the comment tools; only a second Escape leaves the state.
- Comments copied from the toolbar are prefixed with the state's title, URL and inputs, so an agent can open exactly what the reviewer saw.
- Component edges are inset or outset box shadows, never native borders, so adding an edge never shifts layout.
