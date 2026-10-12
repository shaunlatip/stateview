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

Then parse the manifest's string inputs into the screen's props. List each input's values once, first value as the default, and fall back to the default for unknown values:

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

When the environment input's value is `mobile`, the viewer narrows the frame to 375 px. The browser window stays desktop-sized, so everything that measures the window still reports desktop: CSS media queries (Tailwind's `sm:`, `md:` and so on), `100vw`, `window.matchMedia`, `window.innerWidth`/`innerHeight`, and hooks and helpers built on them. Search the changed files for all of these before writing the mobile state.

- **Prefer container queries.** Layout written with `@container` (Tailwind `@container` on the screen's root, then `@md:`, `@min-[40rem]:`) reflows inside the narrow frame and in a narrow window. The sample screen does this. When the changed files use viewport breakpoints, convert those classes: put `@container` on the screen's root element and replace `sm:` with `@min-[40rem]:` (Tailwind's `sm` is 40rem), and `100vw` with `100cqw`. In the real app the root spans the window, so production behavior is unchanged. List these edits in your report; they're usually the largest part of the boundary diff.
- **Otherwise add an override at the boundary.** Give the viewport hook an override, or the screen an optional `isMobile` prop that defaults to the hook. This covers JavaScript checks only; CSS media queries still need the conversion above.

```tsx
export function MapScreen({ isMobile: isMobileOverride, ...props }: MapScreenProps & { isMobile?: boolean }) {
  const detected = useIsMobile();
  const isMobile = isMobileOverride ?? detected;
  /* ... */
}
```

The render function passes `isMobile={inputs.breakpoint === "mobile"}`.

Measurements that read the window directly (a map fitting its zoom to `window.innerWidth`, a popover placed against the window) stay desktop-sized in the frame. Pass the size in where it's cheap; otherwise list the affected combination under `uncovered`.

### Fixed-position elements and full-height screens

- **`position: fixed` escapes the frame.** A sheet, scrim or toast that's fixed to the viewport spans the whole window, not the 375 px frame. Wrap the mobile render in an element with `contain: layout` (Tailwind `[contain:layout]`), which makes it the containing block for fixed descendants.
- **The review bar sits over the bottom 6rem of the window.** The frame adds bottom padding, which only helps pages that scroll. A full-height screen (`h-dvh`, `h-screen`, a map or editor) keeps its bottom edge under the bar. In the render function, give the screen a box `calc(100dvh - 6rem)` tall and let its root fill it (an optional `className` prop on the screen, or `[&>main]:h-full` on the wrapper).

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

- [ ] Every input in the manifest is read by `render`, and every key the parser reads is an input in the manifest.
- [ ] Every value of every input produces a visibly different screen. Drop values that don't.
- [ ] Every new prop, context and override is optional and defaults to today's behavior; production code paths are unchanged.
- [ ] No review state calls a real API, writes data, patches `fetch` or reads secrets.
- [ ] Loading never resolves, errors reject, and actions answer from canned responses after a short delay.
- [ ] The mobile state reflows inside the 375 px frame: no media-query classes or window measurements left on the changed screen's path, and fixed elements stay in the frame.
- [ ] A full-height screen's bottom edge isn't under the review bar.
- [ ] Opening the same state twice renders the same screen.
- [ ] The app's typecheck passes (its `typecheck` script, or `tsc --noEmit` from its own `node_modules` if it has none), and its lint, if it has one.
