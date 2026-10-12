import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A live, scaled-down render of the real screen. Inert and hidden from
 * assistive tech (the card's title carries the meaning); skipped by the
 * browser until it scrolls near the viewport.
 */
export function Thumbnail({ children, viewport }: { children: ReactNode; viewport: "desktop" | "mobile" }) {
  return (
    <div aria-hidden inert className="content-auto relative h-50 w-72 overflow-hidden border-b bg-muted">
      <div
        className={cn(
          "pointer-events-none absolute top-0 origin-top bg-background select-none",
          viewport === "mobile" ? "left-1/2 h-200 w-93.75 -translate-x-1/2 scale-50" : "left-0 h-200 w-288 origin-top-left scale-25",
        )}
      >
        {children}
      </div>
    </div>
  );
}
