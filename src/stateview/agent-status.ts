import type { Annotation } from "./annotations";

/**
 * What the coding agent says it did with each comment, from the `status.json`
 * beside a review's manifest. The review imports the file, so when the agent
 * writes it, Fast Refresh brings the new status into the open viewer and its
 * frame: no server, no polling. Keyed by comment id.
 */

export type AgentStatusKind = "fixed" | "wontfix" | "question";

export type AgentStatusEntry = {
  status: AgentStatusKind;
  /** One sentence: what changed, or why it didn't. */
  note: string;
  files: string[];
};

export type AgentStatus = Record<string, AgentStatusEntry>;

const KINDS = new Set<string>(["fixed", "wontfix", "question"]);

export const AGENT_STATUS_LABEL: Record<AgentStatusKind, string> = {
  fixed: "Fixed",
  wontfix: "Won’t fix",
  question: "Question",
};

/** The file's entries, skipping any the agent wrote in the wrong shape rather than failing the review. */
export function parseAgentStatus(file: unknown): AgentStatus {
  const comments = isRecord(file) && isRecord(file.comments) ? file.comments : {};
  const status: AgentStatus = {};
  for (const [id, entry] of Object.entries(comments)) {
    if (!isRecord(entry) || typeof entry.status !== "string" || !KINDS.has(entry.status)) continue;
    status[id] = {
      status: entry.status as AgentStatusKind,
      note: typeof entry.note === "string" ? entry.note : "",
      files: Array.isArray(entry.files) ? entry.files.filter((path): path is string => typeof path === "string") : [],
    };
  }
  return status;
}

/**
 * The agent's word on a comment, unless the reviewer already reopened it
 * after that same note: a reopened comment shows again once the agent writes
 * something new.
 */
export function agentStatusOf(status: AgentStatus | undefined, annotation: Annotation) {
  const entry = status?.[annotation.id];
  if (!entry || annotation.reopenedAfter === entry.note) return undefined;
  return entry;
}

/** Ids whose entry is new or different in `next`, for the "Agent updated" toast. */
export function changedIds(previous: AgentStatus, next: AgentStatus) {
  return Object.keys(next).filter((id) => JSON.stringify(previous[id]) !== JSON.stringify(next[id]));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
