"use client";

import { useState } from "react";
import { cn } from "./cn";
import { ProjectAvatar } from "./avatars";
import { CodeBlock } from "./code-block";
import { ActionMenu } from "./components/ui/action-menu";
import { Anchor } from "./components/ui/anchor";
import { Button, ButtonLink } from "./components/ui/button";
import { notify } from "./components/ui/toaster";
import { useGateway } from "./context";
import { GITHUB_ACCOUNT, projectPrompt, targetProject, type Project, type ProjectState } from "./fixtures";
import { IconAgent, IconCopy, IconExternal, IconGitHub, IconSearch, IconTerminal } from "./icons";

type Filter = "all" | ProjectState;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "connected", label: "Connected" },
  { id: "recommended", label: "Recommended" },
  { id: "none", label: "Not connected" },
];

const STATUS: Record<ProjectState, { label: string; dot: string }> = {
  connected: { label: "Connected", dot: "bg-gw-green-700" },
  recommended: { label: "Recommended", dot: "bg-gw-amber-700" },
  none: { label: "Not connected", dot: "gw-dot-ring" },
};

function ManualSteps({ project, model }: { project: Project; model: string }) {
  return (
    <div className="gw-fade-in flex flex-col gap-3 border-t border-gw-gray-alpha-400 bg-gw-background-200 py-4 pr-4 pl-4 @lg:pl-16">
      <p className="text-gw-copy-13 text-gw-gray-900">No API key. Deployments use the project’s OIDC token.</p>
      <CodeBlock kind="bare" lang="bash" code={`vercel link --project ${project.name} && vercel env pull`} />
      <CodeBlock kind="bare" lang="bash" code="pnpm add ai" />
      <CodeBlock
        filename="app/api/chat/route.ts"
        code={`import { streamText } from 'ai';\n\nexport async function POST(req: Request) {\n  const { prompt } = await req.json();\n  return streamText({ model: '${model}', prompt }).toTextStreamResponse();\n}`}
      />
    </div>
  );
}

function ProjectRow({ project, fromGitHub, menuOpen }: { project: Project; fromGitHub: boolean; menuOpen: boolean }) {
  const { openAgent, defaultModel, teamSlug } = useGateway();
  const [manual, setManual] = useState(false);
  const status = STATUS[project.state];
  const migrate = project.state === "recommended";

  return (
    <li className="gw-fade-in border-b border-gw-gray-alpha-400">
      {/* 64px rows with a gray-100 hover fill. Name and status split the row evenly. */}
      <div className="gw-project-grid grid h-16 items-center gap-4 px-4 transition-colors duration-150 hover:bg-gw-gray-100">
        <ProjectAvatar favicon={project.favicon} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-gw-copy-14 font-medium text-gw-gray-1000">{project.name}</span>
          {project.provider ? <span className="truncate text-gw-copy-13 text-gw-gray-900">Calls {project.provider} directly</span> : null}
        </div>
        <span className="flex items-center gap-2 text-gw-copy-13 text-gw-gray-900 @max-lg:hidden">
          <span className={cn("size-2 shrink-0 rounded-full", status.dot)} />
          {status.label}
        </span>
        <div className="flex justify-end">
          {project.state === "connected" ? (
            // Tertiary: nothing to set up on a connected row, so the action shouldn't compete.
            <ButtonLink variant="ghost" size="sm" href={`https://vercel.com/${teamSlug}/${project.name}/ai-gateway`} target="_blank" rel="noreferrer">
              View<span className="sr-only"> {project.name}</span>
            </ButtonLink>
          ) : (
            <ActionMenu
              label={migrate ? "Migrate" : "Add"}
              heading={migrate ? `Migrate ${project.name} with` : `Add AI Gateway to ${project.name} with`}
              defaultOpen={menuOpen}
              actions={[
                {
                  label: "Vercel Agent",
                  description: "Opens a pull request with the change. Uses OIDC, so no API key.",
                  icon: <IconAgent size={16} />,
                  onSelect: () => openAgent({ project, fromGitHub }),
                },
                {
                  label: "Your Coding Agent",
                  description: "Copies a prompt for Claude Code, Cursor, or Codex to run in this repo.",
                  icon: <IconCopy size={16} />,
                  onSelect: () => {
                    navigator.clipboard?.writeText(projectPrompt(project, defaultModel)).catch(() => {});
                    notify(`Copied prompt for ${project.name}`);
                  },
                },
                {
                  label: manual ? "Hide Manual Steps" : "Manual Steps",
                  description: "The commands and code to add it yourself.",
                  icon: <IconTerminal size={16} />,
                  onSelect: () => setManual((m) => !m),
                },
              ]}
            />
          )}
        </div>
      </div>
      {manual ? <ManualSteps project={project} model={defaultModel} /> : null}
    </li>
  );
}

function Footer({ fresh }: { fresh: boolean }) {
  return (
    <footer className="flex h-12 items-center px-4 text-gw-copy-13 text-gw-gray-900">
      {fresh ? (
        <>
          Repositories from
          <span className="mx-1 flex items-center gap-1 text-gw-gray-1000">
            <IconGitHub size={14} /> {GITHUB_ACCOUNT}
          </span>
          on GitHub.
        </>
      ) : (
        <>
          Not on Vercel?
          <Anchor href="https://vercel.com/new" target="_blank" rel="noreferrer" className="ml-1 flex items-center gap-0.5 rounded-gw-sm text-gw-gray-1000 hover:underline">
            Import Repository <IconExternal size={14} />
          </Anchor>
        </>
      )}
    </footer>
  );
}

// Not drawn in the prototype: a team with no projects (or a GitHub account with no repositories).
function EmptyList({ fresh }: { fresh: boolean }) {
  return (
    <section className="gw-material-base flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="inline-flex size-10 items-center justify-center rounded-full bg-gw-gray-100 text-gw-gray-900 shadow-gw-hairline">
        {fresh ? <IconGitHub size={16} /> : <IconSearch size={16} />}
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="text-gw-heading-14 text-gw-gray-1000">{fresh ? `No repositories on ${GITHUB_ACCOUNT}` : "No projects on this team yet"}</h3>
        <p className="text-gw-copy-13 text-pretty text-gw-gray-900">
          {fresh ? "Push a repository to GitHub, then add AI Gateway to it from here." : "Import a repository to deploy it, then add AI Gateway to it from here."}
        </p>
      </div>
      <ButtonLink variant="secondary" size="sm" href="https://vercel.com/new" target="_blank" rel="noreferrer">
        Import Repository <IconExternal size={14} />
      </ButtonLink>
    </section>
  );
}

// Toolbar above a single list card, same arrangement as the API Keys page. A new team sees the
// same list and action; its rows are GitHub repos, and Add imports the repo before the PR.
export function ProjectsPanel() {
  const { team, projects, state } = useGateway();
  const fresh = team === "new";
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const target = state.projectMenu === "open" ? targetProject(projects) : null;

  if (projects.length === 0) return <EmptyList fresh={fresh} />;

  const filters = FILTERS.filter((f) => f.id === "all" || projects.some((p) => p.state === f.id));
  const visible = projects.filter((p) => (filter === "all" || p.state === filter) && p.name.toLowerCase().includes(query.trim().toLowerCase()));
  const noun = fresh ? "repositories" : "projects";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Model List filter: 36px group, 4px inset, 28px items, 14/500 labels, gray-100 active. */}
        <div role="group" aria-label={`Filter ${noun}`} className="flex h-9 max-w-full items-stretch overflow-x-auto rounded-gw-md bg-gw-background-100 p-1 shadow-gw-hairline">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "relative flex shrink-0 cursor-pointer items-center rounded-gw-sm px-3 text-gw-button-14 whitespace-nowrap transition-colors focus-visible:-outline-offset-2",
                filter === f.id ? "bg-gw-gray-100 text-gw-gray-1000" : "text-gw-gray-900 hover:text-gw-gray-1000",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="flex h-9 max-w-72 min-w-48 flex-1 items-center gap-2 rounded-gw-md bg-gw-background-100 px-3 text-gw-gray-800 shadow-gw-hairline focus-within:shadow-gw-focus-border">
          <IconSearch size={16} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={fresh ? "Search repositories…" : "Search projects…"}
            aria-label={fresh ? "Search repositories" : "Search projects"}
            className="w-full bg-transparent text-gw-copy-14 text-gw-gray-1000 outline-none placeholder:text-gw-gray-700"
          />
        </label>
      </div>

      <section aria-label={fresh ? "Repositories" : "Projects"} className="@container gw-material-base overflow-hidden">
        <ul>
          {visible.map((p) => (
            <ProjectRow key={p.name} project={p} fromGitHub={fresh} menuOpen={target?.name === p.name} />
          ))}
        </ul>
        {/* Filters only list states that exist, so an empty list always comes from the search. */}
        {visible.length === 0 ? (
          <div role="status" className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <p className="text-gw-copy-14 text-gw-gray-900">
              No {noun} match “{query.trim()}”
            </p>
            <Button variant="secondary" size="sm" onClick={() => setQuery("")}>
              Clear Search
            </Button>
          </div>
        ) : null}
        <Footer fresh={fresh} />
      </section>
    </div>
  );
}
