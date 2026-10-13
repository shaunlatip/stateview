import type { Inputs, Manifest } from "./manifest";

/**
 * Inputs the reviewer changed in the state panel live in the URL, one param
 * each, so a copied link opens the same combination. The viewer writes them;
 * the app's frame reads them on its first load.
 */

/** A state's inputs with the reviewer's changes from the URL on top, keeping only values the input allows. */
export function withOverrides<T extends Inputs>(manifest: Manifest<T>, inputs: T, params: URLSearchParams): T {
  const set = manifest.inputs.flatMap((input) => {
    const value = params.get(input.id);
    return value !== null && (input.values as readonly string[]).includes(value) ? [[input.id, value]] : [];
  });
  return { ...inputs, ...Object.fromEntries(set) };
}

/** One string per combination of inputs: the screen remounts whenever it changes. */
export function inputsKey<T extends Inputs>(manifest: Manifest<T>, inputs: T) {
  return manifest.inputs.map((input) => inputs[input.id]).join("|");
}
