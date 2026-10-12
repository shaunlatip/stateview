<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- harden:start -->
## Quality gates

After changing code, run `npm run lint` and `npm run typecheck` and fix every error before calling the work done.

- Lint covers React correctness (including the React Compiler rules), accessibility (jsx-a11y) and the design system (`@shadcn/lint`): use theme tokens and component variants instead of raw colors, arbitrary values or `className` overrides of a component's color, radius or shadow. The error message names the fix.
- Accessibility is a requirement: every control reachable by keyboard with a visible focus ring, semantic elements before ARIA, an accessible name on every icon button, focus moved and returned deliberately for dialogs and menus.
- Performance is a requirement: no layout shift (reserve space for images and async content), no jank while typing or scrolling, and motion that honors `prefers-reduced-motion`.
- Design every reachable state: loading, empty, error, long content, one item, many items.
<!-- harden:end -->
