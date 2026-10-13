"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useInThumbnail } from "@/stateview/in-thumbnail";
import { Button, ButtonLink } from "./components/ui/button";
import { notify } from "./components/ui/toaster";
import { useGateway } from "./context";
import { examplePrompt, MODALITIES, type Modality } from "./fixtures";
import { IconArrowRight, IconCheck, IconCheckCircle, IconCopy, IconKey } from "./icons";
import { CreateKeyDialog, type KeyStage } from "./key-dialog";
import { Panel } from "./panel";
import { PROMPT_TAB, Snippets } from "./snippets";
import type { GatewayState } from "./state";

// Per the dashboard's own copy, keys work in local development, CI, external servers and Vercel
// deployments, and each one tracks spend and can carry a budget.
const DESCRIPTION = "Works anywhere your code runs, from local dev and CI to Vercel, with its own spend tracking and budget.";

// One full-width row per example; clicking copies a coding-agent prompt for it.
function ExampleRow({ m }: { m: Modality }) {
  const { defaultModel } = useGateway();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(examplePrompt(m, defaultModel)).catch(() => {});
        setCopied(true);
        notify(`Copied prompt for ${m.title.toLowerCase()}`);
      }}
      className="group flex w-full cursor-pointer items-center gap-4 px-4 py-2.5 text-left transition-colors outline-none hover:bg-gw-gray-alpha-100 focus-visible:bg-gw-gray-alpha-100 focus-visible:shadow-gw-focus-ring"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-gw-copy-14 font-medium text-gw-gray-1000">{m.title}</span>
        <span className="text-gw-copy-13 text-pretty text-gw-gray-900">{m.description}</span>
      </span>
      {copied ? (
        <span key="copied" className="gw-fade-in flex shrink-0 items-center gap-1 text-gw-copy-13 text-gw-gray-1000">
          <IconCheck size={14} /> Copied
        </span>
      ) : (
        <span key="copy" className="gw-fade-in flex shrink-0 items-center gap-1 text-gw-copy-13 whitespace-nowrap text-gw-gray-900 group-hover:text-gw-gray-1000">
          <span className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">Copy Prompt</span>
          <IconCopy size={14} />
        </span>
      )}
    </button>
  );
}

// A list card with the same 44px header bar as the snippet block beside it.
function Examples() {
  return (
    <div className="flex flex-col overflow-hidden rounded-gw-lg border border-gw-gray-400 bg-gw-background-100">
      <h3 className="flex h-11 shrink-0 items-center border-b border-gw-gray-400 bg-gw-background-200 px-4 text-gw-copy-13 font-normal text-gw-gray-900">
        More examples
      </h3>
      <ul className="flex flex-col divide-y divide-gw-gray-alpha-400">
        {MODALITIES.map((m) => (
          <li key={m.slug}>
            <ExampleRow m={m} />
          </li>
        ))}
      </ul>
    </div>
  );
}

// Half and half: the prompt and code on the left, the examples list on the right.
function Split({ children }: { children: ReactNode }) {
  return (
    <div className="@container">
      <div className="grid grid-cols-1 items-stretch gap-6 @3xl:grid-cols-2">
        <div className="flex min-w-0 flex-col">{children}</div>
        <Examples />
      </div>
    </div>
  );
}

// Second part of the path, under the key card: put the key to use.
function RequestSection({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <Panel title="Make your first request" description="Paste the prompt into a coding agent or run a snippet yourself; the examples cover other model types.">
      <div className="flex flex-col gap-5">
        <Split>{children}</Split>
        {footer}
      </div>
    </Panel>
  );
}

// Where a created key can be found again: the API Keys page lists it (masked) with its spend.
const API_KEYS = "https://vercel.com/latip/~/ai-gateway/api-keys";

function KeyActions({ created, onCreate }: { created: boolean; onCreate: () => void }) {
  return (
    <>
      {created ? (
        <ButtonLink variant="secondary" size="sm" href={API_KEYS} target="_blank" rel="noreferrer">
          View API Keys
        </ButtonLink>
      ) : null}
      <Button size="sm" onClick={onCreate}>
        <IconKey size={14} /> Create API Key
      </Button>
    </>
  );
}

const STAGES: Partial<Record<GatewayState["key"], KeyStage>> = {
  form: "create",
  creating: "creating",
  failed: "failed",
  shown: "save",
  kept: "save",
};

/** The key card's dialog, seeded from the `key` input: closed, at one of its stages, or done. */
function useCreateKey() {
  const { state } = useGateway();
  const stage = STAGES[state.key];
  const [open, setOpen] = useState(stage !== undefined);
  const [created, setCreated] = useState(state.key === "saved");
  const dialog = (
    <CreateKeyDialog
      open={open}
      onOpenChange={setOpen}
      initialStage={stage}
      initialKept={state.key === "kept"}
      onCreated={() => {
        setCreated(true);
        notify("API key created");
      }}
    />
  );
  return { created, dialog, actions: <KeyActions created={created} onCreate={() => setOpen(true)} /> };
}

export function ServersPanel() {
  const { dialog, actions } = useCreateKey();
  return (
    <div className="flex flex-col gap-4">
      <Panel title="Get an API key" description={DESCRIPTION} action={actions} />
      <RequestSection>
        <Snippets />
      </RequestSection>
      {dialog}
    </div>
  );
}

/*
 * New team: the same two parts. Creating the key happens in its card, the
 * snippets below use it, and the first-request confirmation lands under them.
 */
export function FirstRequestPanel() {
  const still = useInThumbnail();
  const { state, finishSetup } = useGateway();
  const { created, dialog, actions } = useCreateKey();
  const [copied, setCopied] = useState(state.firstRequest !== "not-sent");
  // Only a copy made here starts the wait for the request; a "waiting" state stays waiting.
  const [sent, setSent] = useState(false);
  const [received, setReceived] = useState(state.firstRequest === "received");

  // Stand-in for the dashboard seeing the first request after the snippet runs.
  useEffect(() => {
    if (!sent || received || still) return;
    const t = window.setTimeout(() => setReceived(true), 3500);
    return () => window.clearTimeout(t);
  }, [sent, received, still]);

  const status = (
    <div role="status">
      {created || copied ? (
        <div className="gw-fade-in flex min-h-9 items-center">
          {received ? (
            <div key="received" className="gw-enter flex flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <span className="flex items-center gap-2 text-gw-copy-14 text-gw-gray-1000">
                <IconCheckCircle size={16} className="text-gw-green-700" />
                First request received
              </span>
              <Button variant="secondary" size="sm" onClick={finishSetup}>
                View in Overview <IconArrowRight size={14} />
              </Button>
            </div>
          ) : (
            <div key="waiting" className="flex items-center gap-2.5">
              <span className="relative flex size-2 shrink-0">
                <span className="gw-ping absolute inset-0 rounded-full bg-gw-blue-700" />
                <span className="relative size-2 rounded-full bg-gw-blue-700" />
              </span>
              <span className="text-gw-copy-14 text-gw-gray-900">Waiting for your first request. Run the prompt or a snippet to send one.</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Credit isn't needed to create a key (today's flow allows it too); requests need it. */}
      <Panel title="Get an API key" description={DESCRIPTION} action={actions} />
      <RequestSection footer={status}>
        {/* The agent prompt creates its own key, so copying it starts the wait without Create. */}
        <Snippets
          onCopy={(tab) => {
            if (created || tab === PROMPT_TAB) {
              setCopied(true);
              setSent(true);
            }
          }}
        />
      </RequestSection>
      {dialog}
    </div>
  );
}
