import { formatAnnotations, type Annotation } from "./annotations";
import { changedInputs, frameHref, listFrames, type Frame, type Inputs, type Manifest } from "./manifest";

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
  // With inputs changed in the state panel, the current URL carries them; otherwise the state's own link.
  const edited = manifest.inputs.some((input) => inputs[input.id] !== frame.inputs[input.id]);
  return [
    `## State: ${frame.section.title} › ${frame.item.title}${step}${edited ? " (inputs changed by the reviewer)" : ""}`,
    `URL: ${edited ? window.location.href : `${window.location.origin}${frameHref(manifest, frame)}`}`,
    `Inputs: ${list}`,
    "",
    "",
  ].join("\n");
}

/** Every state's open comments, in review order, one block per state. */
export function formatReview<T extends Inputs>(manifest: Manifest<T>, annotations: Annotation[]) {
  return listFrames(manifest)
    .flatMap((frame) => {
      // All of the state's comments go in, so the numbers match its pins; formatAnnotations keeps only the open ones.
      const inState = annotations.filter((a) => a.stateId === frame.key);
      return inState.some((a) => a.status === "open") ? [stateContext(manifest, frame) + formatAnnotations(inState)] : [];
    })
    .join("\n\n");
}
