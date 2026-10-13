import { parseAsStringLiteral } from "nuqs";
import type { Inputs, Manifest } from "./manifest";

/**
 * Inputs the reviewer changed in the state panel live in the URL, one param
 * each, so a copied link opens the same combination. The viewer writes them;
 * the app's frame reads them on its first load.
 */

/** One URL parser per input, accepting only that input's values. */
export function inputParsers<T extends Inputs>(manifest: Manifest<T>) {
  return Object.fromEntries(manifest.inputs.map((input) => [input.id, parseAsStringLiteral(input.values as readonly string[])]));
}

/** A state's inputs with the reviewer's changes on top. */
export function withOverrides<T extends Inputs>(inputs: T, overrides: Record<string, string | null>): T {
  const set = Object.entries(overrides).filter(([id, value]) => value !== null && id in inputs);
  return { ...inputs, ...Object.fromEntries(set) };
}

/** One string per combination of inputs: the screen remounts whenever it changes. */
export function inputsKey<T extends Inputs>(manifest: Manifest<T>, inputs: T) {
  return manifest.inputs.map((input) => inputs[input.id]).join("|");
}
