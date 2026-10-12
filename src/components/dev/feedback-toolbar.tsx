"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { AgentationProps } from "agentation";

/**
 * Agentation, for commenting on Stateview's own UI while building it. It syncs
 * to the local agentation server at :4747, which feeds the /fix-annotations
 * loop. Development only, on every page; production builds drop the chunk.
 */
export function FeedbackToolbar() {
  const [Toolbar, setToolbar] = useState<ComponentType<AgentationProps> | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    let active = true;
    void import("agentation").then((engine) => {
      if (active) setToolbar(() => engine.Agentation);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!Toolbar) return null;
  return (
    <div data-feedback-toolbar>
      <Toolbar endpoint="http://localhost:4747" />
    </div>
  );
}
