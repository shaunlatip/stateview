"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { ImageDown, Maximize, Minus, PanelBottomClose, PanelBottomOpen, Plus, RotateCcw, X } from "lucide-react";
import { useInThumbnail } from "@/stateview/in-thumbnail";
import { cn } from "./cn";
import { SlButton } from "./components/ui/button";
import { IconTip } from "./components/ui/tooltip";
import { ASPECTS, EXAMPLES, presetBySlug, sourceUrl, type Effect, type Example } from "./fixtures";
import { StageRenderer, type Engine, type Simulate } from "./gl/renderer";
import { stillUrl } from "./stills";
import { describeStack, type Lab, type Look } from "./use-lab";
import { useDrop } from "./use-drop";

const PAD = 56;
const COMPACT_BELOW = 560;
const PAD_COMPACT = 24;
/** Space held clear under the artwork for the floating toolbar (a still source). */
const RESERVE = 24;
const PREVIEW_MAX_LONG = 1100;

const ZMIN = 0.1;
const ZMAX = 8;
type View = { zoom: number; panX: number; panY: number };
const IDENTITY: View = { zoom: 1, panX: 0, panY: 0 };
const clampZoom = (z: number) => Math.min(ZMAX, Math.max(ZMIN, z));
/** zoom.ts zoomToward: zoom by `factor` keeping (cx, cy), relative to the stage centre, fixed. */
function zoomToward(v: View, factor: number, cx: number, cy: number): View {
  const zoom = clampZoom(v.zoom * factor);
  const k = zoom / v.zoom;
  return { zoom, panX: cx - (cx - v.panX) * k, panY: cy - (cy - v.panY) * k };
}

/** Stage.tsx cssFit: integer CSS size, so the bitmap edge never antialiases into a fringe. */
function cssFit(boxW: number, boxH: number, ratio: number, pad: number) {
  let w = boxW - pad;
  let h = w / ratio;
  if (h > boxH - pad) {
    h = boxH - pad;
    w = h * ratio;
  }
  return { w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)) };
}

/** resolution.ts previewDims: css size × dpr (≤ 2), capped at 1100px on the long edge. */
function previewDims(ratio: number, box: { w: number; h: number }, dpr: number) {
  let cssW = box.w;
  let cssH = cssW / ratio;
  if (cssH > box.h) {
    cssH = box.h;
    cssW = cssH * ratio;
  }
  let W = Math.round(cssW * dpr);
  let H = Math.round(cssH * dpr);
  const long = Math.max(W, H);
  if (long > PREVIEW_MAX_LONG) {
    const k = PREVIEW_MAX_LONG / long;
    W = Math.round(W * k);
    H = Math.round(H * k);
  }
  return { W: Math.max(1, W), H: Math.max(1, H) };
}

/**
 * The live preview: a 2D canvas the WebGL renderer draws into on demand —
 * once per change, or every frame only while an effect that moves in the app
 * (grain with Animate on) is enabled and reduced motion is off. The renderer,
 * and with it the WebGL context, is released on unmount.
 */
function LiveCanvas({
  url,
  stack,
  dims,
  simulate,
  label,
}: {
  url: string | null;
  stack: Effect[];
  dims: { W: number; H: number };
  simulate: Simulate;
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<StageRenderer | null>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const renderer = new StageRenderer(simulate, (next) => setEngine(next));
    rendererRef.current = renderer;
    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [simulate]);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    const next = new Image();
    next.src = url;
    next
      .decode()
      .then(() => {
        if (alive) setImg(next);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [url]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !renderer || !img || dims.W < 2) return;
    let frames = 0;
    const draw = (t: number) => {
      renderer.render(canvas, img, stack, dims.W, dims.H, t);
      frames += 1;
      canvas.dataset.renderer = renderer.engine;
      canvas.dataset.frames = String(frames);
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    // Re-run when the engine changes: a context loss drops to the CPU path, which never animates.
    const onGl = (engine ?? renderer.engine) === "gl";
    if (!onGl || !renderer.wantsAnimation(stack) || reduce) {
      raf = requestAnimationFrame(() => draw(0));
      return () => cancelAnimationFrame(raf);
    }
    const t0 = performance.now();
    const loop = () => {
      draw((performance.now() - t0) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [img, stack, dims.W, dims.H, engine]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label}
      data-engine={engine ?? undefined}
      className="block size-full rounded-sl-print shadow-sl-5 ring-1 ring-sl-hairline"
    />
  );
}

function ExampleCard({ example, active, onApply }: { example: Example; active: boolean; onApply: () => void }) {
  const presetName = presetBySlug(example.preset)?.name ?? example.preset;
  return (
    <button
      type="button"
      onClick={onApply}
      aria-pressed={active}
      title={`${example.subject} · ${presetName} — video by ${example.credit} on Pexels`}
      className="group flex w-24 shrink-0 cursor-pointer flex-col gap-1 text-center @md/rail:w-30"
    >
      <span
        className={cn(
          "overflow-hidden rounded-sl-card border transition duration-150 ease-out motion-safe:group-active:scale-97",
          active ? "border-sl-text ring-1 ring-sl-text" : "border-sl-border group-hover:border-sl-border-strong",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a fixed local thumbnail */}
        <img
          src={example.thumb}
          alt=""
          loading="lazy"
          className="aspect-video w-full bg-sl-active object-cover transition-transform duration-300 ease-out motion-safe:group-hover:scale-104"
        />
      </span>
      <span className="flex flex-col items-center px-0.5 leading-tight">
        <span className="max-w-full truncate text-sl-11 text-sl-text">{example.subject}</span>
        <span className="max-w-full truncate text-sl-11 text-sl-text-2 transition-colors group-hover:text-sl-text">{presetName}</span>
      </span>
    </button>
  );
}

/**
 * The examples rail: a filmstrip docked under the canvas. Each example pairs
 * a free clip with a preset; applying one swaps the source and the stack
 * together. Centred when it fits, scrolling sideways with an edge fade when not.
 */
function ExamplesRail({ lab }: { lab: Lab }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ left: false, right: false });

  useLayoutEffect(() => {
    const el = scrollRef.current;
    const strip = stripRef.current;
    if (!el || !strip) return;
    const measure = () =>
      setMore({ left: el.scrollLeft > 1, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(strip);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, []);

  const activeSlug = lab.source.kind === "example" ? lab.source.slug : null;

  return (
    <section
      data-tour="examples"
      aria-label="Examples"
      className="@container/rail relative shrink-0 border-t border-sl-border bg-sl-canvas px-3 pt-2.5 pb-3"
    >
      <h2 className="mb-2 px-8 text-center text-sl-13 leading-6 font-medium text-sl-text">Start from an example</h2>
      <span className="absolute top-2.5 right-3">
        <IconTip label="Hide examples" align="end">
          <SlButton variant="quiet" size="tiny" onClick={() => lab.setExamplesOpen(false)} aria-label="Hide examples">
            <X className="size-3.5" />
          </SlButton>
        </IconTip>
      </span>
      <div
        ref={scrollRef}
        onWheel={(e) => {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.currentTarget.scrollLeft += e.deltaY;
        }}
        className={cn(
          "sl-no-scrollbar -mx-3 overflow-x-auto px-3",
          more.left && more.right ? "sl-fade-both" : more.left ? "sl-fade-left" : more.right ? "sl-fade-right" : "",
        )}
      >
        <div ref={stripRef} className="mx-auto flex w-max gap-2">
          {EXAMPLES.map((example) => (
            <ExampleCard
              key={example.slug}
              example={example}
              active={example.slug === activeSlug}
              onApply={() => lab.actions.pickExample(example.slug)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function HudDivider() {
  return <div aria-hidden className="mx-0.5 h-4 w-px bg-sl-border" />;
}

/**
 * The stage: the artwork centred on a quiet studio surface (pan by dragging,
 * zoom with the wheel or the HUD), the empty and loading states, the drop
 * overlay, and the examples rail docked underneath.
 */
export function Stage({ lab, simulate, still }: { lab: Lab; simulate: Simulate; still: string | null }) {
  const inThumbnail = useInThumbnail();
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>(IDENTITY);
  const [showOriginal, setShowOriginal] = useState(false);
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const drop = useDrop(lab.actions.loadFile, lab.seededDrag);

  const ratio = ASPECTS.find((a) => a.id === lab.output.aspect)?.ratio ?? 16 / 9;
  const compact = box.w > 0 && box.w < COMPACT_BELOW;
  const pad = compact ? PAD_COMPACT : PAD;
  const fit = cssFit(box.w, box.h, ratio, pad);
  const [dpr, setDpr] = useState(1);
  const dims = previewDims(ratio, { w: box.w - pad, h: box.h - pad }, dpr);

  // While a picked example loads, the stage keeps the look that belongs to the old source.
  const shown: Look = lab.pending && lab.held ? lab.held : lab.look;
  const shownUrl = shown.source.kind === "upload" ? lab.imageUrl : sourceUrl(shown.source);
  const empty = !lab.pending && (!!lab.error || lab.source.kind === "none");
  const stack = showOriginal ? [] : shown.stack;
  const label = shownUrl
    ? `Preview of ${lab.sourceName || "the source"}${stack.some((e) => e.enabled) ? ` with ${describeStack(stack)}` : ", unedited"}`
    : "Empty preview";

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    setDpr(Math.min(2, window.devicePixelRatio || 1));
    const ro = new ResizeObserver(([entry]) => setBox({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Wheel zoom toward the cursor needs a non-passive listener.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const cx = e.clientX - (r.left + r.width / 2);
      const cy = e.clientY - (r.top + (r.height - RESERVE) / 2);
      setView((v) => zoomToward(v, e.deltaY < 0 ? 1.12 : 1 / 1.12, cx, cy));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, panX: view.panX, panY: view.panY };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    setView((v) => ({ ...v, panX: d.panX + e.clientX - d.x, panY: d.panY + e.clientY - d.y }));
  };
  const endDrag = () => {
    drag.current = null;
  };

  const zoomPct = Math.round(view.zoom * 100);
  const measured = box.w > 0;

  return (
    <div className="flex size-full min-h-0 flex-col">
      <div className="relative flex min-h-0 w-full flex-1 flex-col">
        {/* Pan and zoom are pointer conveniences; the HUD carries the same actions for keyboards. */}
        <div
          ref={boxRef}
          role="presentation"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          {...drop.handlers}
          className="relative flex flex-1 cursor-grab touch-none items-center justify-center overflow-hidden bg-sl-stage pb-6 active:cursor-grabbing"
        >
          <div
            data-still={still ?? undefined}
            className={cn("sl-fit-vars relative will-change-transform", !measured && "invisible")}
            style={
              {
                "--sl-width": `${fit.w}px`,
                "--sl-height": `${fit.h}px`,
                "--sl-transform": `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`,
              } as CSSProperties
            }
          >
            {!empty &&
              (inThumbnail ? (
                still && (
                  // eslint-disable-next-line @next/next/no-img-element -- a still of the render, sized by the fit above
                  <img src={stillUrl(still)} alt="" className="block size-full rounded-sl-print shadow-sl-5 ring-1 ring-sl-hairline" />
                )
              ) : (
                <LiveCanvas url={shownUrl} stack={stack} dims={dims} simulate={simulate} label={label} />
              ))}
            {empty && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-sl-frame border border-dashed border-sl-border-strong px-6 text-center">
                <ImageDown aria-hidden className="size-5 text-sl-text-2" />
                <p className="text-sl-13 font-medium text-sl-text">{lab.error ?? "No source yet"}</p>
                <p className="max-w-80 text-sl-12 leading-snug text-sl-text-2">
                  Drop an image or video here, upload one on the left
                  {lab.examplesOpen ? ", or pick an example below." : "."}
                </p>
                {!lab.examplesOpen && (
                  <span className="mt-1">
                    <SlButton variant="lab" size="box" onClick={() => lab.setExamplesOpen(true)}>
                      Show examples
                    </SlButton>
                  </span>
                )}
              </div>
            )}
          </div>
          {lab.pending && (
            <span
              role="status"
              className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full border border-sl-border bg-sl-canvas/90 px-2 py-0.5 text-sl-11 text-sl-text-2 shadow-sl-2 backdrop-blur"
            >
              loading…
            </span>
          )}
          {drop.dragOver && (
            <div className="pointer-events-none absolute inset-3 z-20 flex flex-col items-center justify-center gap-2 rounded-sl-card border-2 border-dashed border-sl-text bg-sl-canvas/80 backdrop-blur-sm">
              <ImageDown aria-hidden className="size-6 text-sl-text" />
              <span className="text-sl-13 font-medium text-sl-text">Drop to set as source</span>
            </div>
          )}
        </div>

        {/* Zoom HUD: a light pill floating over the stage. */}
        <div
          role="toolbar"
          aria-label="Canvas"
          className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-sl-border bg-sl-canvas/90 p-1 text-sl-text shadow-sl-3 backdrop-blur"
        >
          <IconTip label={lab.examplesOpen ? "Hide examples" : "Show examples"}>
            <SlButton
              variant={lab.examplesOpen ? "hudOn" : "hud"}
              size="icon-xs"
              onClick={() => lab.setExamplesOpen(!lab.examplesOpen)}
              aria-label="Toggle examples"
              aria-pressed={lab.examplesOpen}
            >
              {lab.examplesOpen ? <PanelBottomClose className="size-3.5" /> : <PanelBottomOpen className="size-3.5" />}
            </SlButton>
          </IconTip>
          <HudDivider />
          <div className="pointer-events-auto flex items-center rounded-full bg-sl-active p-0.5 text-sl-10 font-medium">
            {(
              [
                ["Original", true],
                ["Edited", false],
              ] as const
            ).map(([text, original]) => (
              <button
                key={text}
                type="button"
                aria-pressed={showOriginal === original}
                onClick={() => setShowOriginal(original)}
                className={cn(
                  "cursor-pointer rounded-full px-2 py-0.5 transition-colors",
                  showOriginal === original ? "bg-sl-canvas text-sl-text shadow-sm" : "text-sl-text-2 hover:text-sl-text",
                )}
              >
                {text}
              </button>
            ))}
          </div>
          <HudDivider />
          <IconTip label="Zoom out">
            <SlButton variant="hud" size="icon-xs" onClick={() => setView((v) => zoomToward(v, 1 / 1.2, 0, 0))} aria-label="Zoom out">
              <Minus className="size-3.5" />
            </SlButton>
          </IconTip>
          <button
            type="button"
            onClick={() => setView(IDENTITY)}
            aria-label={`Zoom ${zoomPct}%, reset`}
            className="pointer-events-auto min-w-11 cursor-pointer rounded text-center font-mono text-sl-11 text-sl-text tabular-nums transition duration-150 hover:text-sl-text-2 active:scale-95"
          >
            {zoomPct}%
          </button>
          <IconTip label="Zoom in">
            <SlButton variant="hud" size="icon-xs" onClick={() => setView((v) => zoomToward(v, 1.2, 0, 0))} aria-label="Zoom in">
              <Plus className="size-3.5" />
            </SlButton>
          </IconTip>
          <HudDivider />
          <IconTip label="Fit to view" align={compact ? "end" : "center"}>
            <SlButton variant="hud" size="icon-xs" onClick={() => setView(IDENTITY)} aria-label="Fit">
              <Maximize className="size-3.5" />
            </SlButton>
          </IconTip>
          {!compact && (
            <>
              <IconTip label="Zoom to 100%">
                <SlButton
                  variant="hud"
                  size="icon-xs"
                  onClick={() => setView({ zoom: clampZoom(dims.W / fit.w), panX: 0, panY: 0 })}
                  aria-label="100%"
                >
                  <span className="font-mono text-sl-10">1:1</span>
                </SlButton>
              </IconTip>
              <IconTip label="Reset view">
                <SlButton variant="hud" size="icon-xs" onClick={() => setView(IDENTITY)} aria-label="Reset">
                  <RotateCcw className="size-3.5" />
                </SlButton>
              </IconTip>
            </>
          )}
        </div>
      </div>
      {lab.examplesOpen && <ExamplesRail lab={lab} />}
    </div>
  );
}
