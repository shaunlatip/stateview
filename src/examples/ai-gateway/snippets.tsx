"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "./cn";
import { CopyButton, highlight, type Lang } from "./code-block";
import { useGateway } from "./context";
import { agentPrompt } from "./fixtures";
import { IconAnthropicMark, IconOpenAI, IconSparkles, IconTerminal, IconVercelMark } from "./icons";

type Snippet = { lang: Lang | "prompt"; code: string; icon: ReactNode };

const ENV = "$AI_GATEWAY_API_KEY";
export const PROMPT_TAB = "Agent Prompt";

// Same tabs, names and order as today's "Make Your First Request", led by the agent prompt. The
// model follows the team's credit tier. Chat Completions uses /v1; the Anthropic client appends it.
function build(model: string, key: string, team: string): Record<string, Snippet> {
  const keyExpr = key === ENV ? "process.env.AI_GATEWAY_API_KEY" : `'${key}'`;
  return {
    [PROMPT_TAB]: { lang: "prompt", icon: <IconSparkles size={13} />, code: agentPrompt(model, team) },
    cURL: {
      lang: "bash",
      icon: <IconTerminal size={13} />,
      code: `curl https://ai-gateway.vercel.sh/v1/chat/completions \\\n  -H "Authorization: Bearer ${key}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "${model}",\n    "messages": [{ "role": "user", "content": "Hello!" }]\n  }'`,
    },
    "AI SDK": {
      lang: "ts",
      icon: <IconVercelMark />,
      code: `import { generateText } from 'ai';\n\n// Reads AI_GATEWAY_API_KEY from the environment\nconst { text } = await generateText({\n  model: '${model}',\n  prompt: 'Hello!',\n});`,
    },
    "Chat Completions": {
      lang: "ts",
      icon: <IconOpenAI size={13} />,
      code: `import OpenAI from 'openai';\n\nconst openai = new OpenAI({\n  baseURL: 'https://ai-gateway.vercel.sh/v1',\n  apiKey: ${keyExpr},\n});\n\nawait openai.chat.completions.create({\n  model: '${model}',\n  messages: [{ role: 'user', content: 'Hello!' }],\n});`,
    },
    "Messages API": {
      lang: "ts",
      icon: <IconAnthropicMark />,
      code: `import Anthropic from '@anthropic-ai/sdk';\n\nconst anthropic = new Anthropic({\n  baseURL: 'https://ai-gateway.vercel.sh',\n  apiKey: ${keyExpr},\n});\n\nawait anthropic.messages.create({\n  model: '${model}',\n  max_tokens: 1024,\n  messages: [{ role: 'user', content: 'Hello!' }],\n});`,
    },
  };
}

/**
 * The tabbed snippet card. It fills the height its column gives it; longer
 * content scrolls under a bottom fade. The tab strip scrolls sideways when
 * the column is narrower than the five tabs, with copy pinned at the end.
 */
export function Snippets({ onCopy }: { onCopy?: (tab: string) => void }) {
  const { defaultModel, teamSlug } = useGateway();
  const all = build(defaultModel, ENV, teamSlug);
  const tabs = Object.keys(all);
  const [tab, setTab] = useState(PROMPT_TAB);
  const id = useId();
  const s = all[tab];
  const tabId = (k: string) => `${id}-tab-${tabs.indexOf(k)}`;

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = ({ ArrowRight: 1, ArrowLeft: -1 } as Record<string, number>)[e.key];
    if (!step) return;
    e.preventDefault();
    const next = tabs[(tabs.indexOf(tab) + step + tabs.length) % tabs.length];
    setTab(next);
    document.getElementById(tabId(next))?.focus();
  };

  return (
    <div className="gw-snippet-height flex flex-1 flex-col overflow-hidden rounded-gw-lg border border-gw-gray-400 bg-gw-background-100">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-gw-gray-400 bg-gw-background-200 pr-1.5 pl-2">
        <div role="tablist" aria-label="Client" className="gw-tab-strip flex min-w-0 flex-1 gap-0.5 overflow-x-auto">
          {tabs.map((k) => {
            const selected = tab === k;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                id={tabId(k)}
                aria-selected={selected}
                aria-controls={`${id}-panel`}
                tabIndex={selected ? 0 : -1}
                onKeyDown={onKeyDown}
                onClick={() => setTab(k)}
                className={cn(
                  // Ring drawn inside: the scrolling strip would clip an outside outline.
                  "relative flex h-7 shrink-0 cursor-pointer items-center rounded-gw-md px-2.5 text-gw-copy-13 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2",
                  selected ? "bg-gw-gray-200 text-gw-gray-1000" : "text-gw-gray-900 hover:text-gw-gray-1000",
                )}
              >
                {selected ? <span className="relative mr-1 flex items-center">{all[k].icon}</span> : null}
                <span className="relative">{k}</span>
              </button>
            );
          })}
        </div>
        <span className="ml-auto shrink-0" onClickCapture={() => onCopy?.(tab)}>
          <CopyButton value={s.code} label={`Copy ${tab}`} />
        </span>
      </div>
      <div className="relative min-h-0 flex-1">
        {/* Swapped instantly (tab switches are frequent); keyed so each tab opens scrolled to the top. */}
        <pre
          key={tab}
          id={`${id}-panel`}
          role="tabpanel"
          aria-labelledby={tabId(tab)}
          tabIndex={0}
          className={cn(
            "absolute inset-0 overflow-y-auto px-4 pt-4 pb-10 text-gw-gray-1000 focus-visible:-outline-offset-2",
            s.lang === "prompt" ? "font-sans text-gw-copy-14 whitespace-pre-wrap" : "overflow-x-auto font-mono text-gw-copy-13-mono whitespace-pre",
          )}
        >
          {s.lang === "prompt" ? s.code : highlight(s.code, s.lang)}
        </pre>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-gw-background-100 to-transparent" />
      </div>
    </div>
  );
}
