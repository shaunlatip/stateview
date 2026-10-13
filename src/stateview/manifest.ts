/**
 * The state manifest: a short, curated list of the states a reviewer should
 * see for one change, grouped into sections the way a design handoff groups
 * frames. In the full product an agent drafts this from the diff; here it is
 * written by hand (see src/sample-app/manifest.ts).
 */

export type Inputs = Record<string, string>;

export type InputClass = "who" | "config" | "data" | "system" | "moment" | "environment";
export type InputSource = "prop" | "flag" | "entitlement" | "api" | "viewport";

export type Input<T extends Inputs = Inputs> = {
  [K in keyof T & string]: {
    id: K;
    label: string;
    class: InputClass;
    source: InputSource;
    /** In the order the state panel shows them. */
    values: readonly T[K][];
    /** Display names where sentence-casing the value isn't enough ("many-long" → "Many"). */
    labels?: Partial<Record<T[K], string>>;
  };
}[keyof T & string];

/** "design": a state a designer would draw. "code-only": exists only in code (flags, entitlements, sub-component async). */
export type Origin = "design" | "code-only";

export type StateItem<T extends Inputs = Inputs> = {
  kind: "state";
  id: string;
  title: string;
  /** One sentence, written as a person doing something. */
  why: string;
  set: Partial<T>;
  checks?: string[];
  origin: Origin;
};

export type SequenceItem<T extends Inputs = Inputs> = {
  kind: "sequence";
  id: string;
  title: string;
  why: string;
  steps: { title: string; set: Partial<T> }[];
  origin: Origin;
};

export type Item<T extends Inputs = Inputs> = StateItem<T> | SequenceItem<T>;

export type Section<T extends Inputs = Inputs> = {
  id: string;
  title: string;
  why: string;
  items: Item<T>[];
};

export type Manifest<T extends Inputs = Inputs> = {
  id: string;
  /** Bump when states change, so stored reviews and comments never map onto the wrong state. */
  version: number;
  /** The route that renders the screen; each state is this route plus `?sv=<id>`. */
  route: string;
  screen: string;
  /**
   * The repo and change under review, which the agent drafting the manifest
   * reads from git: `repo` from the remote (or the folder's name without one),
   * `branch` from HEAD (a short SHA when detached), `base` from the branch the
   * change will merge into. `base` is left out when there's nothing to compare
   * against, such as uncommitted work on the default branch. `icon` is the
   * app's own favicon, as a URL path, if it has one.
   */
  scope: { repo: string; branch: string; base?: string; icon?: string };
  baseline: T;
  inputs: Input<T>[];
  sections: Section<T>[];
};

/** One thing the reviewer can look at: a state, or one step of a sequence. */
export type Frame<T extends Inputs = Inputs> = {
  /** The state id, or `<sequence id>/<step>` for a step. Comments are tagged with this. */
  key: string;
  section: Section<T>;
  item: Item<T>;
  /** 1-based step within a sequence; null for a single state. */
  step: number | null;
  stepCount: number;
  stepTitle: string | null;
  inputs: T;
};

export function listFrames<T extends Inputs>(manifest: Manifest<T>): Frame<T>[] {
  return manifest.sections.flatMap((section) =>
    section.items.flatMap((item): Frame<T>[] => {
      if (item.kind === "state") {
        return [
          {
            key: item.id,
            section,
            item,
            step: null,
            stepCount: 1,
            stepTitle: null,
            inputs: { ...manifest.baseline, ...item.set },
          },
        ];
      }
      return item.steps.map((step, index) => ({
        key: `${item.id}/${index + 1}`,
        section,
        item,
        step: index + 1,
        stepCount: item.steps.length,
        stepTitle: step.title,
        inputs: { ...manifest.baseline, ...step.set },
      }));
    }),
  );
}

export function findFrameIndex(frames: { item: { id: string }; step: number | null }[], id: string | null, step: number | null) {
  if (!id) return -1;
  return frames.findIndex((frame) => frame.item.id === id && (frame.step === null || frame.step === (step ?? 1)));
}

/** A frame's link. Pass `inputs` to add the ones that differ from the frame's own, as the state panel writes them. */
export function frameHref(
  manifest: Pick<Manifest, "route">,
  frame: { item: { id: string }; step: number | null; inputs?: Inputs },
  inputs?: Inputs,
) {
  const params = new URLSearchParams({ sv: frame.item.id });
  if (frame.step !== null && frame.step > 1) params.set("step", String(frame.step));
  for (const [id, value] of Object.entries(inputs ?? {})) {
    if (frame.inputs && frame.inputs[id] !== value) params.set(id, value);
  }
  return `${manifest.route}?${params}`;
}

export function listItems<T extends Inputs>(manifest: Manifest<T>) {
  return manifest.sections.flatMap((section) => section.items);
}

/** Input ids whose value differs from the baseline. */
export function changedInputs<T extends Inputs>(manifest: Manifest<T>, inputs: T) {
  return manifest.inputs.filter((input) => inputs[input.id] !== manifest.baseline[input.id]).map((input) => input.id);
}

/** A value as the reviewer reads it: the input's own label, or the id in sentence case. */
export function valueLabel(input: { labels?: Partial<Record<string, string>> }, value: string) {
  const label = input.labels?.[value];
  if (label) return label;
  const words = value.replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Whether a frame renders as a phone, from the manifest's environment input ("mobile"). */
export function viewportOf<T extends Inputs>(manifest: Manifest<T>, inputs: T): "desktop" | "mobile" {
  const environment = manifest.inputs.find((input) => input.class === "environment");
  return environment && inputs[environment.id] === "mobile" ? "mobile" : "desktop";
}
