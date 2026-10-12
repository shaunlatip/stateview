import type { ComponentType } from "react";
import type { Inputs } from "./manifest";

/**
 * Stateview's own comment interface. Everything outside an adapter depends on
 * these types only, so the engine behind them (Agentation today, an in-house
 * element picker later) can be swapped without touching the rest of the app.
 */

export type AnnotationStatus = "open" | "resolved";

export type Annotation = {
  id: string;
  /** The frame the comment was made in: a state id, or `<sequence id>/<step>`. */
  stateId: string;
  /** Every input the state resolved to, so an agent can reproduce what the reviewer saw. */
  inputs: Inputs;
  /** A path an agent can use to find the element. */
  selector: string;
  /** Human-readable element name, e.g. `button "Remove"`. */
  elementLabel: string;
  note: string;
  status: AnnotationStatus;
  createdAt: number;
  /** Opaque data owned by the adapter that created the comment (pin position etc.). Nothing else reads it. */
  engineData?: unknown;
};

export type AnnotationEvents = {
  onAdd: (annotation: Annotation) => void;
  onUpdate: (annotation: Annotation) => void;
  onDelete: (id: string) => void;
  /** Called with the engine's markdown export when the reviewer copies their comments. */
  onCopy?: (markdown: string) => void;
};

export type AnnotationLayerProps = AnnotationEvents & {
  stateId: string;
  inputs: Inputs;
  /** This state's comments from Stateview's store. The layer shows these and nothing else. */
  annotations: Annotation[];
};

/** A component that lets the reviewer place comments on the live page. */
export type AnnotationLayer = ComponentType<AnnotationLayerProps>;
