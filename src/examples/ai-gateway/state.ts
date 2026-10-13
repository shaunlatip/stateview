/**
 * Every input the AI Gateway setup screen reads, in one place. The screen is
 * a pure function of this object: the boundary where Stateview injects state.
 * Values are listed in the order a reviewer reads them; the manifest's
 * baseline says which one is the default.
 */
export const gatewayInputValues = {
  /** A team with no traffic yet, or one already sending requests. */
  team: ["new", "setup"],
  /** Requests draw on credit; a new team starts without it. A set-up team always has it. */
  credit: ["needs-card", "has-credit"],
  /** Quick Start (the hub) or the Overview. A new team has no Overview: it forwards to Quick Start. */
  page: ["quick-start", "overview"],
  /** The path tile that's chosen. Only its panel shows. */
  path: ["servers", "projects", "agents", "new"],
  /** The team's projects (or, for a new team, its GitHub repos) and what the repo scan found in them. */
  projects: ["empty", "no-findings", "typical", "many-long"],
  /** The Create API Key dialog, from closed through to the key saved. */
  key: ["none", "form", "creating", "failed", "shown", "kept", "saved"],
  /** A new team's first request: nothing sent yet, waiting for it, or received. */
  firstRequest: ["not-sent", "waiting", "received"],
  /** The "Add a Card" dialog. */
  cardDialog: ["closed", "open"],
  /** The Add / Migrate menu on the first project that isn't connected. */
  projectMenu: ["closed", "open"],
  /** The Vercel Agent side panel, running a migration on that project. */
  agentRun: ["closed", "working", "done"],
  theme: ["dark", "light"],
  breakpoint: ["desktop", "mobile"],
} as const;

type Values = typeof gatewayInputValues;

export type GatewayState = { [K in keyof Values]: Values[K][number] };

export function parseGatewayState(inputs: Record<string, string>): GatewayState {
  const entries = Object.entries(gatewayInputValues).map(([key, values]) => {
    const value = inputs[key];
    return [key, (values as readonly string[]).includes(value) ? value : values[0]];
  });
  return Object.fromEntries(entries) as GatewayState;
}
