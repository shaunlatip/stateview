import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * A live, scaled-down render of the real screen. Inert and hidden from
 * assistive tech (the card's title carries the meaning); skipped by the
 * browser until it scrolls near the viewport. The screen inside starts from
 * the host app's own typography, not Stateview's.
 *
 * 18rem wide, the hub card's inner width (the grid track in theme.css is
 * measured from it): a 1152px desktop render at 0.25, or a 375px phone
 * render at 0.5, centred.
 */
export function Thumbnail({ children, viewport }: { children: ReactNode; viewport: "desktop" | "mobile" }) {
  return (
    // inert set through a ref: React 18 drops the boolean attribute, React 19 ignores the string form.
    <div aria-hidden ref={makeInert} className="content-auto gui-thumb-width relative h-50 shrink-0 overflow-hidden rounded-gui-s bg-gui-neutral-2">
      <div
        className={cn(
          "host-frame pointer-events-none absolute top-0 origin-top bg-background select-none",
          viewport === "mobile" ? "left-1/2 h-200 w-93.75 -translate-x-1/2 scale-50" : "left-0 h-200 w-288 origin-top-left scale-25",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function makeInert(element: HTMLDivElement | null) {
  element?.setAttribute("inert", "");
}

/**
 * Stands in for a live thumbnail when a review turns them off: the inputs the
 * state changes from the baseline, in the same frame. Sits at the bottom so
 * the card's badges never cover it.
 */
export function InputsThumbnail({ changes }: { changes: { label: string; value: string }[] }) {
  return (
    <div aria-hidden className="gui-thumb-width flex h-50 shrink-0 flex-col justify-end rounded-gui-s bg-gui-neutral-2 p-gui-s">
      {changes.length === 0 ? (
        <p className="text-gui-s text-gui-neutral-8">Baseline</p>
      ) : (
        <dl className="grid grid-cols-2 gap-x-gui-s gap-y-gui-xxs text-gui-s">
          {changes.map((change) => (
            <div key={change.label} className="contents">
              <dt className="min-w-0 break-words text-gui-neutral-8">{change.label}</dt>
              <dd className="min-w-0 break-words font-gui-data">{change.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
