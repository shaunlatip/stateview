"use client";

import { useEffect, useState, type ComponentType } from "react";

/**
 * Dev-only Agentation toolbar (visual feedback for coding agents).
 *
 * Production renders nothing and never imports the package: the dynamic
 * import sits behind a NODE_ENV check that the bundler removes from
 * production builds. Annotations post to the local agentation MCP server on
 * :4747, which `/fix-annotations` reads.
 */
export function AgentationToolbar() {
  const [Toolbar, setToolbar] = useState<ComponentType<{ endpoint: string }> | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    let active = true;
    import("agentation")
      .then((mod) => {
        if (active) setToolbar(() => mod.Agentation);
      })
      .catch(() => {
        // devDependency missing (e.g. a production-only install): no toolbar.
      });
    return () => {
      active = false;
    };
  }, []);

  return Toolbar ? <Toolbar endpoint="http://localhost:4747" /> : null;
}
