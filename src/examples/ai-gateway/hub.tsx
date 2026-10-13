"use client";

import { useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ButtonLink } from "./components/ui/button";
import { useGateway } from "./context";
import { AgentsPanel } from "./agents-panel";
import { CreditStep } from "./credit-step";
import { IconExternal } from "./icons";
import { NewAppPanel } from "./new-app-panel";
import { PathTiles, type PathId, type PathTile } from "./path-tiles";
import { ProjectsPanel } from "./projects-panel";
import { FirstRequestPanel, ServersPanel } from "./servers-panel";

function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-gw-heading-16 text-gw-gray-1000">
      {children}
    </h2>
  );
}

const TILES: PathTile[] = [
  { id: "servers", title: "Get an API key", description: "For any app, script, or tool" },
  { id: "projects", title: "Add to a project", description: "With or without an API key" },
  { id: "agents", title: "Add a coding agent", description: "Claude Code, Codex, and more" },
  { id: "new", title: "Build a new app", description: "Templates and v0" },
];

// One entry point, ordered like the setup journey: credit first (every path needs it), then
// where requests come from. Only the chosen path's content renders.
export function Hub() {
  const { team, path, choosePath } = useGateway();
  const fresh = team === "new";
  const panelRef = useRef<HTMLDivElement>(null);
  const [minHeight, setMinHeight] = useState(0);
  const id = useId();

  const panel = {
    servers: fresh ? <FirstRequestPanel /> : <ServersPanel />,
    projects: <ProjectsPanel />,
    agents: <AgentsPanel fresh={fresh} />,
    new: <NewAppPanel />,
  }[path];

  // Switching to a shorter panel would shrink the page under the viewport and the browser would
  // clamp the scroll, jumping the tiles. Keep the panel area reaching the viewport's bottom edge.
  function choose(next: PathId) {
    if (next === path) return;
    const top = panelRef.current?.getBoundingClientRect().top ?? 0;
    setMinHeight(Math.max(0, Math.ceil(window.innerHeight - top)));
    choosePath(next);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between gap-6 pt-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-gw-heading-24 text-gw-gray-1000">{fresh ? "Get started with AI Gateway" : "Connect AI Gateway"}</h1>
          <p className="text-gw-copy-14 text-gw-gray-900">
            {fresh ? "One API for hundreds of models, with spend tracking and fallbacks." : "Add another project, service, or coding agent to your team’s gateway."}
          </p>
        </div>
        <ButtonLink variant="secondary" size="sm" href="https://vercel.com/docs/ai-gateway" target="_blank" rel="noreferrer">
          Documentation <IconExternal size={14} />
        </ButtonLink>
      </div>

      <section aria-labelledby={`${id}-credit`} className="flex flex-col gap-3">
        <SectionTitle id={`${id}-credit`}>Add credit</SectionTitle>
        <CreditStep />
      </section>

      <section aria-labelledby={`${id}-connect`} className="flex flex-col gap-3">
        <SectionTitle id={`${id}-connect`}>Choose how to connect</SectionTitle>
        <PathTiles tiles={TILES} value={path} onChange={choose} />
        {/* Swapped in place (no exit phase), so both panels never share the layout. */}
        <div ref={panelRef} className="gw-keep-height pt-3" style={{ "--gw-min-height": `${minHeight}px` } as CSSProperties}>
          <div key={`${team}-${path}`} className="gw-enter">
            {panel}
          </div>
        </div>
      </section>
    </div>
  );
}
