"use client";

import { createContext, useContext } from "react";
import type { Project } from "./fixtures";
import type { GatewayState } from "./state";

export type AgentTarget = { project: Project; fromGitHub: boolean };

/**
 * What the prototype kept in its PrototypeProvider, seeded here from the
 * state object instead: the team (which "View in Overview" can flip to set
 * up), the page, credit, the default model, and the Vercel Agent run.
 */
export type Gateway = {
  state: GatewayState;
  team: GatewayState["team"];
  page: GatewayState["page"];
  path: GatewayState["path"];
  choosePath: (path: GatewayState["path"]) => void;
  goTo: (page: GatewayState["page"], path?: GatewayState["path"]) => void;
  /** The team now has traffic, so the Overview becomes the usage dashboard. */
  finishSetup: () => void;
  hasCredit: boolean;
  addCredit: () => void;
  defaultModel: string;
  teamSlug: string;
  projects: Project[];
  agent: AgentTarget | null;
  openAgent: (target: AgentTarget) => void;
  closeAgent: () => void;
};

export const GatewayContext = createContext<Gateway | null>(null);

export function useGateway() {
  const gateway = useContext(GatewayContext);
  if (!gateway) throw new Error("useGateway must be used inside the AI Gateway screen");
  return gateway;
}
