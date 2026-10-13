"use client";

import { useEffect, useState } from "react";
import { cn } from "./cn";
import { AgentIcon } from "./avatars";
import { CodeBlock } from "./code-block";
import { Anchor } from "./components/ui/anchor";
import { notify } from "./components/ui/toaster";
import { ACTIVE_AGENTS, AGENT_COUNT, RELEVANT_AGENTS, type Agent } from "./fixtures";
import { IconCheck, IconCopy, IconExternal } from "./icons";
import { Panel } from "./panel";

/*
 * The name runs full width. Only while the hover action (or "Copied") sits
 * over its right end does it fade out underneath, instead of truncating.
 */
function AgentCell({ agent, connected }: { agent: Agent; connected: boolean }) {
  const command = `npx vercel ai-gateway setup --agent ${agent.flag}`;
  const [copied, setCopied] = useState(false);

  // Confirmation is momentary: back to "Copy Setup" after two seconds.
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  return (
    <button
      type="button"
      disabled={connected}
      onClick={() => {
        navigator.clipboard?.writeText(command).catch(() => {});
        setCopied(true);
        notify(`Copied setup for ${agent.name}`, command);
      }}
      className="group relative flex h-12 w-full cursor-pointer items-center gap-3 rounded-gw-md px-2 text-left transition-colors outline-none hover:bg-gw-gray-alpha-100 focus-visible:shadow-gw-focus-ring disabled:cursor-default disabled:hover:bg-transparent"
    >
      <AgentIcon flag={agent.flag} name={agent.name} size={28} decorative />
      <span
        className={cn(
          "min-w-0 flex-1 overflow-hidden text-gw-copy-14 whitespace-nowrap text-gw-gray-1000",
          !connected && (copied ? "gw-name-fade" : "group-hover:gw-name-fade group-focus-visible:gw-name-fade"),
        )}
      >
        {agent.name}
      </span>
      {connected ? (
        <span className="flex shrink-0 items-center gap-1.5 text-gw-copy-13 text-gw-gray-900">
          <span className="size-2 rounded-full bg-gw-green-700" />
          Connected
        </span>
      ) : (
        <span className="absolute right-2 flex">
          {copied ? (
            <span key="copied" className="gw-fade-in flex items-center gap-1 text-gw-copy-13 text-gw-gray-1000">
              <IconCheck size={14} /> Copied
            </span>
          ) : (
            <span key="copy" className="gw-fade-in flex items-center gap-1 text-gw-copy-13 text-gw-gray-900 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <IconCopy size={14} /> Copy Setup
            </span>
          )}
        </span>
      )}
    </button>
  );
}

const CARD = "flex flex-col gap-3 rounded-gw-lg bg-gw-background-200 p-4 shadow-gw-hairline";

export function AgentsPanel({ fresh = false }: { fresh?: boolean }) {
  return (
    <Panel title="Add a coding agent" description="Route your agents’ model requests through AI Gateway.">
      {/* Two equal cards with the same header hierarchy: every agent at once, or one at a time. */}
      <div className="@container">
        <div className="grid grid-cols-1 items-stretch gap-6 @3xl:grid-cols-2">
          <div className={CARD}>
            <div className="flex flex-col">
              <h3 className="text-gw-heading-14 text-gw-gray-1000">Set up every agent on this machine</h3>
              <p className="text-gw-copy-13 text-gw-gray-900">Finds your installed agents and shows each change before writing it.</p>
            </div>
            <CodeBlock kind="bare" lang="bash" code="npx vercel ai-gateway setup" />
          </div>
          <div className={CARD}>
            <div className="flex flex-col">
              <h3 className="text-gw-heading-14 text-gw-gray-1000">Set up one agent at a time</h3>
              <p className="text-gw-copy-13 text-pretty text-gw-gray-900">
                Click one to copy its setup command. See{" "}
                <Anchor
                  href="https://vercel.com/docs/ai-gateway/coding-agents"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 rounded-gw-sm text-gw-gray-1000 hover:underline"
                >
                  all {AGENT_COUNT} agents <IconExternal size={12} />
                </Anchor>
              </p>
            </div>
            <ul className="-mx-2 grid grid-cols-2 gap-x-2">
              {RELEVANT_AGENTS.map((a) => (
                <li key={a.flag} className="min-w-0">
                  <AgentCell agent={a} connected={!fresh && ACTIVE_AGENTS.has(a.flag)} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Panel>
  );
}
