"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "./cn";
import { InThumbnail } from "./in-thumbnail";
import { changedInputs, valueLabel, type Inputs, type Manifest } from "./manifest";

type Size = "fluid" | "strip";

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
  size: Size;
  className?: string;
}) {
  const fluid = size === "fluid";
  const render = useFluidScale(viewport, fluid);
  return (
    <div
      aria-hidden
      // inert set through a ref: React 18 drops the boolean attribute, React 19 ignores the string form.
      ref={makeInert}
      className={cn(
        "content-auto relative shrink-0 overflow-hidden rounded-gui-s bg-gui-neutral-2 ring-1 ring-gui-border",
        fluid ? "gui-thumb-fluid" : "gui-thumb-strip",
        className,
      )}
    >
      {/* A still picture: loading skeletons and the like don't loop in every thumbnail. */}
      <div
        ref={render}
        className={cn(
          "host-frame pointer-events-none absolute top-0 h-200 bg-background select-none **:animate-none",
          viewport === "mobile"
            ? [fluid ? "gui-thumb-fluid-mobile" : "gui-thumb-mobile", "left-1/2 origin-top -translate-x-1/2"]
            : [fluid ? "gui-thumb-fluid-desktop" : "gui-thumb-desktop", "left-0 origin-top-left"],
        )}
      >
        <InThumbnail>{children}</InThumbnail>
      </div>
    </div>
  );
}

/**
 * Scales a hub thumbnail's render to its card, measured. The CSS version
 * (tan(atan2()) over container units, theme.css) draws the first paint, but
 * iOS browsers left the hub's thumbnails blank with it alone.
 */
function useFluidScale(viewport: "desktop" | "mobile", fluid: boolean) {
  const render = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const screen = render.current;
    const box = screen?.parentElement;
    if (!fluid || !screen || !box) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      // The same ratios as gui-thumb-fluid-desktop and -mobile: a desktop render fills the width, a phone render shows its top 400px.
      screen.style.scale = String(viewport === "mobile" ? height / 400 : width / 1088);
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [viewport, fluid]);
  return render;
}

export function makeInert(element: HTMLElement | null) {
  element?.setAttribute("inert", "");
}

/** The inputs a frame changes from the baseline, as the reviewer reads them, for InputsThumbnail. */
export function inputChanges<T extends Inputs>(manifest: Manifest<T>, inputs: T) {
  return changedInputs(manifest, inputs).flatMap((id) => {
    const input = manifest.inputs.find((candidate) => candidate.id === id);
    return input ? [{ label: input.label, value: valueLabel(input, inputs[id]) }] : [];
  });
}

/**
 * Stands in for a live thumbnail when a review turns them off (WebGL maps,
 * video): the inputs the state changes from the baseline, in the same frame.
 */
export function InputsThumbnail({ changes, size, className }: { changes: { label: string; value: string }[]; size: Size; className?: string }) {
  return (
    // Top-aligned and clear of the corner chip, so the footer chips (step count, Code only) sit below the text, not on it.
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 flex-col overflow-hidden rounded-gui-s bg-gui-neutral-2 pr-gui-l text-gui-xs ring-1 ring-gui-border",
        size === "fluid" ? "gui-thumb-fluid py-gui-s pl-gui-s" : "gui-thumb-strip py-gui-xs pl-gui-xs",
        className,
      )}
    >
      {changes.length === 0 ? (
        <p className="text-gui-neutral-8">Baseline</p>
      ) : size === "strip" ? (
        // The strip is too narrow for labels; the values alone tell the states apart, and the title names the state.
        <ul className="flex flex-col gap-gui-xxs">
          {changes.map((change) => (
            <li key={change.label} className="truncate font-gui-data">
              {change.value}
            </li>
          ))}
        </ul>
      ) : (
        <dl className="grid grid-cols-2 gap-x-gui-xs gap-y-gui-xxs">
          {changes.map((change) => (
            <div key={change.label} className="contents">
              <dt className="line-clamp-2 min-w-0 text-gui-neutral-8">{change.label}</dt>
              <dd className="min-w-0 truncate font-gui-data">{change.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
