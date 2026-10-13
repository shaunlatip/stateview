"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { AgentStatus } from "./agent-status";
import type { AnnotationLayer } from "./annotations";
import { cn } from "./cn";
import { post, receive, type FrameState } from "./frame-protocol";
import { findFrameIndex, listFrames, type Inputs, type Manifest } from "./manifest";
import { inputsKey, withOverrides } from "./overrides";
import { useReview } from "./store";
import { useDocumentTitle } from "./use-document-title";
import type { FrameQuery } from "./use-frame-query";

type EmbeddedScreenProps<T extends Inputs> = {
  manifest: Manifest<T>;
  render: (inputs: T) => ReactNode;
  annotationLayer: AnnotationLayer;
  /** The frame's own URL, which it was loaded at. */
  query: FrameQuery;
  agentStatus?: AgentStatus;
};

/**
 * The screen alone, as the viewer's iframe loads it. Its first render comes
 * from the frame's URL; after that the viewer sends each state by message.
 * The comment engine runs here, inside the app's document, and shares
 * comments with the viewer through the review store.
 */
export function EmbeddedScreen<T extends Inputs>({ manifest, render, annotationLayer: Layer, query, agentStatus }: EmbeddedScreenProps<T>) {
  const review = useReview(manifest);
  const [screen, setScreen] = useState<HTMLDivElement | null>(null);
  // Null until the viewer sends a state; until then, the state in the URL.
  const [sent, setSent] = useState<FrameState | null>(null);

  const frames = listFrames(manifest);
  const fromUrl = frames[findFrameIndex(frames, query.sv, query.step)];
  const stateId = sent?.stateId ?? fromUrl?.key;
  const frame = frames.find((candidate) => candidate.key === stateId);
  const inputs = (sent?.inputs as T | undefined) ?? (fromUrl ? withOverrides(manifest, fromUrl.inputs, query.params) : null);
  const commenting = sent?.commenting ?? false;
  const pinsVisible = sent?.pinsVisible ?? true;

  // The frame is a document of its own, opened directly too, so it needs its own title.
  useDocumentTitle(frame ? `${frame.item.title} · ${manifest.screen}` : manifest.screen);

  useEffect(() => {
    // Whichever side hydrates first, its first message is lost: say ready on load and again on the first state.
    let heard = false;
    const onMessage = (event: MessageEvent) => {
      const message = receive<FrameState>(event, window.parent);
      if (message?.type !== "state") return;
      setSent(message);
      if (!heard) post(window.parent, { type: "ready" });
      heard = true;
    };
    window.addEventListener("message", onMessage);
    post(window.parent, { type: "ready" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!stateId || !inputs) return null;

  const setCommenting = (value: boolean) => {
    setSent((current) => (current ? { ...current, commenting: value } : current));
    post(window.parent, { type: "commenting", value });
  };

  return (
    <>
      <div data-pin-layer="" className="relative grid flex-1">
        {/* Keyed by state and inputs so the screen starts fresh from its inputs every time. */}
        <div
          key={`${stateId}:${inputsKey(manifest, inputs)}`}
          ref={setScreen}
          data-stateview-screen=""
          data-state={stateId}
          className={cn("host-frame grid", commenting && "cursor-crosshair **:cursor-crosshair")}
        >
          {render(inputs)}
        </div>
      </div>
      {/* Keyed by state so a half-written comment never carries over to another state. */}
      <Layer
        key={stateId}
        stateId={stateId}
        inputs={inputs}
        annotations={review.annotations.filter((a) => a.stateId === stateId)}
        root={screen}
        active={commenting}
        onActiveChange={setCommenting}
        pinsVisible={pinsVisible}
        agentStatus={agentStatus}
        onAdd={review.addAnnotation}
        onUpdate={review.updateAnnotation}
        onDelete={review.deleteAnnotation}
      />
    </>
  );
}
