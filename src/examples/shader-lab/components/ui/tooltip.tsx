import type { ReactNode } from "react";
import { cn } from "../../cn";

/**
 * panel.tsx's IconTip: every icon-only button gets a tooltip, ink on canvas,
 * shown after the app's 200ms delay on hover or keyboard focus. CSS only (no
 * portal), so it stays inside the frame; `align` keeps it from running off
 * the edge where Radix would shift it. The trigger carries its own
 * aria-label, so the bubble is hidden from assistive tech.
 */
export function IconTip({
  label,
  side = "top",
  align = "center",
  children,
}: {
  label: ReactNode;
  side?: "top" | "bottom";
  align?: "center" | "start" | "end";
  children: ReactNode;
}) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute z-50 w-max max-w-60 rounded-sl-card bg-sl-inverted px-3 py-1.5 text-sl-xs font-sl-lab text-balance text-sl-canvas opacity-0 transition-[opacity,scale] delay-0 duration-150 scale-95",
          "group-hover/tip:scale-100 group-hover/tip:opacity-100 group-hover/tip:delay-200 group-has-[:focus-visible]/tip:scale-100 group-has-[:focus-visible]/tip:opacity-100",
          side === "top" ? "bottom-full mb-1.5 origin-bottom" : "top-full mt-1.5 origin-top",
          align === "center" && "left-1/2 -translate-x-1/2",
          align === "start" && "left-0",
          align === "end" && "right-0",
        )}
      >
        {label}
        <span
          className={cn(
            "absolute size-2.5 rotate-45 rounded-[2px] bg-sl-inverted",
            side === "top" ? "-bottom-1" : "-top-1",
            align === "center" && "left-1/2 -translate-x-1/2",
            align === "start" && "left-2.5",
            align === "end" && "right-2.5",
          )}
        />
      </span>
    </span>
  );
}
