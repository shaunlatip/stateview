import { parseAgentStatus } from "@/stateview/agent-status";
import type { Manifest } from "@/stateview/manifest";
import { portfolioInputValues as v, type PortfolioState } from "./state";
import status from "./status.json";

/** What a coding agent reported doing with the review's comments; an edit hot-reloads into the open review. */
export const portfolioStatus = parseAgentStatus(status);
export const PORTFOLIO_STATUS_PATH = "src/examples/portfolio/status.json";

/**
 * The review for shaunlatip/portfolio#73, "Home: drag-scroll selected work,
 * one-pane hero with fixed peek, per-theme backgrounds", written by applying
 * the composition rules: a realistic baseline first, one question per state,
 * one or two inputs changed from the baseline, and only combinations a
 * visitor can actually be in.
 */
export const portfolioManifest: Manifest<PortfolioState> = {
  id: "portfolio-home",
  version: 1,
  route: "/app/portfolio",
  hub: "/portfolio",
  screen: "Home",
  scope: {
    repo: "portfolio",
    icon: "/examples/portfolio/favicon.svg",
    branch: "shaunlatip/drag-scroll-selected-work",
    base: "main",
  },
  baseline: {
    theme: "light",
    heroMode: "flat",
    railPosition: "start",
    pointer: "rest",
    arrowFocus: "none",
    breakpoint: "desktop",
    windowHeight: "tall",
  },
  inputs: [
    { id: "theme", label: "Theme", class: "config", source: "prop", values: v.theme },
    {
      id: "heroMode",
      label: "Hero",
      class: "config",
      source: "flag",
      values: v.heroMode,
      labels: { flat: "One pane", peek: "Peek", cover: "Cover" },
    },
    {
      id: "railPosition",
      label: "Selected work",
      class: "moment",
      source: "prop",
      values: v.railPosition,
      labels: { start: "At the start", middle: "One card along", end: "At the end" },
    },
    {
      id: "pointer",
      label: "Pointer",
      class: "moment",
      source: "prop",
      values: v.pointer,
      labels: { rest: "Away", near: "Near the section", hover: "On an arrow" },
    },
    {
      id: "arrowFocus",
      label: "Keyboard focus",
      class: "moment",
      source: "prop",
      values: v.arrowFocus,
      labels: { none: "None", disabled: "On the arrow that can't move" },
    },
    { id: "breakpoint", label: "Breakpoint", class: "environment", source: "viewport", values: v.breakpoint },
    {
      id: "windowHeight",
      label: "Window height",
      class: "environment",
      source: "viewport",
      values: v.windowHeight,
      labels: { tall: "Tall", short: "Short (560px)" },
    },
  ],
  sections: [
    {
      id: "happy-path",
      title: "Happy path",
      why: "The home most visitors land on: the one-pane hero with selected work peeking below it.",
      items: [
        {
          kind: "state",
          id: "light-desktop",
          title: "Daytime visit on a laptop",
          why: "A recruiter opening latip.me during the day to see who Shaun is and what he's shipped.",
          set: {},
          checks: [
            "The hero leaves exactly 136px for the selected-work heading at the bottom of the window",
            "The grid sits behind the hero only, clears around the copy and fades out above selected work",
            "Below the hero the page is plain",
          ],
        },
        {
          kind: "state",
          id: "dark-desktop",
          title: "Evening visit on a laptop",
          why: "A hiring manager opening latip.me after 6 pm, when the site picks the dark theme.",
          set: { theme: "dark" },
          checks: [
            "The hero is plain, with no grid",
            "The 12 column lanes start below the hero and stay clear behind the selected-work heading",
          ],
        },
      ],
    },
    {
      id: "main-flows",
      title: "Main flows",
      why: "The change makes selected work a carousel you step through with the header arrows.",
      items: [
        {
          kind: "sequence",
          id: "step-through-work",
          title: "Step through selected work",
          why: "A visitor clicking the forward arrow to see the projects past the right edge.",
          steps: [
            { title: "Pointer on the forward arrow", set: { pointer: "hover" } },
            { title: "One card along", set: { railPosition: "middle", pointer: "hover" } },
            { title: "At the end", set: { railPosition: "end", pointer: "near" } },
          ],
        },
      ],
    },
    {
      id: "arrow-states",
      title: "Arrow states",
      why: "The header arrows have three steps of emphasis and a dimmed direction; each one has to read in both themes.",
      items: [
        {
          kind: "state",
          id: "arrows-near-light",
          title: "Pointer near selected work",
          why: "A visitor moving the mouse down toward the cards, within 40px of the section.",
          set: { pointer: "near" },
          checks: ["Forward arrow gets the light fill and full ink", "Back arrow stays bare with its icon at 35%"],
        },
        {
          kind: "state",
          id: "arrows-hover-light",
          title: "Pointer on the forward arrow",
          why: "A visitor about to click forward to see more work.",
          set: { pointer: "hover" },
          checks: ["Forward arrow inverts to solid ink", "Back arrow doesn't react"],
        },
        {
          kind: "state",
          id: "arrows-near-dark",
          title: "Pointer near selected work, dark",
          why: "An evening visitor moving the mouse toward the cards.",
          set: { theme: "dark", pointer: "near" },
          checks: ["The near fill is visible against the dark canvas"],
        },
        {
          kind: "state",
          id: "arrows-hover-dark",
          title: "Pointer on the forward arrow, dark",
          why: "An evening visitor about to click forward.",
          set: { theme: "dark", pointer: "hover" },
          checks: ["Forward arrow inverts to the light fill with dark ink"],
        },
        {
          kind: "state",
          id: "focus-disabled-start",
          title: "Keyboard focus on the back arrow at the start",
          why: "A keyboard user tabbing into the carousel before it has moved.",
          set: { arrowFocus: "disabled" },
          checks: [
            "The back arrow takes focus with a full-strength ring",
            "Its icon stays dimmed and pressing it does nothing",
          ],
        },
        {
          kind: "state",
          id: "focus-disabled-end",
          title: "Keyboard focus on the forward arrow at the end, dark",
          why: "A keyboard user who has stepped to the last project and is still on the forward arrow.",
          set: { theme: "dark", railPosition: "end", arrowFocus: "disabled" },
          checks: ["Focus stays on the forward arrow instead of dropping to the page", "The ring reads on the dark canvas"],
        },
      ],
    },
    {
      id: "breakpoints",
      title: "Breakpoints",
      why: "Below 768px the arrows go away and the rail and experiments are swiped.",
      items: [
        {
          kind: "state",
          id: "mobile-light",
          title: "Daytime visit on a phone",
          why: "Someone opening Shaun's link from a LinkedIn message on their phone, at 375 px.",
          set: { breakpoint: "mobile" },
          checks: [
            "Portrait and plate stack above the copy",
            "Selected work follows straight after the intro",
            "Nothing overflows sideways",
          ],
        },
        {
          kind: "state",
          id: "mobile-dark",
          title: "Evening visit on a phone",
          why: "The same link opened on a phone in the evening.",
          set: { theme: "dark", breakpoint: "mobile" },
          checks: ["No column lanes on a phone"],
        },
      ],
    },
    {
      id: "window-height",
      title: "Window height",
      why: "The one-pane hero scales its type and figure off the window's height as well as its width.",
      items: [
        {
          kind: "state",
          id: "short-window",
          title: "Short browser window",
          why: "A visitor on a laptop with the browser docked to half the screen's height, 560px tall.",
          set: { windowHeight: "short" },
          checks: [
            "Copy steps down to its 17px floor and the figure shrinks with it",
            "The selected-work heading still shows at the bottom",
          ],
        },
      ],
    },
    {
      id: "hero-modes",
      title: "Other hero modes",
      why: "Cover and peek are still in the code behind ?hero= and the dev-only menu; the change reworked the peek.",
      items: [
        {
          kind: "state",
          id: "hero-peek",
          title: "Peek hero",
          why: "Shaun comparing heroes by opening the home with ?hero=peek.",
          set: { heroMode: "peek" },
          checks: [
            "The sheet shows a fixed 176px on load",
            "Scrolling slides the sheet over the pinned hero with rounded top corners",
          ],
        },
        {
          kind: "state",
          id: "hero-cover",
          title: "Cover hero",
          why: "Shaun comparing heroes by opening the home with ?hero=cover.",
          set: { heroMode: "cover" },
          checks: ["The hero fills the window", "The intro fades and lifts as the sheet arrives"],
        },
      ],
    },
  ],
};
