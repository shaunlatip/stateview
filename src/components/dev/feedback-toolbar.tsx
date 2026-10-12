"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { AgentationProps } from "agentation";

/**
 * TEMPORARY: Agentation on pages that aren't a review state (the hub, the
 * unknown-state page), for feedback on Stateview's own UI while building.
 * Remove before the final build. Review states use AgentationLayer instead,
 * which tags every comment with its state.
 *
 * In development it syncs to the local agentation server so /fix-annotations
 * can read the comments; in production it keeps them in localStorage.
 */
export function FeedbackToolbar() {
  const [Toolbar, setToolbar] = useState<ComponentType<AgentationProps> | null>(null);

  useEffect(() => {
    let active = true;
    void import("agentation").then((engine) => {
      if (active) setToolbar(() => engine.Agentation);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!Toolbar) return null;
  return <Toolbar endpoint={process.env.NODE_ENV === "development" ? "http://localhost:4747" : undefined} />;
}
