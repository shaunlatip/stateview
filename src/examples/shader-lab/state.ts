/**
 * Every input the Shader Lab editor reads, in one place. The screen is a pure
 * function of this object: the boundary where Stateview injects state. Values
 * are listed in the order a reviewer reads them; the manifest's baseline says
 * which one is the default.
 */
export const shaderLabInputValues = {
  /** What's on the canvas: one of the examples, the reviewer's own upload, or nothing yet. */
  source: ["koi", "palms", "clouds", "upload", "none"],
  /** The effect stack, named by the preset it was built from ("none": empty, "long": eight effects stacked by hand). */
  preset: ["cmyk-print", "riso-halftone", "bayer-dither", "duotone", "none", "long"],
  /** Save state of the look: never saved (Save), saved (Saved), or saved and then changed (Update). */
  draft: ["new", "saved", "changed"],
  examples: ["open", "closed"],
  tour: ["off", "1", "2", "3", "4"],
  copySpec: ["idle", "menu-open", "copied", "failed"],
  sourceRequest: ["ready", "loading", "failed"],
  exportRequest: ["idle", "exporting", "done"],
  dragOver: ["off", "on"],
  /** Which drawer is open when the window is too narrow to dock a panel. */
  drawer: ["none", "source", "effects"],
  renderer: ["webgl", "unavailable", "context-lost", "shader-error"],
  theme: ["light", "dark"],
  breakpoint: ["desktop", "mobile"],
} as const;

type Values = typeof shaderLabInputValues;

export type ShaderLabState = { [K in keyof Values]: Values[K][number] };

export function parseShaderLabState(inputs: Record<string, string>): ShaderLabState {
  const entries = Object.entries(shaderLabInputValues).map(([key, values]) => {
    const value = inputs[key];
    return [key, (values as readonly string[]).includes(value) ? value : values[0]];
  });
  return Object.fromEntries(entries) as ShaderLabState;
}
