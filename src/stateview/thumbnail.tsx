import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A live, scaled-down render of the real screen. Inert and hidden from
 * assistive tech (the card's title carries the meaning); skipped by the
 * browser until it scrolls near the viewport. The screen inside starts from
 * the host app's own typography, not Stateview's.
 *
 * "fluid" is the hub's, as wide as its column, and "strip" the viewer
 * filmstrip's 144 × 90 (theme.css). A desktop render fills the width; a phone
 * render is centred.
 */
export function Thumbnail({
  children,
  viewport,
  size,
  className,
}: {
  children: ReactNode;
  viewport: "desktop" | "mobile";
  size: "fluid" | "strip";
  className?: string;
}) {
  const fluid = size === "fluid";
  return (
    <div
      aria-hidden
      inert
      className={cn(
        "content-auto relative shrink-0 overflow-hidden rounded-gui-s bg-gui-neutral-2 ring-1 ring-gui-border",
        fluid ? "gui-thumb-fluid" : "gui-thumb-strip",
        className,
      )}
    >
      {/* A still picture: loading skeletons and the like don't loop in every thumbnail. */}
      <div
        className={cn(
          "host-frame pointer-events-none absolute top-0 h-200 bg-background select-none **:animate-none",
          viewport === "mobile"
            ? [fluid ? "gui-thumb-fluid-mobile" : "gui-thumb-mobile", "left-1/2 origin-top -translate-x-1/2"]
            : [fluid ? "gui-thumb-fluid-desktop" : "gui-thumb-desktop", "left-0 origin-top-left"],
        )}
      >
        {children}
      </div>
    </div>
  );
}
