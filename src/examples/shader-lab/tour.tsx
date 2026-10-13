"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { SlButton } from "./components/ui/button";

type Side = "top" | "bottom" | "left" | "right";
type Step = { target: string; side: Side; title: string; body: string };

// Tour.tsx: four stops, in the order a first-time visitor needs them.
const STEPS: Step[] = [
  {
    target: "examples",
    side: "top",
    title: "Start from an example",
    body: "Each example pairs a free video with a preset. Click through them to see the range.",
  },
  {
    target: "effects",
    side: "left",
    title: "Tweak the effects",
    body: "A preset is a stack of effects, applied top to bottom. Open one to adjust it, or try another preset below the stack.",
  },
  {
    target: "source",
    side: "right",
    title: "Use your own media",
    body: "Upload an image or video, search Pexels, or drop a file anywhere on the canvas.",
  },
  { target: "export", side: "right", title: "Export", body: "Save a still, GIF, or MP4 at full resolution." },
];

const CARD_W = 280;
const GAP = 12;
const EDGE = 12;
const PAD = 4;

type Rect = { top: number; left: number; width: number; height: number };

function findTarget(root: HTMLElement, step: Step) {
  const el = root.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? el : null;
}

/** placeCard, against the frame instead of the window. */
function placeCard(r: Rect, side: Side, cardH: number, frame: { w: number; h: number }) {
  let top: number;
  let left: number;
  if (side === "top" || side === "bottom") {
    left = r.left + r.width / 2 - CARD_W / 2;
    top = side === "top" ? r.top - GAP - cardH : r.top + r.height + GAP;
  } else {
    top = r.top + Math.min(r.height, 120) / 2 - cardH / 2;
    left = side === "left" ? r.left - GAP - CARD_W : r.left + r.width + GAP;
  }
  return {
    top: Math.min(Math.max(EDGE, top), frame.h - cardH - EDGE),
    left: Math.min(Math.max(EDGE, left), frame.w - CARD_W - EDGE),
  };
}

/**
 * The first-visit walkthrough: a highlight ring on one part of the editor and
 * a short card. Non-modal, so the editor stays usable underneath. Steps whose
 * target isn't on screen (a closed panel) are skipped. Esc skips the tour,
 * arrow keys move. Positioned inside the screen's own frame, so it lines up
 * in a scaled thumbnail too.
 */
export function Tour({
  rootRef,
  step: tourStep,
  setStep,
  end,
  focusOnShow,
}: {
  rootRef: RefObject<HTMLDivElement | null>;
  step: number | null;
  setStep: (step: number) => void;
  end: () => void;
  focusOnShow: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [layout, setLayout] = useState<{ rect: Rect; frame: { w: number; h: number }; available: number[]; cardH: number } | null>(null);

  // Measure the target against the frame whenever the layout moves.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (tourStep === null || !root) return;
    const measure = () => {
      const rootRect = root.getBoundingClientRect();
      const scale = root.offsetWidth ? rootRect.width / root.offsetWidth : 1;
      const available = STEPS.map((s, i) => (findTarget(root, s) ? i : -1)).filter((i) => i >= 0);
      const el = findTarget(root, STEPS[tourStep]);
      if (!el) {
        const next = available.find((i) => i > tourStep);
        if (next !== undefined) setStep(next);
        else end();
        return;
      }
      const r = el.getBoundingClientRect();
      const next = {
        rect: {
          top: (r.top - rootRect.top) / scale,
          left: (r.left - rootRect.left) / scale,
          width: r.width / scale,
          height: r.height / scale,
        },
        frame: { w: root.offsetWidth, h: root.offsetHeight },
        available,
        cardH: cardRef.current?.offsetHeight ?? 120,
      };
      // Only on change: a new object every measure would re-render forever.
      setLayout((prev) => (prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    for (const s of STEPS) {
      const el = root.querySelector(`[data-tour="${s.target}"]`);
      if (el) ro.observe(el);
    }
    root.addEventListener("scroll", measure, { capture: true, passive: true });
    return () => {
      ro.disconnect();
      root.removeEventListener("scroll", measure, { capture: true });
    };
  }, [tourStep, rootRef, setStep, end]);

  // The card's height settles after its first paint: re-place once it's known.
  useLayoutEffect(() => {
    const h = cardRef.current?.offsetHeight;
    if (h && layout && h !== layout.cardH) setLayout({ ...layout, cardH: h });
  }, [layout]);

  // Started from the header: focus Next, so Enter advances and a screen reader lands in the card.
  const shown = tourStep !== null && layout !== null;
  useEffect(() => {
    if (shown && focusOnShow && tourStep !== null) nextRef.current?.focus({ preventScroll: true });
  }, [tourStep, shown, focusOnShow]);

  // Keys inside the card: Esc skips, arrows move between the available steps.
  const available = layout?.available;
  useEffect(() => {
    const el = cardRef.current;
    if (!el || tourStep === null || !available) return;
    const onKey = (e: KeyboardEvent) => {
      const pos = available.indexOf(tourStep);
      if (e.key === "Escape") end();
      else if (e.key === "ArrowRight") {
        const n = available[pos + 1];
        if (n === undefined) end();
        else setStep(n);
      } else if (e.key === "ArrowLeft") {
        const p = available[pos - 1];
        if (p !== undefined) setStep(p);
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [tourStep, available, end, setStep]);

  if (tourStep === null || !layout) return null;
  const step = STEPS[tourStep];
  const { rect } = layout;
  const steps = layout.available;
  const pos = steps.indexOf(tourStep);
  const isLast = pos === steps.length - 1;
  const next = () => {
    const n = steps[pos + 1];
    if (n === undefined) end();
    else setStep(n);
  };
  const back = () => {
    const p = steps[pos - 1];
    if (p !== undefined) setStep(p);
  };
  const card = placeCard(rect, step.side, layout.cardH, layout.frame);

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      <div
        aria-hidden
        className="sl-tour-ring sl-box-vars absolute rounded-sl-card transition-all duration-200 ease-out motion-reduce:transition-none"
        style={{ "--sl-top": `${rect.top - PAD}px`, "--sl-left": `${rect.left - PAD}px`, "--sl-width": `${rect.width + PAD * 2}px`, "--sl-height": `${rect.height + PAD * 2}px` } as CSSProperties}
      />
      <div
        ref={cardRef}
        role="dialog"
        aria-labelledby="sl-tour-title"
        aria-describedby="sl-tour-body"
        className="sl-at-vars pointer-events-auto absolute flex w-70 flex-col gap-2 rounded-sl-card border border-sl-border bg-sl-elevated p-3 font-sl-lab text-sl-text shadow-sl-5 transition-all duration-200 ease-out motion-reduce:transition-none"
        style={{ "--sl-top": `${card.top}px`, "--sl-left": `${card.left}px` } as CSSProperties}
      >
        <h2 id="sl-tour-title" className="text-sl-13 leading-tight font-medium">
          {step.title}
        </h2>
        <p id="sl-tour-body" className="text-sl-12 leading-snug text-sl-text-2">
          {step.body}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="font-mono text-sl-11 text-sl-text-2 tabular-nums">
            {pos + 1} of {steps.length}
          </span>
          <div className="flex items-center gap-1.5">
            <SlButton variant="text" size="tourText" onClick={end}>
              Skip
            </SlButton>
            {pos > 0 && (
              <SlButton variant="lab" size="tour" onClick={back}>
                Back
              </SlButton>
            )}
            <SlButton ref={nextRef} variant="solid" size="tour" onClick={next}>
              {isLast ? "Done" : "Next"}
            </SlButton>
          </div>
        </div>
      </div>
    </div>
  );
}
