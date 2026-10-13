import type { ComponentType } from "react";
import type { Inputs } from "./manifest";

/**
 * Stateview's own comment interface. Everything outside an adapter depends on
 * these types only, so the engine behind them can be swapped without touching
 * the rest of the app.
 */

export type AnnotationStatus = "open" | "resolved";

/** What a comment is attached to, captured when the reviewer picked the element. */
export type AnnotatedElement = {
  /** A CSS selector, unique within the screen, that an agent can use to find the element. */
  selector: string;
  /** What a person would call the element, e.g. `Remove Daniel Kim button`. Missing on comments saved before titles existed. */
  title?: string;
  /** The element's tag and accessible name, e.g. `button "Remove"`. */
  label: string;
  /** The element's opening tag with its attributes, a short summary of its content and its closing tag. */
  html: string;
  /** React components that render the element, outermost first. Empty when names aren't available (production builds). */
  components: string[];
};

export type Annotation = {
  id: string;
  /** The frame the comment was made in: a state id, or `<sequence id>/<step>`. */
  stateId: string;
  /** Every input the state resolved to, so an agent can reproduce what the reviewer saw. */
  inputs: Inputs;
  element: AnnotatedElement;
  /** Where the pin sits, as a fraction of the element's box (0–1), so it moves with the element. */
  anchor: { x: number; y: number };
  note: string;
  status: AnnotationStatus;
  createdAt: number;
};

export type AnnotationEvents = {
  onAdd: (annotation: Annotation) => void;
  onUpdate: (annotation: Annotation) => void;
  onDelete: (id: string) => void;
};

export type AnnotationLayerProps = AnnotationEvents & {
  stateId: string;
  inputs: Inputs;
  /** This state's comments from Stateview's store. The layer shows these and nothing else. */
  annotations: Annotation[];
  /** The rendered screen. Only elements inside it can be commented on. */
  root: HTMLElement | null;
  /** Comment mode: picking an element comments on it instead of using it. */
  active: boolean;
  onActiveChange: (active: boolean) => void;
  /** Whether pins for saved comments are shown. */
  pinsVisible: boolean;
};

/** A component that lets the reviewer place comments on the live page. */
export type AnnotationLayer = ComponentType<AnnotationLayerProps>;

/** A state's comments in the order they were made, which is also how their pins are numbered. */
export function orderAnnotations(annotations: Annotation[]) {
  return annotations.toSorted((a, b) => a.createdAt - b.createdAt);
}

/** Open comments as Markdown for a coding agent, numbered the way the pins are. `include` picks which of them to write out. */
export function formatAnnotations(annotations: Annotation[], include: (annotation: Annotation) => boolean = () => true) {
  return orderAnnotations(annotations)
    .flatMap((annotation, index) => {
      if (annotation.status !== "open" || !include(annotation)) return [];
      const { element } = annotation;
      const lines = [`### ${index + 1}. ${element.title ?? element.label}`, `Element: \`${element.label}\``, `Selector: \`${element.selector}\``];
      if (element.components.length > 0) lines.push(`Components: ${element.components.join(" › ")}`);
      lines.push("```html", element.html, "```", `Comment: ${annotation.note}`);
      return [lines.join("\n")];
    })
    .join("\n\n");
}
