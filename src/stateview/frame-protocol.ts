import type { Inputs } from "./manifest";

/**
 * Messages between the viewer and the app's frame. The viewer loads the app's
 * route with `?embed` in an iframe, so the app gets its own window: its own
 * viewport for media queries and its own focus and keyboard. After the first
 * load the viewer switches states by message, without reloading the frame.
 */

/** The search param that makes a review route render only the screen, for the viewer's frame. */
export const EMBED_PARAM = "embed";

/** Viewer → frame: what to render and which review tools are on. */
export type FrameState = {
  type: "state";
  /** The frame's key: a state id, or `<sequence id>/<step>`. */
  stateId: string;
  inputs: Inputs;
  commenting: boolean;
  pinsVisible: boolean;
};

/** Frame → viewer. */
export type FrameEvent =
  /** Loaded (or reloaded) and listening: the viewer sends the current state. */
  | { type: "ready" }
  /** Comment mode ended inside the frame (Escape there). */
  | { type: "commenting"; value: boolean };

type Envelope<T> = T & { source: "stateview" };

export function post<T extends FrameState | FrameEvent>(target: Window | null | undefined, message: T) {
  const envelope: Envelope<T> = { ...message, source: "stateview" };
  target?.postMessage(envelope, window.location.origin);
}

/** The message's payload if it came from Stateview on this origin, from `from`. */
export function receive<T extends FrameState | FrameEvent>(event: MessageEvent, from: Window | null | undefined): T | null {
  if (event.origin !== window.location.origin || !from || event.source !== from) return null;
  const data: unknown = event.data;
  return typeof data === "object" && data !== null && "source" in data && data.source === "stateview" ? (data as T) : null;
}
