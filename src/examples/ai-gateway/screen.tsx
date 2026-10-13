"use client";

import { useId, useMemo, useState } from "react";
import { cn } from "./cn";
import { useInThumbnail } from "@/stateview/in-thumbnail";
import { AgentPanel, type AgentSeed } from "./agent-panel";
import { PortalContainerContext } from "./components/ui/portal";
import { Toaster } from "./components/ui/toaster";
import { GatewayContext, type AgentTarget, type Gateway } from "./context";
import { OverviewDashboard } from "./dashboard";
import { FREE_MODEL, PAID_MODEL, projectsFor, targetProject, TEAMS } from "./fixtures";
import { Hub } from "./hub";
import { Header, Sidebar } from "./shell";
import type { GatewayState } from "./state";

/**
 * The proposed AI Gateway setup hub inside the dashboard shell, rendered
 * entirely from `state`. Everything stays live: tiles swap the panel, the key
 * dialog answers from canned responses after a short delay, copy buttons copy,
 * and "View in Overview" turns the new team into a set-up one. Layout uses
 * container queries, so it reflows inside a narrow frame as it would in a
 * narrow window.
 */
export function AiGatewayScreen({ state }: { state: GatewayState }) {
  const still = useInThumbnail();
  const [team, setTeam] = useState(state.team);
  const [page, setPage] = useState(state.page);
  const [path, setPath] = useState(state.path);
  const [credit, setCredit] = useState(state.credit === "has-credit");
  const projects = useMemo(() => projectsFor(state, team), [state, team]);
  const [agent, setAgent] = useState<{ target: AgentTarget; seed: AgentSeed } | null>(() => {
    const project = state.agentRun === "closed" ? null : targetProject(projectsFor(state, state.team));
    return project ? { target: { project, fromGitHub: state.team === "new" }, seed: state.agentRun as AgentSeed } : null;
  });
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const mainId = useId();

  // A new team has no Overview: the address forwards to Quick Start.
  const shownPage = team === "new" ? "quick-start" : page;

  const gateway: Gateway = {
    state,
    team,
    page: shownPage,
    path,
    choosePath: setPath,
    goTo: (next, nextPath) => {
      setPage(next);
      if (nextPath) setPath(nextPath);
    },
    finishSetup: () => {
      setTeam("setup");
      setPage("overview");
    },
    hasCredit: team === "setup" || credit,
    addCredit: () => setCredit(true),
    defaultModel: team === "new" ? FREE_MODEL : PAID_MODEL,
    teamSlug: TEAMS[team].slug,
    projects,
    agent: agent?.target ?? null,
    openAgent: (target) => setAgent({ target, seed: "start" }),
    closeAgent: () => setAgent(null),
  };

  return (
    <GatewayContext value={gateway}>
      <PortalContainerContext value={portal}>
        <div className={cn("ai-gateway gw-root @container relative min-h-full", state.theme === "dark" && "dark-theme")}>
          {still ? null : (
            <a
              href={`#${mainId}`}
              className="sr-only z-50 rounded-gw-md bg-gw-background-100 px-3 py-2 text-gw-button-14 text-gw-gray-1000 shadow-gw-border focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
            >
              Skip to content
            </a>
          )}
          <Sidebar />
          <div className={cn("gw-padding-transition @5xl:pl-64", agent && "@5xl:pr-105")}>
            <Header />
            <main id={mainId} tabIndex={-1} className="pt-4 pr-4 pb-28 pl-4 outline-none @gw-sm:pr-10 @gw-sm:pl-6">
              {shownPage === "overview" ? <OverviewDashboard /> : <Hub />}
            </main>
          </div>
          {agent ? <AgentPanel key={`${agent.target.project.name}-${agent.seed}`} agent={agent.target} seed={agent.seed} /> : null}
          {still ? null : <Toaster theme={state.theme} />}
          <div ref={setPortal} />
        </div>
      </PortalContainerContext>
    </GatewayContext>
  );
}
