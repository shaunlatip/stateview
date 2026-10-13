"use client";

import { useId, useState, type CSSProperties, type KeyboardEvent } from "react";
import { cn } from "./cn";
import { AgentIcon, ProjectAvatar } from "./avatars";
import { useGateway } from "./context";
import { projectsFor } from "./fixtures";
import { IconAgent, IconEve, IconKey, IconSparkles } from "./icons";
import { useReducedMotion } from "./panel";
import type { GatewayState } from "./state";

export type PathId = GatewayState["path"];
export type PathTile = { id: PathId; title: string; description: string };

/*
 * Every illustration shares one motion language: 0 = resting, 1 = hovered (a
 * little apart), 2 = selected (fully apart), on the dashboard's swift curve.
 * Reduced motion pins them at rest. Positions come from the prototype's
 * motion values; they're per-level data, so they're set inline.
 */
type Level = 0 | 1 | 2;

function useLevel(level: Level): Level {
  return useReducedMotion() ? 0 : level;
}

// Positions reach `gw-swift` as custom properties: --gw-x, --gw-y, --gw-rotate, --gw-scale, --gw-opacity, --gw-gap.
const STACK = ["z-4", "z-3", "z-2", "z-1"];

// API key: the credential itself, with two more keys stacked behind it.
function KeysViz({ level: raw }: { level: Level }) {
  const level = useLevel(raw);
  const back = [
    { id: "far", y: [-6, -12, -22][level], scale: [0.9, 0.92, 0.94][level], opacity: [0.35, 0.5, 0.7][level] },
    { id: "near", y: [-3, -6, -11][level], scale: [0.95, 0.96, 0.97][level], opacity: [0.6, 0.75, 0.85][level] },
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center pt-4">
      <div className="relative">
        {back.map((b) => (
          <div
            key={b.id}
            className="gw-swift absolute inset-0 rounded-full bg-gw-background-100 shadow-gw-hairline"
            style={{ "--gw-y": `${b.y}px`, "--gw-scale": b.scale, "--gw-opacity": b.opacity } as CSSProperties}
          />
        ))}
        <div
          className="gw-swift relative flex h-9 items-center gap-2 rounded-full bg-gw-background-100 pr-4 pl-2 shadow-gw-hairline-500"
          style={{ "--gw-y": `${[0, 2, 6][level]}px` } as CSSProperties}
        >
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-gw-gray-1000 text-gw-background-100">
            <IconKey size={12} />
          </span>
          <span className="font-mono text-gw-10-5 whitespace-nowrap text-gw-gray-900">
            AI_GATEWAY_API_KEY=<span className="text-gw-gray-1000">vck_•••••HPsq</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// Projects: the team's own projects as fully rounded pills (favicon and name), staggered left and right.
function ProjectsViz({ level: raw }: { level: Level }) {
  const level = useLevel(raw);
  const { projects, team } = useGateway();
  // An empty team still gets an illustration: the tile describes the path, not the list.
  const items = (projects.length > 0 ? projects : projectsFor({ projects: "typical" }, team)).slice(0, 3);
  const pos = [
    { x: [-18, -26, -38][level], y: [-31, -33, -35][level] },
    { x: [16, 24, 34][level], y: 0 },
    { x: [-8, -14, -22][level], y: [31, 33, 35][level] },
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {items.map((p, i) => (
        <div
          key={p.name}
          className="gw-swift absolute flex h-7 max-w-48 items-center gap-1.5 rounded-full bg-gw-background-100 pr-3 pl-1 shadow-gw-hairline"
          style={{ "--gw-x": `${pos[i].x}px`, "--gw-y": `${pos[i].y}px` } as CSSProperties}
        >
          <ProjectAvatar favicon={p.favicon} small />
          <span className="truncate text-gw-11 font-medium whitespace-nowrap text-gw-gray-1000">{p.name}</span>
        </div>
      ))}
    </div>
  );
}

// Coding agents: the four most used, side by side with a slight overlap.
const TOP_AGENTS = [
  { flag: "claude-code", name: "Claude Code" },
  { flag: "codex", name: "Codex" },
  { flag: "cursor", name: "Cursor" },
  { flag: "copilot", name: "GitHub Copilot" },
];

function AgentsViz({ level: raw }: { level: Level }) {
  const level = useLevel(raw);
  const gap = [-8, -2, 8][level];
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex">
        {TOP_AGENTS.map((a, i) => (
          <div key={a.flag} className={cn("gw-swift relative flex", STACK[i])} style={{ "--gw-gap": `${i === 0 ? 0 : gap}px` } as CSSProperties}>
            <AgentIcon flag={a.flag} name={a.name} size={36} raised />
          </div>
        ))}
      </div>
    </div>
  );
}

// Build a new app: three simplified template cards (a window bar and an icon), fanning out like a hand of cards.
function MiniTemplate({ kind }: { kind: "eve" | "agent" | "jev" }) {
  const light = kind === "eve";
  return (
    <div className={cn("flex h-17 w-23 flex-col overflow-hidden rounded-gw-md shadow-gw-border-medium", light ? "gw-light-surface" : "bg-gw-background-100")}>
      <div className={cn("flex h-3 items-center gap-0.5 px-1.5", light ? "gw-light-bar" : "bg-gw-gray-alpha-100")}>
        <span className={cn("h-1 w-5 rounded-full", light ? "gw-light-line" : "bg-gw-gray-alpha-400")} />
      </div>
      <div className="flex flex-1 items-center justify-center">
        {kind === "eve" ? <IconEve size={8} className="gw-light-ink" /> : null}
        {kind === "agent" ? <IconAgent size={16} className="text-gw-gray-1000" /> : null}
        {kind === "jev" ? <IconSparkles size={16} className="text-gw-gray-1000" /> : null}
      </div>
    </div>
  );
}

function NewViz({ level: raw }: { level: Level }) {
  const level = useLevel(raw);
  const cards = [
    { kind: "agent" as const, rotate: [-6, -10, -14][level], x: [-10, -24, -44][level], y: [2, 4, 8][level] },
    { kind: "jev" as const, rotate: [6, 10, 14][level], x: [10, 24, 44][level], y: [2, 4, 8][level] },
    { kind: "eve" as const, rotate: 0, x: 0, y: [0, -3, -6][level] },
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center pt-2">
      {cards.map((c) => (
        <div key={c.kind} className="gw-swift absolute origin-bottom" style={{ "--gw-x": `${c.x}px`, "--gw-y": `${c.y}px`, "--gw-rotate": `${c.rotate}deg` } as CSSProperties}>
          <MiniTemplate kind={c.kind} />
        </div>
      ))}
    </div>
  );
}

const VIZ: Record<PathId, (p: { level: Level }) => React.ReactNode> = {
  servers: KeysViz,
  projects: ProjectsViz,
  agents: AgentsViz,
  new: NewViz,
};

/*
 * Top-level selector. Rest and hover follow the Geist Choicebox (gray-400
 * border; gray-500 border on a gray-100 fill). Selected is stroke only: a
 * gray-1000 border, no fill. Four across when the hub is wide enough, two
 * otherwise. An ARIA radio group: one tab stop, arrow keys move the choice.
 */
export function PathTiles({ tiles, value, onChange }: { tiles: PathTile[]; value: PathId; onChange: (id: PathId) => void }) {
  const [hovered, setHovered] = useState<PathId | null>(null);
  const id = useId();
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key];
    if (!step) return;
    e.preventDefault();
    const i = tiles.findIndex((t) => t.id === value);
    const next = tiles[(i + step + tiles.length) % tiles.length];
    onChange(next.id);
    e.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-tile="${next.id}"]`)?.focus();
  };
  return (
    <div className="@container">
      <div role="radiogroup" aria-label="How do you want to connect?" className="grid grid-cols-2 gap-3 @4xl:grid-cols-4">
        {tiles.map((t) => {
          const selected = value === t.id;
          const Viz = VIZ[t.id];
          const level: Level = selected ? 2 : hovered === t.id ? 1 : 0;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              data-tile={t.id}
              aria-labelledby={`${id}-${t.id}-title`}
              aria-describedby={`${id}-${t.id}-description`}
              onKeyDown={onKeyDown}
              onClick={() => onChange(t.id)}
              onMouseEnter={() => setHovered(t.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(t.id)}
              onBlur={() => setHovered(null)}
              className={cn(
                "group relative flex cursor-pointer flex-col overflow-hidden rounded-gw-lg border bg-gw-background-100 text-left outline-none transition-colors duration-150 focus-visible:shadow-gw-focus-ring",
                selected ? "border-gw-gray-1000" : "border-gw-gray-400 hover:border-gw-gray-500",
              )}
            >
              <div
                aria-hidden
                className={cn(
                  "@container relative h-30 overflow-hidden border-b bg-gw-background-200 transition-colors duration-150",
                  selected ? "border-gw-gray-1000" : "border-gw-gray-alpha-400",
                )}
              >
                <div className="gw-viz-scale absolute inset-0">
                  <Viz level={level} />
                </div>
              </div>
              <div className={cn("flex min-w-0 flex-col px-4 py-3 transition-colors duration-150", !selected && "group-hover:bg-gw-gray-100")}>
                <span id={`${id}-${t.id}-title`} className="text-gw-heading-14 font-medium text-gw-gray-1000">
                  {t.title}
                </span>
                <span id={`${id}-${t.id}-description`} className="text-gw-copy-13 text-pretty text-gw-gray-900">
                  {t.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
