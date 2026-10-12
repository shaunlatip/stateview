"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import type { AgentationProps, Annotation as AgentationAnnotation } from "agentation";
import type { Annotation, AnnotationLayerProps } from "./annotations";

/**
 * AnnotationLayer backed by Agentation (npm `agentation`, PolyForm Shield 1.0.0).
 * Uses only its public props and exports; none of its source lives in this repo.
 * Replace this file to swap the comment engine.
 */
export function AgentationLayer(props: AnnotationLayerProps) {
  // Agentation stores comments per pathname, and every state shares one pathname,
  // so each state gets a fresh instance seeded from Stateview's store.
  return <AgentationForState key={props.stateId} {...props} />;
}

function AgentationForState({ stateId, inputs, annotations, onAdd, onUpdate, onDelete, onCopy }: AnnotationLayerProps) {
  const [Toolbar, setToolbar] = useState<ComponentType<AgentationProps> | null>(null);
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);

  // The comments as this state opened: what Agentation is seeded with. Later changes come from Agentation itself.
  const initial = useRef(annotations);

  useEffect(() => {
    let active = true;
    // Loaded after the page, so the comment engine never delays the app.
    void import("agentation").then((engine) => {
      if (!active) return;
      // Replace Agentation's stored copy with this state's comments before it mounts and reads it.
      engine.saveAnnotations(window.location.pathname, initial.current.flatMap(toEngine));
      setToolbar(() => engine.Agentation);
    });
    return () => {
      active = false;
    };
  }, []);

  const fromEngine = (raw: AgentationAnnotation): Annotation => ({
    id: raw.id,
    stateId,
    inputs,
    selector: raw.fullPath ?? raw.elementPath,
    elementLabel: raw.element,
    note: raw.comment,
    status: raw.status === "resolved" || raw.status === "dismissed" ? "resolved" : "open",
    createdAt: raw.timestamp,
    engineData: raw,
  });

  return (
    // A portal container we own makes Agentation handle its keys in the capture phase and
    // stop Escape while it's active, so Escape closes its tools before it leaves the state.
    <div ref={setPortal}>
      {Toolbar && portal ? (
        <Toolbar
          portalContainer={portal}
          copyToClipboard={false}
          onCopy={onCopy}
          onAnnotationAdd={(raw) => onAdd(fromEngine(raw))}
          onAnnotationUpdate={(raw) => onUpdate(fromEngine(raw))}
          onAnnotationDelete={(raw) => onDelete(raw.id)}
          onAnnotationsClear={(raws) => {
            for (const raw of raws) onDelete(raw.id);
          }}
        />
      ) : null}
    </div>
  );
}

function toEngine(annotation: Annotation): AgentationAnnotation[] {
  const raw = annotation.engineData as Partial<AgentationAnnotation> | undefined;
  if (!raw || typeof raw.id !== "string" || typeof raw.x !== "number" || typeof raw.y !== "number") return [];
  return [{ ...(raw as AgentationAnnotation), comment: annotation.note }];
}
