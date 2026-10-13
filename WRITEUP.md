# Stateview write-up

[Live app](https://stateview-wine.vercel.app) · Time spent: about 6 hours 15 minutes, 15 minutes over the cap to land the skill engine, deploy and finish this write-up ([time log](README.md#time-log))

### What problem I solved

UI changes, especially agent-built ones, often get visually QAed in a manual way where reviewers click around from a cold state and build makeshift state panels to test out different combinations of state.

Stateview is a review tool that lets coding agents surface different state snapshots of any React app to provide a guided, simplified feedback loop for visual QA. By calling a skill, your agent can analyze the structure of your diff, and serve curated, realistic snapshots of your app to aid in visual review.

### Key decisions I made and why

I designed Stateview to communicate an app the same way a design is typically communicated or handed off; by compressing the large, complex space of all possible states of an experience into a handful of representative screens and flows to communicate a design.

The schema I used for what to review follows the same structure I typically use for my own design handoff in Figma: with labeled screens, workflows of multiple screens for longer tasks, under labeled sections.

Stateview has two main states; a high-level navigational hub where you can look over all the screens composed by your agent and copy comments over to your agent, and a zoomed in view where you're loaded into a snapshot of your app, add comments, view and adjust state, and step through.

**Rendering the app in an iframe.** My first version rendered the app inline, in a container sized to each state. That broke once I added phone states, because media queries still measured the whole browser window, so a 375px state showed the desktop layout squeezed into a narrow column. Keyboard focus also leaked between the two, so an arrow key pressed inside the app changed the review state. I moved the app into a same-origin iframe, which gives it a window of its own, so any app behaves the way it does in production at any size without changing its code, and comment pins still work because the frame shares the app's origin.

**Hub.** My first hub was inspired by Figma's sections: each group of states sat in a tinted frame with a notched title tab, in a bento grid ([first hub](https://stateview-v1-bento.vercel.app)). It was hard to scan, and even with color, I didn't feel the colors said enough about each section to justify them. So I moved to one row per section with easier-to-scan lines, and built an explorer to compare layouts, backgrounds and thumbnail sizes before picking one ([hub explorer](https://stateview-explorer.vercel.app/?__variant=above&__look=grid)).

**Viewer.** The viewer started with a floating bar centered at the bottom of the screen ([floating bar](https://stateview-v1.vercel.app/app/members?sv=typical-team)). The state's title matters in a review tool and takes up a lot of space, and once I added the state panel, the floating pieces felt scattered and got in the way of the app. So I moved everything into a fixed header. It takes some vertical space, but it pushes the app down instead of covering it.

**Accessibility.** Everything in Stateview works from the keyboard, including picking elements to comment on, and axe finds no violations on the hub or the viewer at desktop and phone widths. The end-to-end tests run in Chromium, WebKit and Firefox.

**State panel.** I considered making the panel read-only, since the agent sets each state, but decided to keep every input editable to allow for maximum control. I compared several layout and field options before settling on inline rows that drop down from the header ([state panel explorer](https://stateview-panel-explorer.vercel.app/app/members?sv=typical-team&__panel=columns), press S).

### Tradeoffs I made and what I gave up

The deployed app reviews one hand-written screen, a Team members page based on Vercel's Next.js SaaS Starter, with one bug left in on purpose. The skill that writes these states for a real repo is in [`skills/stateview/`](skills/stateview/SKILL.md), with a checker for the manifest and an installer. I ran it end to end on two of my own apps, Onto and my portfolio.

Getting comments back to the agent is copy and paste for now, with each state's URL and inputs and each element's selector and React components included in the prompt. For the next step I compared resolving by hand, a status file in the repo, a local sync server with an MCP like Agentation's, and a hosted store with sign-in. I'd build the status file next: the agent records what it fixed next to the review, so on a local dev server Next's hot reload updates the open review, and on a preview deploy the status ships in the same commit as the fix. It needs no server and works in both places, which a local MCP can't, so the MCP comes after it.

The iframe only works for apps served from the same origin, and it can't emulate touch or device pixel ratio.

### Assumptions I operated under

- The reviewer is a designer, PM or engineer checking a change an agent built, usually on a desktop browser. Stateview also works on a phone, and phone states open in a phone-sized frame on desktop.
- A screen's state can be expressed as a set of inputs (role, plan, feature flags, data, request status), and the agent can find where those inputs enter the screen and fake the network responses.
- The review runs on the app's own dev server or preview deploy, so it shares the app's origin.
- The agent proposes the states, and the reviewer judges whether they're the right ones.

### What I'd do with more time

First, I'd build the status file. Then I'd add an MCP, like Agentation does, so the agent can read comments without the reviewer pasting them.

I'd also show each state's checks in the viewer. The manifest already lists what to verify in each state (for the viewer state, that there are no Remove or Revoke actions), but the viewer doesn't show them yet.

After that, I'd make the sync two-way so reviewers don't have to go back to their IDE. A comment in Stateview would queue an agent to work on it, the screens it's changing would show as blocked, and the reviewer could keep reviewing the rest while it works.

I'd also make the mapping from code to states more deterministic. The skill uses a fairly broad prompt today, and I'd replace more of it with structured checks that map common app code patterns to states, so results are faster and more reliable.

I'd also fill in a few states in the viewer itself: a loading state while the app's frame loads, an error with a retry button when it fails to load, and focus going back to the card you opened when you return to the hub.

Lastly, I'd package it the way Agentation is, with a landing page and an npm install, so anyone can add it to their app.

### Fun UI details :)

- Try scrolling up/down on the hub and see what's there! Added a small easter egg there
- Workflows are represented by stacks of cards that map to the actual number of screens they have, up to a max
- Thumbnails are the real screen rendered at 1088px and scaled down, so they always match the build. Animations inside them are off, so a loading skeleton doesn't pulse in every card.
- On wide screens, phone states sit in a resizable 393×852 frame on a cutting mat, with a live size readout. The right and bottom edges also resize with arrow keys.
- Nothing driven from the keyboard animates. Holding K never shows two "current" rings in the filmstrip, and the state panel opens at once with S but keeps its entrance on click.
