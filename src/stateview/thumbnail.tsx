import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A live, scaled-down render of the real screen. Inert and hidden from
 * assistive tech (the card's title carries the meaning); skipped by the
 * browser until it scrolls near the viewport. The screen inside starts from
 * the host app's own typography, not Stateview's.
 *
 * 17rem wide (--hub-thumb in theme.css), sized so two two-card sections fit
 * side by side in the hub's 1200px column: a 1088px desktop render at 0.25,
 * or a 375px phone render at 0.5, centred.
 */
export function Thumbnail({ children, viewport }: { children: ReactNode; viewport: "desktop" | "mobile" }) {
  return (
    <div aria-hidden inert className="content-auto gui-thumb-width relative h-50 shrink-0 overflow-hidden rounded-gui-s bg-gui-neutral-2">
      <div
        className={cn(
          "host-frame pointer-events-none absolute top-0 origin-top bg-background select-none",
          viewport === "mobile" ? "left-1/2 h-200 w-93.75 -translate-x-1/2 scale-50" : "left-0 h-200 w-272 origin-top-left scale-25",
        )}
      >
        {children}
      </div>
    </div>
  );
}
