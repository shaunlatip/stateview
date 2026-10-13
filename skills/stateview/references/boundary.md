# Creating the state boundary

Read this after the manifest's inputs are drafted (see `composition.md`). It covers how to make the changed screen start in any state the manifest names.

## The contract

The review renders the real screen through one function:

```ts
type Render = (inputs: Record<string, string>) => ReactNode;
```

`inputs` is the frame's resolved inputs: the manifest's `baseline` with the state's (or step's) `set` applied on top. Every value is a string from the manifest. You write this render function, plus the fixtures it reads, and pass it to `defineReview(manifest, render)`.

Rules that hold everywhere below:

- **Everything inside the boundary is the real app.** Real components, real logic, real styles. Only what sits outside the boundary is faked: the session, flags, network responses, the clock.
- **Production behavior does not change.** Every prop, context or override you add is optional and defaults to what the app does today. A production build with no review route must behave exactly as before.
- **The review is live.** The reviewer can click, type and submit. Actions answer from canned responses, so each state behaves like the app without touching real data.

The model implementation is the sample screen:

- `src/sample-app/state.ts`: every input the screen reads, as one `MembersState` object of string values, and `parseMembersState`.
- `src/sample-app/fixtures.ts`: canned data keyed by input value, with real-looking content.
- `src/sample-app/members-screen.tsx`: `MembersScreen({ state })` renders entirely from `state`; actions resolve after a short delay.

## 1. Find the boundary

The boundary is the highest component that renders the changed screen and below which all of its state can be supplied. Start at the changed files and walk up until every input in the manifest is either read from props or from something you can override.

State hides in these places. Check each one for the changed screen:

| Where | What to look for |
|---|---|
| Session and auth | `useSession`, `auth()`, `currentUser`, role or permission helpers |
| Context providers | team, workspace, plan and theme providers in layouts |
| Layout wrappers | `layout.tsx` files that fetch or gate before the page renders |
| Flag clients | `useFeatureFlag`, `useFlags`, `flags()` from a flags SDK, experiment hooks |
| Data fetching | `useSWR`, `useQuery`, `fetch` in effects, server components and server actions |
| URL | `useSearchParams`, `useParams`, route segments |
| Local state | `useState` and `useReducer` holding moments: open dialogs, drafts, selection, steps |
| Viewport | `useMediaQuery`, `useIsMobile`, `window.innerWidth`, resize listeners |
| Nondeterminism | `Date.now()`, `new Date()`, `Math.random()`, `crypto.randomUUID()` used for display |

Pick the boundary as low as possible while still above everything the change reads. A boundary at the page is usual; a boundary at the app root means the scope is too wide.

## 2. Preferred: split container and screen

Split the page into a container that gathers real state and a screen that takes it as props. Production renders the container; the review renders the screen.

```tsx
// Before: state gathered inside the component that renders it.
export function MembersPage() {
  const { role } = useSession();
  const { data, isLoading } = useSWR("/api/members", fetcher);
  return <MembersList role={role} members={data} loading={isLoading} />;
}

// After: the container keeps today's behavior; the screen takes everything as props.
export function MembersPage() {
  const { role } = useSession();
  const { data, isLoading } = useSWR("/api/members", fetcher);
  return <MembersScreen role={role} members={data ?? []} loading={isLoading} />;
}

export function MembersScreen(props: MembersScreenProps) {
  /* everything that used to live in MembersPage's render */
}
```

Then parse the manifest's string inputs into the screen's props. List each input's values once, in the order the state panel should show them (smallest to largest, off before on). The manifest's `baseline` says which value is the default, and the viewer always passes a value for every input, so the fallback to the first value only guards against a stale link:

```ts
export const membersInputValues = {
  role: ["owner", "member", "viewer"],
  membersRequest: ["ready", "loading"],
  breakpoint: ["desktop", "mobile"],
} as const;

type Values = typeof membersInputValues;
export type MembersState = { [K in keyof Values]: Values[K][number] };

export function parseMembersState(inputs: Record<string, string>): MembersState {
  const entries = Object.entries(membersInputValues).map(([key, values]) => {
    const value = inputs[key];
    return [key, (values as readonly string[]).includes(value) ? value : values[0]];
  });
  return Object.fromEntries(entries) as MembersState;
}
```

The value lists here and the manifest's `inputs[].values` must match. The render function is then one line:

```tsx
const render = (inputs: Record<string, string>) => <MembersScreen {...toProps(parseMembersState(inputs))} />;
```

`toProps` maps state to fixtures (`members: membersFor(state)`, `loading: state.membersRequest === "loading"`). The sample passes the parsed state straight in (`<MembersScreen state={...} />`) because it has no production container; in a real app, keep the screen's props in the app's own types and do the mapping in the review.

When the screen is the page itself, move it into its own file (`components/HomeScreen.tsx`) and leave `page.tsx` rendering it: Next.js rejects named exports from a page file other than its route config, so the review can't import the screen from `page.tsx`.

## 3. When state is read deep in the tree

If the changed code reads a hook several levels down and threading props would touch many files, add an optional override at the source hook. Keep it to the hooks the change reads.

```tsx
const FlagOverrides = createContext<Record<string, boolean> | null>(null);

export function FlagOverridesProvider({ flags, children }: { flags: Record<string, boolean>; children: ReactNode }) {
  return <FlagOverrides value={flags}>{children}</FlagOverrides>;
}

export function useFeatureFlag(name: string): boolean {
  const overrides = useContext(FlagOverrides);
  const live = useFlagClient(name); // called unconditionally: rules of hooks
  return overrides && name in overrides ? overrides[name] : live;
}
```

With no provider, `overrides` is `null` and the hook returns what it always did. If the real hook makes a network call on mount, override one level lower instead (most flag SDKs accept bootstrap or override values), so the review makes no request. The same pattern works for session and plan hooks: `useSession()` returns the override's user when an override provider is present.

## 4. Network and async

- **Canned fixtures keyed by input value.** One function per data input returns realistic data for each value (`membersFor(state)` returns 1, 6, 5 or 40 people). No lorem ipsum, no $0, no impossible counts.
- **Request states are inputs.** A request the change reads gets an input such as `ready | loading | error`. `loading` never resolves; `error` rejects with the error the real API returns.
- **Actions answer from canned responses** after a short delay (300 to 800 ms), so the reviewer sees the pending state and the result. Pass them in as an optional prop that defaults to the real implementation.

```ts
type MembersApi = {
  load(): Promise<Member[]>;
  remove(id: string): Promise<void>;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function reviewApi(state: MembersState): MembersApi {
  return {
    load: () =>
      state.membersRequest === "loading"
        ? new Promise<Member[]>(() => {})
        : Promise.resolve(membersFor(state)),
    remove: async (id) => {
      await wait(600);
      if (state.removeRequest === "error" && id === FAILED_REMOVAL_ID) throw new Error("Request timed out");
    },
  };
}

// In the screen: api defaults to the real client.
export function MembersScreen({ api = realMembersApi, ...props }: MembersScreenProps) { /* ... */ }
```

If the screen reads through SWR or React Query and splitting is too invasive, wrap the review render in a fresh cache seeded from fixtures: `<SWRConfig value={{ provider: () => new Map(), fallback, fetcher }}>`, or a new `QueryClient` per frame with `setQueryData`. The fetcher answers from fixtures.

Never patch global `fetch` or `XMLHttpRequest`. Never call real APIs, and never write real data, from a review route.

## 5. Server components and server data

On the Pages Router, the same applies to `getServerSideProps` and `getStaticProps`: the review route doesn't run the page's data functions, so the screen takes that data as props and the review passes fixtures.

**The app's shell wraps the review routes too.** `_app.tsx` (Pages Router) or the root `layout.tsx` puts its global nav, page transitions, intro loaders, analytics and dev toolbars around `/stateview/…` as well. Analytics scripts fail in the headless browser `verify.mjs` uses, and a second feedback toolbar fights Stateview's. Skip them when the pathname starts with `/stateview` (a short edit to the shell; list it in your report). Components that read the route (`useRouter().pathname`, `usePathname()`) see `/stateview/<id>/state`; if the changed screen branches on its own path, pass the path in as a prop, or on the Pages Router wrap the render in `RouterContext.Provider` with a router whose `pathname` is the screen's (the context is exported from `next/dist/shared/lib/router-context` on Next 13.4 and `router-context.shared-runtime` from 13.5).

A review route renders on the client from manifest inputs, so server-side data has to arrive as props.

- **Fetch on the server, render on the client.** If `page.tsx` is a server component that queries the database, keep the query in the page and pass the result to a client screen. The review renders that client screen with fixture props.
- **Server actions** become an optional prop on the client screen that defaults to the imported action. The review passes a canned implementation.
- **Don't query databases, call internal services or read secrets from the review route.** If a screen can only render with server data, the client part isn't split far enough yet.

```tsx
// app/members/page.tsx (server component, unchanged behavior)
export default async function Page() {
  const members = await db.member.findMany();
  return <MembersScreen members={members} removeMember={removeMemberAction} />;
}
```

## 6. Moments

Open dialogs, typed text, a selected row or a step in a flow live in local state. Start them through optional `initial*` props that seed `useState`, so the reviewer can still change them:

```tsx
export function InviteForm({ initialEmail = "", initialOpen = false }: { initialEmail?: string; initialOpen?: boolean }) {
  const [email, setEmail] = useState(initialEmail);
  const [open, setOpen] = useState(initialOpen);
  /* ... */
}
```

The review remounts the screen for every frame (it is keyed by the frame), so initial values apply each time a state opens. Don't control these values from the review after mount; the reviewer reaches later moments live.

Review pages are server-rendered like any other route. A moment that renders differently on the server and the client on the first render (a portal, a branch on `typeof document` or `window`) causes a hydration error when it starts open. Gate those branches on a hydrated flag (`useSyncExternalStore(subscribe, () => true, () => false)`) so the server and the first client render agree, then open after hydration.

## 7. Environment

The viewer renders the app in an iframe below its bar (and beside the filmstrip on wide screens), loading the review route with `&embed=1`. The frame is a window of its own, so everything that measures the window measures the frame: CSS media queries (Tailwind's `sm:`, `md:` and so on), `100vw`, `dvh` and `vh`, `window.matchMedia`, `window.innerWidth`/`innerHeight`, scroll position, and hooks built on them. When the environment input's value is `mobile`, the viewer narrows the frame to 375 px, and the screen reflows the way it does on a phone with no change at the boundary.

- **The render function doesn't need to read the environment input.** The viewer reads it to size the frame. Leave the screen's breakpoint classes and viewport hooks as they are; don't convert them to container queries for the review.
- **Thumbnails are the exception.** Hub cards and the filmstrip render each state inline, scaled into the card, not in a frame. A mobile state's thumbnail of a screen that uses media queries shows the desktop layout squeezed into a phone-sized card. That's expected, and the state itself opens correctly, so don't edit production CSS to fix a thumbnail. If the screen branches in JavaScript on a viewport hook, an optional `isMobile` prop that defaults to the hook makes its thumbnail right too, and costs little:

```tsx
export function MapScreen({ isMobile: isMobileOverride, ...props }: MapScreenProps & { isMobile?: boolean }) {
  const detected = useIsMobile();
  const isMobile = isMobileOverride ?? detected;
  /* ... */
}
```

The render function passes `isMobile={inputs.breakpoint === "mobile"}`.

**Theme is an environment input too.** Theme libraries like `next-themes` set one class or attribute on `<html>` from the user's saved choice and ignore nested providers, so a dark state can't set the theme for its frame through them. Set the app's own theme selector (`class="dark"` or `data-theme="dark"`, whichever its CSS keys off) on a wrapper in the render function, and pass the theme as a prop to anything that reads it in JavaScript.

### The frame is a page of its own

- **Fixed-position elements, full-height screens and window scrolling behave as they do in the app.** A fixed sheet or toast stays in the frame, `h-dvh` fills it, and `window.scrollTo` scrolls it. A state that starts scrolled to a section scrolls there itself, in an effect in the render function.
- **The frame loads the app's shell too.** The review route renders inside the app's root layout (or `_app.tsx`), in the viewer and again in the frame. Skip the shell's global nav, analytics and dev toolbars under `/stateview`, or they show inside the frame above the screen.
- **Focus and keys inside the frame are the app's.** Stateview's shortcuts don't fire while focus is in the app, so a screen's own Escape or arrow-key handling works as it does in production.

## 8. Determinism

Each state must look the same every time it opens, so comments and screenshots refer to the same thing.

- Freeze time used for display: pass `now` as an optional prop (default `new Date()`), and give fixtures fixed relative values ("2 days ago").
- Freeze randomness used for display: seed it, or pass the generated values in.
- Use stable ids in fixtures (`"m-daniel"`, not `crypto.randomUUID()`), so keys, selectors and comment anchors don't change between visits.

Randomness the user never sees (request ids, analytics) can stay.

## 9. Heavy or WebGL screens

The hub renders a live, scaled-down thumbnail of every state. Browsers cap active WebGL contexts at about 16, and maps, canvases and video are expensive to render many times at once. For these screens, turn thumbnails off:

```ts
export const regionsReview = defineReview(manifest, render, { thumbnails: "off" });
```

The hub then shows each state's changed inputs in place of the thumbnail. Focus view still renders one live state at a time.

## 10. Before moving on

- [ ] Every input in the manifest except the environment input is read by `render`, and every key the parser reads is an input in the manifest.
- [ ] Every value of every input produces a visibly different screen. Drop values that don't.
- [ ] Every new prop, context and override is optional and defaults to today's behavior; production code paths are unchanged.
- [ ] No review state calls a real API, writes data, patches `fetch` or reads secrets.
- [ ] Loading never resolves, errors reject, and actions answer from canned responses after a short delay.
- [ ] The mobile state shows the phone layout in the 375 px frame (open the state; its thumbnail may still show desktop).
- [ ] The app's shell (nav, analytics, dev toolbars) doesn't render under `/stateview`.
- [ ] Opening the same state twice renders the same screen.
- [ ] The app's typecheck passes (its `typecheck` script, or `tsc --noEmit` from its own `node_modules` if it has none), and its lint, if it has one.
