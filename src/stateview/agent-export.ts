import { formatAnnotations, orderAnnotations, type Annotation } from "./annotations";
import { changedInputs, frameHref, listFrames, type Frame, type Inputs, type Manifest } from "./manifest";
import { inputsKey } from "./overrides";

/**
 * A header for copied comments, so an agent can open exactly the state the
 * reviewer saw. `inputs` defaults to the state's own; pass the inputs on
 * screen when the reviewer changed some in the state panel.
 */
export function stateContext<T extends Inputs>(manifest: Manifest<T>, frame: Frame<T>, inputs: T = frame.inputs) {
  const changed = new Set<string>(changedInputs(manifest, inputs));
  const list = manifest.inputs
    .map((input) => `${input.id}=${inputs[input.id]}${changed.has(input.id) ? " (changed)" : ""}`)
    .join(", ");
  const step = frame.step ? ` · step ${frame.step} of ${frame.stepCount}: ${frame.stepTitle}` : "";
  const edited = manifest.inputs.some((input) => inputs[input.id] !== frame.inputs[input.id]);
  return [
    `## State: ${frame.section.title} › ${frame.item.title}${step}${edited ? " (inputs changed by the reviewer)" : ""}`,
    // The state's link, plus any inputs changed in the state panel.
    `URL: ${window.location.origin}${frameHref(manifest, frame, inputs)}`,
    `Inputs: ${list}`,
    "",
    "",
  ].join("\n");
}

/**
 * One state's open comments, in one block per set of inputs they were made
 * with, so each block's URL and inputs are what the reviewer saw when they
 * wrote it. Numbers count all of the state's comments, so they match its pins.
 */
export function formatState<T extends Inputs>(manifest: Manifest<T>, frame: Frame<T>, annotations: Annotation[]) {
  const inputsOf = (annotation: Annotation) => ({ ...frame.inputs, ...annotation.inputs }) as T;
  const groups = new Map<string, T>();
  for (const annotation of orderAnnotations(annotations)) {
    if (annotation.status !== "open") continue;
    const inputs = inputsOf(annotation);
    groups.set(inputsKey(manifest, inputs), inputs);
  }
  return [...groups]
    .map(
      ([key, inputs]) =>
        stateContext(manifest, frame, inputs) + formatAnnotations(annotations, (annotation) => inputsKey(manifest, inputsOf(annotation)) === key),
    )
    .join("\n\n");
}

/** Every state's open comments, in review order. */
export function formatReview<T extends Inputs>(manifest: Manifest<T>, annotations: Annotation[]) {
  return listFrames(manifest)
    .map((frame) => formatState(manifest, frame, annotations.filter((a) => a.stateId === frame.key)))
    .filter(Boolean)
    .join("\n\n");
}
