# Stateview

One or two sentences: what this is and who it's for.

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

Next.js (App Router, React Compiler) · React · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui (Base UI) · Geist · nuqs

## Where to look

- `src/app/` — routes
- `src/components/` — UI (`ui/` is shadcn output)
