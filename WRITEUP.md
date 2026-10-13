# Stateview write-up

[Live app](https://stateview-wine.vercel.app) · Time spent: about 6 hours 25 minutes, 25 minutes over the cap to land the skill engine, deploy and finish this write-up ([time log](README.md#time-log))

### What problem I solved

UI changes, especially agent-built ones, often get visually QAed in a manual way where reviewers click around from a cold state and build makeshift state panels to test out different combinations of state.

Stateview is a review tool that lets coding agents surface different state snapshots of any Next.js app, so reviewers can step through the states that matter instead of clicking around to find them. By calling a skill, your agent can analyze the structure of your diff, and serve curated, realistic snapshots of your app to aid in visual review.

### Key decisions I made and why

I designed Stateview to communicate an app the same way a design is typically handed off; by compressing the large, complex space of all possible states of an experience into a handful of representative screens and flows. The schema follows the same structure I use for my own design handoff in Figma: labeled screens, workflows of multiple screens for longer tasks, under labeled sections.

Stateview has two main screens; a high-level navigational hub where you can look over all the screens composed by your agent and copy comments over to your agent, and a zoomed in view where you're loaded into a snapshot of your app, add comments, view and adjust state, and step through.

**Rendering the app in an iframe.** My first version rendered the app inline. That broke once I added phone states, because media queries still measured the whole browser window, so a 375px state showed the desktop layout squeezed into a narrow column. Keyboard focus also leaked between the two, so an arrow key pressed inside the app changed the review state. I moved the app into a same-origin iframe, which gives it a window of its own, so any app behaves the way it does in production at any size without changing its code.

**Hub.** My first hub was inspired by Figma's sections, with each group of states in a tinted frame in a bento grid ([first hub](https://stateview-v1-bento.vercel.app)). It was hard to scan, so I moved to one row per section and built an explorer to compare layouts, backgrounds and thumbnail sizes before picking one ([hub explorer](https://stateview-explorer.vercel.app/?__variant=above&__look=grid)).

**Viewer.** The viewer started with a floating bar centered at the bottom of the screen ([floating bar](https://stateview-v1.vercel.app/app/members?sv=typical-team)). Once I added the state panel, the floating pieces felt scattered and got in the way of the app, so I moved everything into a fixed header that pushes the app down instead of covering it.

**Accessibility.** Everything in Stateview works from the keyboard, including picking elements to comment on, and axe finds no violations on the hub or the viewer at desktop and phone widths. The end-to-end tests run in Chromium, WebKit and Firefox.

**State panel.** I considered making the panel read-only, since the agent sets each state, but decided to keep every input editable to allow for maximum control ([state panel explorer](https://stateview-panel-explorer.vercel.app/app/members?sv=typical-team&__panel=columns), press S).

### Tradeoffs I made and what I gave up

The deployed app reviews one hand-written screen, a Team members page based on Vercel's Next.js SaaS Starter, with one bug left in on purpose. The skill that writes these states for a real repo is in [`skills/stateview/`](skills/stateview/SKILL.md). I ran it end to end on two of my own apps, Onto and my portfolio.

Getting comments back to the agent is copy and paste for now, with each state's URL and inputs and each element's selector and React components included in the prompt.

The iframe only works for apps served from the same origin, and it can't emulate touch or device pixel ratio.

### Assumptions I operated under

- The reviewer is a designer, PM or engineer checking a change an agent built, usually on a desktop browser.
- A screen's state can be expressed as a set of inputs (role, plan, feature flags, data, request status), and the agent can find where those inputs enter the screen and fake the network responses.
- The agent proposes the states, and the reviewer judges whether they're the right ones.

### What I'd do with more time

- Build a status file where the agent records what it fixed next to the review, so the open review updates on a local dev server or a preview deploy without a server. After that, an MCP like [Agentation](https://www.agentation.com/)'s, so the agent can read comments without the reviewer pasting them.
- Show each state's checks in the viewer, since the manifest already lists what to verify in each state.
- Make the sync two-way, so a comment in Stateview queues an agent to work on it and the screens it's changing show as blocked while the reviewer keeps going.
- Replace more of the skill's broad prompt with structured checks that map common app code patterns to states, so results are faster and more reliable.
- Fill in a few states in the viewer itself: a loading state while the app's frame loads, an error with a retry button when it fails to load, and focus going back to the card you opened when you return to the hub.
- Package it the way Agentation is, with a landing page and an npm install, so anyone can add it to their app.

### Fun UI details :)

Try scrolling up/down on the hub and see what's there! Added a small easter egg there. More details are in the [README](README.md#ui-details).
