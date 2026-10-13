import { parseAgentStatus } from "@/stateview/agent-status";
import type { Manifest } from "@/stateview/manifest";
import { gatewayInputValues as v, type GatewayState } from "./state";
import status from "./status.json";

/** What a coding agent reported doing with the review's comments; an edit hot-reloads into the open review. */
export const gatewayStatus = parseAgentStatus(status);
export const GATEWAY_STATUS_PATH = "src/examples/ai-gateway/status.json";

/**
 * The review for the proposed AI Gateway setup hub (vercel-redesign
 * prototype, Proposed version only): one hub that replaces the Overview empty
 * state, Quick Start and the Create API Key modal, grouped by where requests
 * come from. Written by hand with the composition rules in the README: a
 * realistic baseline first (a set-up team connecting something new), one
 * question per state, one or two inputs changed from the baseline (a new team
 * is two: the team and its credit), only combinations a real team can be in.
 */
export const gatewayManifest: Manifest<GatewayState> = {
  id: "ai-gateway-setup",
  version: 1,
  route: "/app/ai-gateway",
  hub: "/ai-gateway",
  screen: "AI Gateway › Setup",
  scope: { repo: "vercel-redesign/prototype", icon: "/examples/ai-gateway/favicon.svg", branch: "main", base: "main" },
  baseline: {
    team: "setup",
    credit: "has-credit",
    page: "quick-start",
    path: "servers",
    projects: "typical",
    key: "none",
    firstRequest: "not-sent",
    cardDialog: "closed",
    projectMenu: "closed",
    agentRun: "closed",
    theme: "dark",
    breakpoint: "desktop",
  },
  inputs: [
    { id: "team", label: "Team", class: "who", source: "api", values: v.team, labels: { new: "New, no traffic", setup: "Set up" } },
    { id: "credit", label: "Credit", class: "who", source: "entitlement", values: v.credit, labels: { "needs-card": "Needs a card", "has-credit": "Has credit" } },
    { id: "page", label: "Page", class: "config", source: "prop", values: v.page, labels: { "quick-start": "Quick Start", overview: "Overview" } },
    {
      id: "path",
      label: "Path",
      class: "moment",
      source: "prop",
      values: v.path,
      labels: { servers: "Get an API key", projects: "Add to a project", agents: "Add a coding agent", new: "Build a new app" },
    },
    { id: "projects", label: "Projects", class: "data", source: "api", values: v.projects, labels: { "no-findings": "No scan findings", "many-long": "40, long names" } },
    {
      id: "key",
      label: "API key",
      class: "moment",
      source: "prop",
      values: v.key,
      labels: { none: "No key", form: "Dialog open", creating: "Creating", failed: "Creation failed", shown: "Key shown", kept: "Key copied", saved: "Saved" },
    },
    { id: "firstRequest", label: "First request", class: "system", source: "api", values: v.firstRequest },
    { id: "cardDialog", label: "Add a Card", class: "moment", source: "prop", values: v.cardDialog },
    { id: "projectMenu", label: "Project menu", class: "moment", source: "prop", values: v.projectMenu },
    { id: "agentRun", label: "Vercel Agent", class: "system", source: "api", values: v.agentRun, labels: { done: "PR opened" } },
    { id: "theme", label: "Theme", class: "config", source: "prop", values: v.theme },
    { id: "breakpoint", label: "Breakpoint", class: "environment", source: "viewport", values: v.breakpoint },
  ],
  sections: [
    {
      id: "happy-path",
      title: "Happy path",
      why: "The hub most people land on: a team that already sends requests, adding one more thing.",
      items: [
        {
          kind: "state",
          id: "connect-another",
          title: "Set-up team connecting something new",
          why: "A Pro team with traffic opening Quick Start to add another service.",
          set: {},
          checks: ["Credit sits above the paths", "Only the chosen path’s panel shows", "Snippets name the paid model"],
        },
      ],
    },
    {
      id: "first-use",
      title: "First use",
      why: "A new team has no Overview: the same hub, trimmed for a first request.",
      items: [
        {
          kind: "state",
          id: "new-team",
          title: "New team opening AI Gateway",
          why: "Someone who just created a Hobby team, opening AI Gateway with no card and no traffic.",
          set: { team: "new", credit: "needs-card" },
          checks: ["Overview isn’t in the sidebar", "Add a Card comes before the paths", "Snippets name the free model"],
        },
        {
          kind: "state",
          id: "add-card",
          title: "Adding a card for free credit",
          why: "A new team adding a card to unlock $5 of free credit a month.",
          set: { team: "new", credit: "needs-card", cardDialog: "open" },
          checks: ["Says the card won’t be charged", "Continue turns the card step into the credit balance"],
        },
      ],
    },
    {
      id: "main-flows",
      title: "Main flows",
      why: "The change folds key creation and the first request into one place; each step is a moment someone is really in.",
      items: [
        {
          kind: "sequence",
          id: "first-request",
          title: "New team: key, request, confirmation",
          why: "A new team with credit creating its first key and sending its first request.",
          steps: [
            { title: "Credit added, no key", set: { team: "new", credit: "has-credit" } },
            { title: "Key saved", set: { team: "new", credit: "has-credit", key: "saved" } },
            { title: "Waiting for the first request", set: { team: "new", credit: "has-credit", key: "saved", firstRequest: "waiting" } },
            { title: "First request received", set: { team: "new", credit: "has-credit", key: "saved", firstRequest: "received" } },
          ],
        },
        {
          kind: "sequence",
          id: "create-key",
          title: "Create an API key",
          why: "Someone creating a key for a CI job, naming it and putting it somewhere safe.",
          steps: [
            { title: "Name the key", set: { key: "form" } },
            { title: "Creating", set: { key: "creating" } },
            { title: "Key shown once", set: { key: "shown" } },
            { title: "Copied, confirm unlocked", set: { key: "kept" } },
            { title: "Back on the card", set: { key: "saved" } },
          ],
        },
        {
          kind: "sequence",
          id: "agent-migrate",
          title: "Migrate a project with Vercel Agent",
          why: "Someone moving a project that calls the OpenAI SDK directly onto the gateway, without writing the change.",
          steps: [
            { title: "Projects, scan findings marked", set: { path: "projects" } },
            { title: "Migrate menu", set: { path: "projects", projectMenu: "open" } },
            { title: "Agent working", set: { path: "projects", agentRun: "working" } },
            { title: "Pull request opened", set: { path: "projects", agentRun: "done" } },
          ],
        },
      ],
    },
    {
      id: "paths",
      title: "Paths",
      why: "Every place requests can come from. Each tile swaps the panel below it.",
      items: [
        {
          kind: "state",
          id: "path-projects",
          title: "Adding the gateway to a project",
          why: "Someone picking which of their projects to connect, starting with the ones the scan flagged.",
          set: { path: "projects" },
          checks: ["Recommended rows say what they call today", "Connected rows only offer View"],
        },
        {
          kind: "state",
          id: "path-agents",
          title: "Adding a coding agent",
          why: "Someone routing Codex through the gateway after Claude Code already is.",
          set: { path: "agents" },
          checks: ["Claude Code shows Connected", "Clicking an agent copies its setup command"],
        },
        {
          kind: "state",
          id: "path-new",
          title: "Starting a new app",
          why: "Someone with no app yet, choosing between v0 and a template.",
          set: { path: "new" },
        },
        {
          kind: "state",
          id: "new-team-repos",
          title: "New team adding a GitHub repo",
          why: "A new team with nothing on Vercel yet, adding the gateway to a repo from GitHub.",
          set: { team: "new", credit: "needs-card", path: "projects" },
          checks: ["Rows are GitHub repos", "Footer names the GitHub account"],
        },
      ],
    },
    {
      id: "overview",
      title: "Overview",
      why: "Once there’s traffic, the Overview is the usage dashboard, with a way back to the hub.",
      items: [
        {
          kind: "state",
          id: "overview-dashboard",
          title: "Set-up team checking usage",
          why: "Someone checking last night’s spend, then connecting another project.",
          set: { page: "overview" },
          checks: ["Connect Another goes to the hub", "The table counts projects not using the gateway"],
        },
      ],
    },
    {
      id: "loading-errors",
      title: "Loading & errors",
      why: "Async states inside the dialog that designs rarely draw.",
      items: [
        {
          kind: "state",
          id: "key-failed",
          title: "Key creation failed",
          why: "Someone creating a key on a flaky connection when the request times out.",
          set: { key: "failed" },
          checks: ["Says nothing was created", "Try Again keeps the name", "The dialog can still be cancelled"],
        },
      ],
    },
    {
      id: "data",
      title: "Data shape",
      why: "The projects list at its smallest and largest, and when the scan finds nothing.",
      items: [
        {
          kind: "state",
          id: "projects-many-long",
          title: "40 projects with long names",
          why: "Someone on a busy team scanning a long list for the projects the scan flagged.",
          set: { path: "projects", projects: "many-long" },
          checks: ["Long names truncate without pushing the action off the row", "Filters cut the list down"],
        },
        {
          kind: "state",
          id: "projects-no-findings",
          title: "Scan found nothing to migrate",
          why: "Someone whose projects don’t call any provider directly.",
          set: { path: "projects", projects: "no-findings" },
          checks: ["The Recommended filter isn’t offered"],
        },
        {
          kind: "state",
          id: "projects-empty",
          title: "No projects yet",
          why: "Someone on a team with no projects, opening Add to a project.",
          set: { path: "projects", projects: "empty" },
          checks: ["Says why the list is empty", "Offers the next step"],
        },
      ],
    },
    {
      id: "theme",
      title: "Theme",
      why: "The dashboard ships both themes; the prototype opens dark.",
      items: [
        {
          kind: "state",
          id: "light",
          title: "Light theme",
          why: "Someone who uses the dashboard in light mode, connecting something new.",
          set: { theme: "light" },
          checks: ["Selected tile’s stroke still reads", "Status dots keep their labels"],
        },
      ],
    },
    {
      id: "breakpoints",
      title: "Breakpoints",
      why: "Where the layout reflows: the sidebar becomes a drawer and tiles go two across.",
      items: [
        {
          kind: "state",
          id: "mobile",
          title: "Set-up hub on a phone",
          why: "Someone grabbing an API key from their phone, at 375 px.",
          set: { breakpoint: "mobile" },
          checks: ["No sideways scroll", "Navigation opens from the header"],
        },
      ],
    },
  ],
};
