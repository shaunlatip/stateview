import type { GatewayState } from "./state";

/**
 * Canned data for the AI Gateway setup screen, from the prototype's
 * lib/data.ts: a solo builder with a handful of side projects. Project names
 * come from the All Projects capture; connection states, repo-scan findings
 * and request counts are illustrative.
 */

export const PAID_MODEL = "openai/gpt-6-astra";
export const FREE_MODEL = "poolside/laguna-s-2.1-free";

export const TEAMS = {
  new: { name: "shaunlatip2-8645", slug: "shaunlatip2-8645", plan: "Hobby" },
  setup: { name: "Shaun’s projects", slug: "latip", plan: "Pro" },
} as const;

export const GITHUB_ACCOUNT = "sam-builds";
export const CREDIT_BALANCE = "$14.88";

export const FAKE_KEY = "vck_4mT9qZr2bX7wLp0sNe3yHPsq";
export const MASKED_KEY = "vck_••••••••••••••••••••HPsq";
export const DEFAULT_KEY_NAME = "ci-evals";

export type ProjectState = "connected" | "recommended" | "none";

export type Project = {
  name: string;
  state: ProjectState;
  /** An emoji, as most side projects ship, or "curio" for its blue lens mark. */
  favicon: string;
  /** Why a project is recommended: it calls a provider SDK or another router directly. Follows "Calls … directly". */
  provider?: string;
};

const projects: Project[] = [
  { name: "curio", state: "connected", favicon: "curio" },
  { name: "recipe-box", state: "connected", favicon: "🍳" },
  { name: "link-shelf", state: "recommended", favicon: "🔖", provider: "the OpenAI SDK" },
  { name: "podcast-notes", state: "recommended", favicon: "🎙️", provider: "the Anthropic SDK" },
  { name: "invoice-kit", state: "recommended", favicon: "🧾", provider: "OpenRouter" },
  { name: "habit-streak", state: "none", favicon: "🔥" },
  { name: "trip-planner", state: "none", favicon: "🧳" },
  { name: "focus-timer", state: "none", favicon: "⏱️" },
  { name: "plant-pal", state: "none", favicon: "🪴" },
  { name: "gym-log", state: "none", favicon: "🏋️" },
  { name: "wedding-rsvp", state: "none", favicon: "💌" },
];

/** A brand-new team has nothing on Vercel yet, so its list is the connected GitHub account's repos. */
const repos: Project[] = [
  { name: "curio", state: "recommended", favicon: "curio", provider: "the OpenAI SDK" },
  { name: "invoice-kit", state: "recommended", favicon: "🧾", provider: "OpenRouter" },
  { name: "recipe-box", state: "none", favicon: "🍳" },
  { name: "trip-planner", state: "none", favicon: "🧳" },
  { name: "habit-streak", state: "none", favicon: "🔥" },
];

const longNames: [string, ProjectState, string | undefined][] = [
  ["customer-support-assistant-with-retrieval-and-escalation", "recommended", "the OpenAI SDK and the Anthropic SDK"],
  ["internal-analytics-dashboard-quarterly-business-review", "connected", undefined],
  ["marketing-site-2026-redesign-localized-landing-pages", "none", undefined],
  ["llm-evaluation-harness-for-regression-testing-prompts", "recommended", "the Google Generative AI SDK"],
  ["podcast-transcription-and-chapter-summary-pipeline", "recommended", "OpenRouter"],
  ["documentation-search-semantic-embeddings-experiment", "recommended", "the Cohere SDK"],
  ["résumé-builder-für-internationale-bewerbungen", "none", undefined],
];

const emoji = ["🧪", "📦", "🛒", "🗺️", "📚", "🎧", "🧭", "🗂️", "📝", "🎯", "🧩", "🌱", "📸", "🚲", "🍜", "🧵"];
const words = ["notes", "tracker", "studio", "atlas", "board", "kit", "lab", "pad", "hub", "log", "desk", "feed"];
const prefixes = ["team", "side", "weekend", "client", "demo", "beta", "proto", "home"];
const providers = ["the OpenAI SDK", "the Anthropic SDK", "OpenRouter", "the Mistral SDK"];

function manyProjects(): Project[] {
  const long = longNames.map(([name, state, provider], i) => ({ name, state, provider, favicon: emoji[i % emoji.length] }));
  const regular = Array.from({ length: 40 - long.length }, (_, i): Project => {
    const state: ProjectState = i % 5 === 0 ? "connected" : i % 3 === 0 ? "recommended" : "none";
    return {
      name: `${prefixes[i % prefixes.length]}-${words[(i * 5) % words.length]}-${i + 2}`,
      state,
      favicon: emoji[(i + 7) % emoji.length],
      provider: state === "recommended" ? providers[i % providers.length] : undefined,
    };
  });
  return [...long, ...regular];
}

/** The repo scan found nothing calling a provider directly. */
function withoutFindings(list: Project[]): Project[] {
  return list.map(({ provider: _provider, ...project }) => ({ ...project, state: project.state === "recommended" ? "none" : project.state }));
}

export function projectsFor(state: Pick<GatewayState, "projects">, team: GatewayState["team"]): Project[] {
  const base = team === "new" ? repos : projects;
  return {
    empty: [],
    "no-findings": withoutFindings(base),
    typical: base,
    "many-long": manyProjects(),
  }[state.projects];
}

/** The project the Add / Migrate menu and the Vercel Agent run act on: the first one not connected. */
export function targetProject(list: Project[]) {
  return list.find((p) => p.state === "recommended") ?? list.find((p) => p.state === "none") ?? null;
}

/** Every agent `vercel ai-gateway setup --agent` supports (docs, 2026-09-13). The panel shows eight. */
export type Agent = { name: string; flag: string };

export const AGENT_COUNT = 29;

export const RELEVANT_AGENTS: Agent[] = [
  { name: "Claude Code", flag: "claude-code" },
  { name: "Codex", flag: "codex" },
  { name: "Cursor", flag: "cursor" },
  { name: "GitHub Copilot CLI", flag: "copilot" },
  { name: "OpenCode", flag: "opencode" },
  { name: "Cline", flag: "cline" },
  { name: "Zed", flag: "zed" },
  { name: "Aider", flag: "aider" },
];

/** Agents already sending traffic for the set-up team. */
export const ACTIVE_AGENTS = new Set(["claude-code"]);

/** Real AI templates from vercel.com/new/templates: titles, descriptions and preview images as listed. */
export const TEMPLATES = [
  {
    id: "eve-personal-agent",
    title: "eve Personal Agent",
    description: "Fork your own personal agent. One identity across web, Slack, and iMessage, with memory you can import, edit, and approve.",
    image: "/examples/ai-gateway/templates/eve-personal-agent.png",
    href: "https://vercel.com/new/templates/nuxt/eve-personal-agent",
  },
  {
    id: "morphic",
    title: "Morphic: AI-powered answer engine",
    description: "AI answer engine with Generative UI.",
    image: "/examples/ai-gateway/templates/morphic.png",
    href: "https://vercel.com/new/templates/next.js/morphic-ai-answer-engine-generative-ui",
  },
  {
    id: "jev-form-router",
    title: "Jev x AI SDK Form Router",
    description: "Three forms use Jev and AI SDK to route submissions by context.",
    image: "/examples/ai-gateway/templates/jev-form-router.png",
    href: "https://vercel.com/new/templates/next.js/jev-and-ai-sdk",
  },
];

/** Overview dashboard (last 12 hours), shaped after the after-first-request capture. */
export const USAGE = { spend: "$0.12", ttft: "0.95s", requests: "9", tokens: "103K" };

export const REQUEST_ROWS = [
  { project: "curio", favicon: "curio", requests: 8, tps: 82, p50: "2.34s", ttft: "820ms", cost: "$0.10", p50Pct: 0.33, ttftPct: 0.4 },
  { project: "recipe-box", favicon: "🍳", requests: 1, tps: 84, p50: "7s", ttft: "2.03s", cost: "$0.02", p50Pct: 1, ttftPct: 1 },
];

const DOCS = "https://vercel.com/docs/ai-gateway/getting-started";

/** Titles and one-liners follow today's "Follow a Modality Quickstart" list; models and APIs come from each quickstart page. */
export const MODALITIES = [
  { title: "Text Generation", slug: "text", description: "Stream a text response to the terminal.", task: (model: string) => `stream a text response with the AI SDK's streamText and ${model}` },
  { title: "Image Generation", slug: "image", description: "Generate an image from a prompt and save it to a file.", task: () => "generate an image with the AI SDK's generateImage and openai/gpt-image-2, and save it as output.png" },
  {
    title: "Video Generation",
    slug: "video",
    description: "Generate a video and save it to a file. Can take a few minutes.",
    task: () => "generate an 8-second 16:9 video with the AI SDK's experimental_generateVideo and google/veo-3.1-fast-generate-001, and save it as output.mp4 (it can take several minutes)",
  },
  {
    title: "Realtime",
    slug: "realtime",
    description: "Start a realtime speech session over WebSocket.",
    task: () =>
      "start a realtime speech session: mint a token with gateway.experimental_realtime.getToken() from @ai-sdk/gateway, connect to openai/gpt-realtime-2 over WebSocket with ws, send one message, and print the reply transcript",
  },
  {
    title: "Speech",
    slug: "speech",
    description: "Turn text into speech, then transcribe it back to text.",
    task: () => "turn a sentence into speech with experimental_generateSpeech and openai/tts-1 (save speech.mp3), then transcribe it back with experimental_transcribe and openai/whisper-1",
  },
  {
    title: "Evaluation",
    slug: "evaluation",
    description: "Ask typed questions about app state; get answers with a probability.",
    task: () => "ask a typed yes/no question about a piece of application state with the AI SDK 7 experimental_evaluate API and typesafe-ai/jev, and print the answer with its probability",
  },
];

export type Modality = (typeof MODALITIES)[number];

export function examplePrompt(m: Modality, model: string) {
  return [
    `Add a small example to this codebase that uses Vercel AI Gateway to ${m.task(model)}.`,
    "Reuse the codebase's language and package manager. Read AI_GATEWAY_API_KEY from the environment; if it's missing, create one with npx vercel@latest ai-gateway api-keys create and never print it.",
    `Follow ${DOCS}/${m.slug}, run it, and report the output.`,
  ].join("\n\n");
}

/** Today's Overview "Agent Prompt", with the model following the team's credit tier and the team slug filled in. */
export function agentPrompt(model: string, team: string) {
  return [
    "Add streaming text generation through AI Gateway in the current environment.",
    "Use the AI Gateway skill for this task. If it is unavailable, run npx skills add vercel/vercel-plugin --skill ai-gateway, then find and read its SKILL.md before continuing.",
    "Reuse the environment's language, framework, package manager, and AI client when possible, and add only required dependencies.",
    `Read AI_GATEWAY_API_KEY from the environment. If it is missing, run npx vercel@latest whoami and pause for login if needed, then run npx vercel@latest --scope ${team} ai-gateway api-keys create --name <descriptive-name>. Capture stdout directly into AI_GATEWAY_API_KEY for the request or existing ignored secret storage, and never expose the value.`,
    `Use ${model}, stream the generated text, run the result, and report the output.`,
  ].join("\n\n");
}

/** The prompt "Your Coding Agent" copies for one project. */
export function projectPrompt(p: Project, model: string) {
  return [
    p.state === "recommended"
      ? `Migrate this project's model calls from ${p.provider} to Vercel AI Gateway without changing model behavior.`
      : "Add Vercel AI Gateway to this project with one streaming text route.",
    `Use the AI SDK with model strings (default: ${model}).`,
    "Don't create or ask for an API key: on Vercel the AI SDK uses the project's OIDC token. For local runs, `vercel link` then `vercel env pull`.",
    "Run it and confirm a response.",
  ].join("\n");
}
