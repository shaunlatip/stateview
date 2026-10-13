import type { ShaderLabState } from "./state";

/**
 * Thumbnails can't each hold a WebGL context, so a thumbnail shows a still of
 * the same render, captured from the live screen by
 * `.context/shader-lab/capture-stills.mjs` into public/examples/shader-lab/stills.
 * Keyed by what's on the canvas: source, stack, and the saved-then-tweaked look.
 */
export function stillKey(state: ShaderLabState): string | null {
  if (state.sourceRequest === "failed") return null;
  // A loading example holds the previous look: nothing on a first pick, else the lead example.
  if (state.sourceRequest === "loading") return state.source === "koi" || state.source === "none" ? null : "koi-cmyk-print";
  if (state.source === "none") return null;
  return `${state.source}-${state.preset}${state.draft === "changed" ? "-tweak" : ""}`;
}

export const stillUrl = (key: string) => `/examples/shader-lab/stills/${key}.webp`;
