# Choosing the states

Read this before writing the manifest. It covers which states to put in a review, how to group them, and how to write their titles, `why` lines and checks. The types are in `src/stateview/manifest.ts`; `src/sample-app/review.json` is a complete example.

## The tension: coverage and legibility

If the only goal were coverage, you would stack every stress into one state: a field showing a validation error while the user is still typing, a list loading while an upload runs, a dialog open over an empty table. That covers more combinations on paper, but it shows a moment no real person is ever in. The reviewer can't judge whether an impossible moment is right, the stresses hide each other, and real bugs happen in plausible moments.

So each state is **a moment a real person could be in, chosen to carry the most risk for this change.** Most states change one or two inputs from a realistic baseline. The few that change more do so because those things happen together in real use.

## Inputs: the taxonomy

Every value the changed screen reads becomes an entry in `inputs`. Each input has a `class` (what kind of thing it is) and a `source` (where the real app gets it).

| Class | `class` value | Examples | How states treat it |
|---|---|---|---|
| 1. Who | `who` | role, permission, plan or entitlement, account status (trial, past due) | Fixed per state. Highest priority: every state's `why` says who the person is. |
| 2. Configuration | `config` | feature flags, settings toggles, experiments | Fixed per state. Flag-gated states are `origin: "code-only"`. |
| 3. Data | `data` | empty or first use, one, typical, many, long or unbreakable strings, missing fields, extreme numbers | Fixed per state. Realistic values only. |
| 4. System | `system` | page loading, sub-component loading, saving, request error, validation error, optimistic update and rollback, stale data | At most one off-baseline per state, unless they really co-occur. Sub-component ones are `code-only`. |
| 5. Moment | `moment` | menu or dialog open, expanded or collapsed, selected row, typed text, step in a flow | At most one off-baseline per state, or shown as a sequence. |
| 6. Environment | `environment` | the breakpoint where the layout reflows | Its own section, or one variant. Values are `desktop` and `mobile`. Theme, reduced motion and zoom are not varied by default. |
| 7. Transition and persistence | none | reload, back, Escape, dismissed-and-remembered, retry after error | Not an input. Express it as a `kind: "sequence"` or as `checks` on a state. |

Classes 1 to 3 combine freely. Classes 4 and 5 are limited because they compete for the reviewer's attention and often for the same region of the screen.

### Picking `source`

`source` tells the reviewer where the value comes from in the real app, and tells you where the boundary has to supply it (see `boundary.md`).

| `source` | Use when the real app gets the value from | Example |
|---|---|---|
| `api` | a network response, the session, or the server: fetched data, request status, the user's role from `/api/me` | `members`, `membersRequest`, `role` |
| `entitlement` | billing or plan logic that grants or withholds features | `plan` |
| `flag` | a feature flag client, experiment assignment or remote config | `ssoBeta` |
| `prop` | state the app holds itself: local `useState`, a URL param, a user setting, a moment you start through an `initial*` prop | `inviteDraft`, a selected tab |
| `viewport` | the window or container size | `breakpoint` |

If a value could fit two sources, pick the one a developer would look in first to change it. A plan read from the session is `entitlement`, not `api`, because the question it answers is "what is this account allowed to do."

## Composition rules

Each rule is followed by how to apply it in the manifest.

1. **Start from a realistic baseline.** The most common who, configuration and data, with real-looking content: no lorem ipsum, no $0, no "Test User". It is always the first state.
   *Manifest:* `baseline` holds the most common value of every input. The first item of the first section is a `state` with `set: {}`.
2. **One question per state.** Each state has a title and a `why` written as a person doing something. If you can't write that sentence, split the state.
   *Manifest:* `title` and `why` on every item. See "Writing titles, `why` lines and checks" below.
3. **Only stack what can be true at the same moment for the same person.** Who, configuration and data combine freely. System and moment get one each per state, unless they really co-occur (submitting a form shows every field error at once). Combinations no real account can be in are excluded, not shown.
   *Manifest:* no more than one `system` input and one `moment` input differ from the baseline in a state's `set`. Impossible combinations go in `excluded` with the reason in parentheses.
4. **Change one or two inputs from the baseline.** Two binary inputs become A, B and A + B; "neither" is the baseline. The state panel highlights what differs from the baseline, so fewer differences read faster.
   *Manifest:* `set` lists only the inputs that differ from `baseline`, usually one or two, never more than three.
5. **Push extremes through data, not through impossibility.** The longest real name, 40 members, a missing avatar: values a production account could have.
   *Manifest:* extremes are values of a `data` input (`many-long`), backed by fixtures with real-looking content.
6. **Separate things that compete for the same region of the screen.** Two banners in one slot, or a dialog over a loading table, hide each other.
   *Manifest:* put them in separate states, even when the combination is possible. List the combination in `uncovered` if it matters.
7. **Use sequences for anything that needs time or order:** a multi-step flow, an error then a retry, dismiss then reload. Each step is still a plausible moment.
   *Manifest:* `kind: "sequence"` with `steps`, each step a `title` and a `set`. Each step's `set` is relative to the baseline, not to the previous step.
8. **Name every input.** Each state lists the inputs it sets; nothing varies without a name.
   *Manifest:* every key in any `set` is an entry in `inputs`, and every value used is in that input's `values`. If two values of an input render the same screen, drop one.
9. **Mark the origin.** `design` for states a designer would draw. `code-only` for flag-gated and entitlement-gated variants that designs don't show, and for sub-component loading, saving and error states. Code-only states are the ones reviewers are least likely to find on their own.
   *Manifest:* `origin: "design"` or `origin: "code-only"` on every item. A state that turns on a `source: "flag"` input is `code-only`.
10. **Scope to the change.** Only inputs the diff reads, plus a short "Nearby features" section for unchanged things the change could break.
    *Manifest:* `scope` records the repo, branch and base. Inputs the diff doesn't touch are left out of `inputs`.
11. **Report coverage honestly.** Combinations no state covers are listed, not forced into unreadable states.
    *Manifest:* `uncovered` lists combinations that are possible but not shown, each a `title` named the way a state would be and the `set` it would need; the hub shows them as dashed cards. `excluded` lists combinations that are impossible, as strings with the reason.
12. **Keep the budget small.** About 8 to 15 states per review, in no more than the nine hub sections below. More than that means the scope is too wide; split the review by screen.
    *Manifest:* count items (a sequence counts as one item).
13. **Keep process material out.** Option comparisons, references, competitor screenshots and before/after notes are not states.
    *Manifest:* every item is a `state` or `sequence` of the real screen. Nothing else goes in `sections`.

## Sections and their order

The hub shows sections in the order a design handoff does. Use these titles and this order:

| Order | Section | Holds |
|---|---|---|
| 1 | **Happy path** | the screen most people see most of the time; holds the baseline |
| 2 | **First use** | empty or brand-new accounts |
| 3 | **Main flows** | the flows the change adds or alters, usually sequences |
| 4 | **Roles** | who can do what |
| 5 | **Plan & flags** | entitlements and flags that change what the screen offers |
| 6 | **Loading & errors** | async states inside the page |
| 7 | **Long content** | real data at its largest or most extreme |
| 8 | **Breakpoints** | where the layout reflows |
| 9 | **Nearby features** | unchanged parts of the page the change could break |

Omit a section when it has nothing to show. A screen with no roles has no Roles section; don't add a placeholder. Each section's `why` is one sentence saying why this family of states matters for this change ("Who can do what. The change added a viewer role."); the hub shows it under the section title.

## Input values and labels

List each input's `values` in reading order (smallest to largest, off before on, the order a person would step through them), not with the baseline first; `baseline` says which value is the default. The state panel and card chips show a value sentence-cased (`at-limit` → "At limit"); when that reads wrong, give the input `labels` for those values (`{ "many-long": "Many" }`).

## Writing titles, `why` lines and checks

**Title** names the state, in sentence case, 60 characters or fewer. Prefer the person and what they're doing, or the condition the screen is in.

| Good | Bad | Problem |
|---|---|---|
| Viewer checking who's on the team | Viewer role | Names the input, not the state |
| Free team at its seat limit | plan=free, members=at-limit | Input dump; the panel already shows inputs |
| Invite rejected: already on the team | Error state 2 | Says nothing about what to look for |
| 40 members with long names | Stress test | Not a moment a person is in |

**`why`** is one sentence, written as a person doing something. It says who they are and what they're trying to do, so the reviewer can judge whether the screen serves them.

- Good: "A read-only viewer checking who has access before a client call."
- Good: "An owner removing someone when the request times out."
- Bad: "Tests the viewer permission branch." (describes code, not a person)
- Bad: "Shows what happens when the API returns 500 and the retry logic kicks in after the toast." (several questions in one)

**`checks`** are short, observable things the reviewer can confirm on screen. Two or three per state at most, each under about eight words. Use them for the risk this state exists to catch, and for transitions and persistence that a static state can't show.

- Good: "No Remove or Revoke actions", "Error is tied to the email field", "Typing clears it", "Try again works".
- Bad: "Make sure everything looks right", "Accessibility is good", "Check the code handles null".

Leave `checks` off when the title and `why` already say what to look for.

## Scope: review the change, not the app

By default a review covers what the branch changed. Find the changed screen, then the inputs its changed code reads. An input the diff doesn't touch stays at its production value and out of the manifest.

Add a **Nearby features** section with one or two states for unchanged things on the same screen that the change could break: a count that now includes new rows, a reset that now has more to clear. Give each a `checks` line naming what should still work.

A full-app review is a different request. Don't widen the scope unless asked.

## What you can derive and what you can't

| Reliable from code | Needs product knowledge | Needs a person |
|---|---|---|
| State variables, context providers, flag and entitlement checks, if/else render branches, loading and error components, breakpoint hooks, enums, API calls and their failure paths | Which values are realistic or extreme (a 40-character name, a place crossing the 180° line), what "many" means for this product, which account types are common | Which states matter most for this change, the design intent, states that only come up through a sequence of actions |

- Derive the inputs and their possible values from code first.
- When you choose a value from product knowledge rather than code, mark it: add "(inferred)" to the input's `label`, or to the state's `why` when only that state rests on the guess. The reviewer will know which choices to check.
- Ask the person running the skill about the third column when the diff doesn't make it clear. The manifest is a first draft that a person reviews and edits.

## Not modeled

Don't create inputs for these:

- **Access**: logins, test accounts, real user or org ids. The boundary supplies the person; the review never signs in.
- **Environment drift**: differences between staging and production data or config.
- **Org-specific configuration** beyond the flags and entitlements the diff reads.
- **Locale, timezone and browser engine**, unless the change touches them.
- **Hover and focus.** They stay live; the reviewer exercises them on the real page.

## Checker warnings

The checker script validates the manifest's shape and warns on the rules that can be tested mechanically:

| Warning | Fires when | Rule |
|---|---|---|
| `baseline-first` | the first item isn't a state with an empty `set` | 1 |
| `noop-set` | a state's `set` gives an input its baseline value (steps may restate values) | 4 |
| `too-many-changes` | a state or step changes more than 3 inputs from the baseline | 4 |
| `stacked-system` | more than one `system` input differs from the baseline in one state or step | 3 |
| `stacked-moment` | more than one `moment` input differs from the baseline in one state or step | 3 |
| `duplicate-state` | two states resolve to the same inputs (a step may equal a state) | 2 |
| `repeated-step` | two consecutive steps in a sequence resolve to the same inputs | 7 |
| `flag-origin` | a state that changes a `flag` input is marked `design` | 9 |
| `unused-input` | an input is declared but no state or step changes it from the baseline | 8, 10 |
| `environment-values` | an `environment` input has no `mobile` value (the viewer narrows the frame to 375 px only for `mobile`) | Taxonomy, class 6 |
| `budget` | more than 15 items, fewer than 3, or more than 9 sections | 12 |
| `title-length` | a title is longer than 60 characters | 2 |

Everything else is judgment: whether a combination is plausible, whether two things compete for the same region, whether a `why` describes a real person, which states carry the most risk. A clean checker run means the manifest is well formed, not that it is well chosen. Fix warnings by changing the states, not by adding inputs to silence them; if a warning is intentional, say why in your summary to the user.

## Worked example 1: Team members (`src/sample-app/review.json`)

Repo `halcyon-web`, branch `feat/member-management` vs `main`. The change adds a viewer role, inviting with a role, an SSO beta and seat limits on the Free plan.

**Baseline:** owner · Pro · SSO beta off · typical team (6 people) · 2 pending invites · members loaded · no request in flight · empty invite form · desktop.

| Section | State | Sets | Origin |
|---|---|---|---|
| Happy path | Owner managing a typical team | baseline | design |
| First use | Owner who just created a team | `members: one`, `invites: none` | design |
| Main flows | Invite a teammate (sequence) | 1: baseline · 2: `inviteDraft: filled` · 3: `inviteDraft: filled`, `inviteRequest: submitting` · 4: `inviteRequest: success` | design |
| Roles | Member viewing the team | `role: member` | design |
| Roles | Viewer checking who's on the team | `role: viewer` | design |
| Plan & flags | Free team at its seat limit | `plan: free`, `members: at-limit`, `invites: none` | design |
| Plan & flags | Pro team with the SSO beta on | `ssoBeta: on` | code-only |
| Loading & errors | Members list loading | `membersRequest: loading` | code-only |
| Loading & errors | Invite rejected: already on the team | `inviteDraft: filled`, `inviteRequest: duplicate-error` | design |
| Loading & errors | Remove failed | `removeRequest: error` | code-only |
| Long content | 40 members with long names | `members: many-long` | design |
| Breakpoints | Typical team on a phone | `breakpoint: mobile` | design |
| Nearby features | Seat count after an invite | `inviteRequest: success` | design |

**Uncovered:** Viewer on a Free team at its seat limit; Member with the SSO beta on; Phone while the members list loads.
**Excluded:** Free plan with the SSO beta on (SSO is Pro-only).

Things to notice:

- "Invite rejected" sets one `moment` and one `system` input, which is allowed: a filled form and its error are on screen together.
- "Free team at its seat limit" sets three inputs because they belong together: a Free team at the limit has no room for pending invites.
- The viewer state exists because the diff added the role. Its checks name the risk ("No Remove or Revoke actions"), which is how the review catches a permission check written when only owners and members existed.
- The Nearby features state has the same inputs as step 4 of the invite sequence. That is intended, and the checker allows it: the two frames ask different questions (did the invite land; is the bill right).

## Worked example 2: Onto, a map comparing the true size of places

A hypothetical branch `regions-unlimited` vs `main` lets people compare any number of regions (previously two) and rotate and resize each one. Changed files: `PlaceComposer` (now a list of regions), `SpanMap` (many overlays, plus rotate and resize handles), `Readout` (compares N places), `types` (`Place` gains rotation and scale) and `colors` (the palette must cover more than two regions).

**Inputs found in code:** the region list (how many, which is selected); rotation and scale; globe or Mercator projection; mobile or desktop (`useIsMobile`); geocoding status from `GeocodeInput` and `/api/geocode` (idle, loading, results, no results, error); whether the clip worker still shows the rough coastline mask or has loaded the detailed one; whether the settings sheet is open.

**Inputs from product knowledge, marked inferred:** a tiny place (Vatican City), a huge one (Russia), a place of many islands (Indonesia), a place crossing the 180° line (Fiji), a high latitude where Mercator distorts (Greenland), more regions than the palette has colors.

| Input | `class` | `source` | Values (baseline first here; in reading order in the manifest) |
|---|---|---|---|
| `regions` | data | prop | `two`, `three`, `eight` (inferred: more than the palette) |
| `places` (inferred) | data | api | `sf-manhattan`, `vatican`, `fiji`, `indonesia`, `greenland` |
| `transform` | data | prop | `none`, `rotated-scaled` |
| `projection` | config | prop | `globe`, `mercator` |
| `geocode` | system | api | `idle`, `loading`, `results`, `empty`, `error` |
| `coastline` | system | api | `detailed`, `rough` |
| `settingsSheet` | moment | prop | `closed`, `open` |
| `breakpoint` | environment | viewport | `desktop`, `mobile` |

| Section | State | Sets | Origin |
|---|---|---|---|
| Happy path | San Francisco laid over Manhattan | baseline | design |
| Main flows | Add a third region by search (sequence) | 1: `geocode: loading` · 2: `geocode: results` · 3: `regions: three` | design |
| Main flows | Eight regions, more than the palette | `regions: eight` | design |
| Main flows | Region rotated 45° and scaled | `transform: rotated-scaled` | design |
| Loading & errors | Search with no results | `geocode: empty` | design |
| Loading & errors | Geocoding failed | `geocode: error` | code-only |
| Loading & errors | Rough coastline still showing | `coastline: rough` | code-only |
| Long content | Rotate handles on Vatican City | `places: vatican` | design |
| Long content | Fiji rotated across the 180° line | `places: fiji`, `transform: rotated-scaled` | design |
| Long content | Indonesia's islands rotated together | `places: indonesia`, `transform: rotated-scaled` | design |
| Long content | Greenland in Mercator | `places: greenland`, `projection: mercator` | design |
| Breakpoints | Three regions on a phone, settings open | `regions: three`, `settingsSheet: open`, `breakpoint: mobile` | design |
| Nearby features | Swap and reset with rotated regions | `regions: three`, `transform: rotated-scaled` | design |

Checks on the key states: "Colors stay distinct or repeat in order" and "Readout lists all eight" (eight regions); "Handles stay usable when larger than the shape" (Vatican City); "Shape doesn't split or jump at the 180° line" (Fiji); "Swap still swaps the selected pair" and "Reset clears every region and rotation" (nearby).

**Uncovered:** Eight regions in Mercator on a phone; Geocoding error on a phone.
**Excluded:** none. Onto has no accounts, plans or flags, so every combination is possible.

Things to notice:

- First use, Roles and Plan & flags are omitted because the app has nothing to show for them.
- The extreme places live under Long content, which covers data at its extremes, not only long text.
- "Rough coastline still showing" is code-only: it is a sub-component loading state no design draws.
- A map renders WebGL, so this review sets `thumbnails: "off"` (see `boundary.md`).
