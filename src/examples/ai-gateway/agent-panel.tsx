"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp, ArrowUpRight, Check, ChevronRight, GitPullRequest, Maximize2, Paperclip } from "lucide-react";
import { cn } from "./cn";
import { useInThumbnail } from "@/stateview/in-thumbnail";
import { Anchor } from "./components/ui/anchor";
import { useGateway, type AgentTarget } from "./context";
import { GITHUB_ACCOUNT } from "./fixtures";
import { IconAgent, IconChevronUpDown, IconClose, IconPlus } from "./icons";
import { useReducedMotion } from "./panel";

/*
 * Replay of a real Vercel Agent run, recorded 2026-09-29 from the dashboard's
 * side chat (it opened PR #1, "feat: add AI Gateway streaming chat route").
 * Structure, sequence and most wording are verbatim from that run; project and
 * model names are adapted. Layout measured from the same panel: 420px wide,
 * 12px block padding, 14/22.75 body text, 14/20 gray-900 meta lines, gray-100
 * user bubble, 8px-radius gray-400 cards, 12px-radius input.
 */

type Script = {
  title: string;
  status: string;
  plan: string;
  tools: string[];
  toolsDone: string;
  steps: string[];
  pr: string;
  done: string;
  bullets: { id: string; body: ReactNode }[];
};

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded-gw-sm border border-gw-gray-400 bg-gw-gray-100 px-1 font-mono text-gw-label-13 text-gw-gray-1000">{children}</code>;
}

function script({ project, fromGitHub }: AgentTarget, model: string): Script {
  const importStep = fromGitHub ? [`Import ${project.name} from GitHub`] : [];
  const common = [
    { id: "oidc", body: <>Uses AI Gateway’s automatic project OIDC authentication; no API key is configured.</> },
    {
      id: "tsc",
      body: (
        <>
          <Code>npx tsc --noEmit</Code> passed.
        </>
      ),
    },
    {
      id: "preview",
      body: (
        <>
          Preview:{" "}
          <span className="inline-flex items-center gap-0.5 underline underline-offset-2">
            {project.name}
            <ArrowUpRight size={12} aria-hidden />
          </span>
        </>
      ),
    },
  ];
  if (project.state === "recommended") {
    return {
      title: "Migrate model calls to AI Gateway",
      status: `Analyzing your migration requirements for ${project.name} and its model calls.`,
      plan: "I’ll inspect the project’s existing AI calls and the current AI Gateway OIDC guidance before making the focused migration.",
      tools: ["Reading the repository, 2 tools used", "Considering migration options, 5 tools used", "Updating model calls, 7 tools used", "Validating project builds, 9 tools used"],
      toolsDone: "Investigated with 9 tools",
      steps: [...importStep, "Inspect current AI integration", "Implement OIDC-based AI Gateway migration", "Validate and open pull request"],
      pr: "feat: route model calls through AI Gateway",
      done: "Migrated and opened the pull request.",
      bullets: [
        {
          id: "replaced",
          body: (
            <>
              Replaced direct calls to {project.provider ?? "the provider SDK"} with the AI SDK and gateway model strings; new calls default to <Code>{model}</Code>.
            </>
          ),
        },
        { id: "kept", body: <>Kept the existing models and prompts, so responses don’t change.</> },
        ...common,
      ],
    };
  }
  return {
    title: "Add AI Gateway chat route",
    status: "Analyzing the request to integrate AI Gateway and create the specified route.",
    plan: "I’ll add the minimal server-side streaming route with AI SDK’s OIDC-based AI Gateway provider, then validate and publish it as a pull request.",
    tools: [
      "Considering cloning options, 2 tools used",
      "Preparing for npm installation, 3 tools used",
      "Analyzing AI SDK dependencies, 4 tools used",
      "Validating project builds, 5 tools used",
      "Assessing deployment requirements, 9 tools used",
    ],
    toolsDone: "Investigated with 9 tools",
    steps: [...importStep, "Confirm AI SDK route pattern", "Implement the chat route", "Validate and publish pull request"],
    pr: "feat: add AI Gateway streaming chat route",
    done: "Implemented and opened the pull request.",
    bullets: [
      {
        id: "route",
        body: (
          <>
            Added <Code>POST /api/chat</Code> streaming via AI SDK and <Code>{model}</Code>.
          </>
        ),
      },
      ...common,
    ],
  };
}

export type AgentSeed = "start" | "working" | "done";

// The run compressed from ~2.5 minutes to ~11 seconds: one beat per change. Frozen in a thumbnail.
function useTimeline(steps: number, tools: number, seed: AgentSeed, frozen: boolean) {
  const beats = 3 + Math.max(steps * 2, tools) + 2; // status, reasoning, plan, work, PR, summary
  const [beat, setBeat] = useState(() => ({ start: 0, working: 3 + Math.floor((beats - 5) / 2), done: beats })[seed]);
  useEffect(() => {
    if (beat >= beats || frozen) return;
    const t = window.setTimeout(() => setBeat((b) => b + 1), beat === 0 ? 700 : beat < 3 ? 1100 : 1000);
    return () => window.clearTimeout(t);
  }, [beat, beats, frozen]);
  const work = Math.max(0, beat - 3);
  const workBeats = beats - 5;
  return {
    showStatus: beat >= 1,
    showReasoned: beat >= 2,
    showPlan: beat >= 3,
    toolIndex: Math.min(tools - 1, Math.floor((work / Math.max(1, workBeats)) * tools)),
    // Steps finish evenly across the working beats; the last one stays active until the PR lands.
    stepsDone: Math.min(steps - 1, Math.floor((work / Math.max(1, workBeats)) * steps)),
    showPR: beat >= beats - 1,
    finished: beat >= beats,
  };
}

function Block({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-3 text-gw-agent-14 text-gw-gray-1000", className)}>{children}</div>;
}

function Appear({ children }: { children: ReactNode }) {
  return <div className="gw-enter">{children}</div>;
}

// Meta line (tool activity): the agent mark, a label that shimmers while running, a disclosure chevron.
function ToolLine({ label, running }: { label: string; running: boolean }) {
  return (
    <div className="flex items-center gap-1.5 px-3 text-gw-copy-14 text-gw-gray-900">
      <IconAgent size={14} />
      <span className={cn("min-w-0 truncate", running && "gw-agent-shimmer")}>{label}</span>
      <ChevronRight size={14} aria-hidden className="shrink-0" />
    </div>
  );
}

function StepIcon({ state, n }: { state: "done" | "active" | "todo"; n: number }) {
  if (state === "done")
    return (
      <span className="inline-flex size-4 items-center justify-center rounded-full bg-gw-gray-200 text-gw-gray-1000">
        <Check size={10} strokeWidth={2.5} aria-hidden />
        <span className="sr-only">Done:</span>
      </span>
    );
  if (state === "active")
    return (
      <span className="size-3.5 animate-spin rounded-full border-2 border-gw-gray-400 border-t-gw-gray-1000 motion-reduce:animate-none">
        <span className="sr-only">In progress:</span>
      </span>
    );
  return <span className="inline-flex size-4 items-center justify-center text-gw-label-12 text-gw-gray-900 tabular-nums">{n}</span>;
}

function PlanCard({ steps, done }: { steps: string[]; done: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-gw-lg border border-gw-gray-400 bg-gw-background-100 p-3">
      <span className="text-gw-copy-14 font-medium text-gw-gray-1000">
        Working on step {Math.min(done + 1, steps.length)} of {steps.length}
      </span>
      <ul className="flex flex-col">
        {steps.map((s, i) => {
          const state = i < done ? "done" : i === done ? "active" : "todo";
          return (
            <li key={s} className="flex min-h-7 items-center gap-2 text-gw-copy-13 text-gw-gray-1000">
              <span className="flex w-4 justify-center">
                <StepIcon state={state} n={i + 1} />
              </span>
              <span className={cn(state === "todo" && "text-gw-gray-900")}>{s}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PRCard({ title, repo }: { title: string; repo: string }) {
  return (
    <Anchor
      href={`https://github.com/${repo}/pull/1`}
      target="_blank"
      rel="noreferrer"
      className="group flex items-start justify-between gap-4 rounded-gw-lg border border-gw-gray-400 bg-gw-background-100 p-3 transition-colors outline-none hover:bg-gw-gray-100 focus-visible:shadow-gw-focus-ring"
    >
      <span className="flex min-w-0 gap-2.5">
        <GitPullRequest size={16} aria-hidden className="mt-px shrink-0 text-gw-green-700" />
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-gw-label-13 font-medium text-gw-gray-1000">{title}</span>
          <span className="truncate text-gw-label-13 text-gw-gray-900">#1 {repo}</span>
        </span>
      </span>
      <ArrowUpRight size={16} aria-hidden className="shrink-0 text-gw-gray-900 group-hover:text-gw-gray-1000" />
    </Anchor>
  );
}

const iconButton =
  "inline-flex size-8 cursor-pointer items-center justify-center rounded-gw-md text-gw-gray-900 outline-none hover:bg-gw-gray-alpha-200 hover:text-gw-gray-1000 focus-visible:shadow-gw-focus-ring";

/** The Vercel Agent side chat, replaying a migration (or an add) on one project. 420px, fixed to the frame's right edge. */
export function AgentPanel({ agent, seed }: { agent: AgentTarget; seed: AgentSeed }) {
  const { closeAgent, defaultModel } = useGateway();
  const still = useInThumbnail();
  const reduce = useReducedMotion();
  const s = script(agent, defaultModel);
  const tl = useTimeline(s.steps.length, s.tools.length, seed, still);
  const scroller = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const name = agent.project.name;

  // A repo that isn't on Vercel yet gets imported first; the rest of the request is identical.
  const importFirst = agent.fromGitHub ? `Import ${name} from GitHub as a Vercel project. Then ` : "";
  const request =
    importFirst +
    (agent.project.state === "recommended"
      ? `${importFirst ? "m" : "M"}igrate ${name}'s model calls to AI Gateway. Authenticate with the project's OIDC token (no API key), keep the current model behavior, and open a pull request.`
      : `${importFirst ? "a" : "A"}dd AI Gateway to ${name}: add a minimal streaming text route using the AI SDK and ${defaultModel}, authenticated with the project's OIDC token (no API key), and open a pull request.`);

  // Keep the newest turn in view as the run grows (the panel re-renders once per beat).
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: reduce || still ? "auto" : "smooth" });
  });

  // Opened from a menu or the header, so focus moves into the panel; Escape closes it, as the dashboard's side chat does.
  useEffect(() => {
    if (still) return;
    if (seed === "start") closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) closeAgent();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeAgent, seed, still]);

  return (
    <aside
      aria-label="Vercel Agent"
      className={cn("fixed inset-y-0 right-0 z-30 flex w-full max-w-105 flex-col border-l border-gw-gray-alpha-400 bg-gw-background-200", seed === "start" && "gw-panel-in")}
    >
      <div className="flex h-14 shrink-0 items-center gap-1 pr-2 pl-3">
        <button type="button" className="flex h-8 min-w-0 cursor-pointer items-center gap-1 rounded-gw-md px-1.5 outline-none hover:bg-gw-gray-alpha-200 focus-visible:shadow-gw-focus-ring">
          <span className="truncate text-sm leading-6 font-medium text-gw-gray-1000">{s.title}</span>
          <IconChevronUpDown size={14} />
        </button>
        <span className="ml-auto flex items-center">
          <button type="button" aria-label="New chat" className={iconButton}>
            <IconPlus />
          </button>
          <button type="button" aria-label="Expand" className={iconButton}>
            <Maximize2 size={15} aria-hidden />
          </button>
          <button ref={closeRef} type="button" aria-label="Close agent" onClick={closeAgent} className={iconButton}>
            <IconClose />
          </button>
        </span>
      </div>

      <div ref={scroller} role="log" aria-live="polite" className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pt-2 pb-4">
        <div className="ml-auto max-w-77.5 rounded-gw-xl bg-gw-gray-100 py-2">
          <Block>{request}</Block>
        </div>

        {tl.showStatus ? (
          <Appear>
            <Block>{s.status}</Block>
          </Appear>
        ) : null}
        {tl.showReasoned ? (
          <Appear>
            <div className="flex flex-col gap-3">
              <span className="px-3 text-gw-copy-14 text-gw-gray-900">Reasoned through it</span>
              <Block>{s.plan}</Block>
            </div>
          </Appear>
        ) : null}
        {tl.showPlan ? (
          <Appear>
            <ToolLine label={tl.finished ? s.toolsDone : s.tools[tl.toolIndex]} running={!tl.finished} />
          </Appear>
        ) : null}

        {tl.finished ? (
          <Appear>
            <div className="flex flex-col gap-3">
              <Block>{s.done}</Block>
              <ul className="flex flex-col px-3">
                {s.bullets.map((b) => (
                  <li key={b.id} className="flex min-h-7 gap-2 text-gw-agent-14 text-gw-gray-1000">
                    <span className="mt-2.25 size-1 shrink-0 rounded-full bg-gw-gray-1000" />
                    <span>{b.body}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Appear>
        ) : null}

        {tl.showPlan ? (
          tl.finished ? (
            <button
              key="finished"
              type="button"
              className="gw-fade-in flex cursor-pointer items-center justify-between rounded-gw-lg border border-gw-gray-400 bg-gw-background-100 px-3 py-2.5 text-left text-gw-copy-14 text-gw-gray-1000 outline-none hover:bg-gw-gray-100 focus-visible:shadow-gw-focus-ring"
            >
              Finished working through {s.steps.length} tasks
              <ChevronRight size={16} aria-hidden className="text-gw-gray-900" />
            </button>
          ) : (
            <PlanCard key="plan" steps={s.steps} done={tl.showPR ? s.steps.length - 1 : tl.stepsDone} />
          )
        ) : null}

        {tl.showPR ? (
          <Appear>
            <PRCard title={s.pr} repo={`${GITHUB_ACCOUNT}/${name}`} />
          </Appear>
        ) : null}
      </div>

      <div className="shrink-0 px-4 pb-2">
        <div className="flex flex-col gap-3 rounded-gw-xl bg-gw-background-100 p-3 shadow-gw-hairline">
          <p className="h-10 text-sm leading-6 text-gw-gray-700">Ask anything…</p>
          <div className="flex items-center justify-between">
            <Paperclip size={16} aria-hidden className="text-gw-gray-900" />
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-gw-gray-100 text-gw-gray-1000 shadow-gw-hairline">
              {tl.finished ? <ArrowUp size={14} aria-hidden /> : <span className="size-2 rounded-xs bg-gw-gray-1000" />}
            </span>
          </div>
        </div>
        <p className="mt-2 text-center text-gw-label-12 text-gw-gray-900">Agent may make mistakes. Verify all outputs.</p>
      </div>
    </aside>
  );
}
