"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { CornerChips, FooterChips, chipText } from "./card-chips";
import { cn } from "./cn";
import { frameHref, listFrames, viewportOf, type Frame, type Inputs, type Item, type Manifest } from "./manifest";
import { ScrollArea } from "./scroll-area";
import { STRIP_WIDTH } from "./strip-width";
import { InputsThumbnail, Thumbnail, inputChanges } from "./thumbnail";
import { ThemeScope } from "./ui";

type FilmstripProps<T extends Inputs> = {
  id: string;
  manifest: Manifest<T>;
  /** The item on screen. */
  currentId: string;
  open: boolean;
  /** Open because of the screen width rather than the reviewer's choice: CSS decides, so the server render is already right. */
  auto: boolean;
  /** Thumbnail width in px; the strip is this plus its inset on each side. */
  width: number;
  /** `settled` is false while a drag is under way. */
  onResize: (width: number, settled: boolean) => void;
  viewed: string[];
  /** Open comments on an item, across its steps. */
  commentsOn: (item: Item<T>) => number;
  /** Null when the review turns live thumbnails off: each state lists the inputs it changes instead. */
  render: ((inputs: T) => ReactNode) | null;
  /** Called when a state is picked, before the page changes. */
  onPick: () => void;
};

/**
 * Every state as a small thumbnail down the left of the viewer, grouped by
 * section, with the one on screen outlined. Takes its own column, so the app
 * moves over rather than sliding under it (on phones it overlays instead).
 * Titles only: the hub carries the descriptions.
 */
export function Filmstrip<T extends Inputs>({ id, manifest, currentId, open, auto, width, onResize, viewed, commentsOn, render, onPick }: FilmstripProps<T>) {
  const frames = listFrames(manifest);
  const nav = useRef<HTMLElement>(null);

  // Closed, it slides out and leaves the tab order and the accessibility tree. Set on the
  // element: React 18 drops a boolean `inert` prop.
  useEffect(() => {
    nav.current?.toggleAttribute("inert", !open);
  }, [open]);

  return (
    <ThemeScope
      as="nav"
      ref={nav}
      id={id}
      aria-label="States"
      style={{ "--thumb-strip-chosen": width } as CSSProperties}
      className={cn(
        // Shaded like the hub's index, edged where it sits beside the app and lifted where it overlays it (phones).
        "fixed top-(--viewer-bar) bottom-0 left-0 z-30 flex w-(--viewer-strip) -translate-x-full flex-col bg-gui-neutral-2 max-md:shadow-gui-m md:gui-divider-end transition-transform duration-gui-large ease-gui-large motion-reduce:transition-none",
        auto ? "md:translate-x-0" : open && "translate-x-0",
      )}
    >
      <ScrollArea className="flex-1">
        {/* XL between sections against S between a section's states, so each section reads as its own group. */}
        <div className="flex flex-col gap-gui-xl px-(--viewer-strip-inset) pt-gui-m pb-gui-l">
          <StripSections manifest={manifest} frames={frames} currentId={currentId} viewed={viewed} commentsOn={commentsOn} render={render} onPick={onPick} />
        </div>
      </ScrollArea>
      <ResizeHandle controls={id} width={width} onResize={onResize} />
    </ThemeScope>
  );
}

function StripSections<T extends Inputs>({
  manifest,
  frames,
  currentId,
  viewed,
  commentsOn,
  render,
  onPick,
}: Pick<FilmstripProps<T>, "manifest" | "currentId" | "viewed" | "commentsOn" | "render" | "onPick"> & { frames: Frame<T>[] }) {
  return (
    <>
      {manifest.sections.map((section) => (
        <section key={section.id} aria-labelledby={`strip-${section.id}`} className="flex flex-col gap-gui-s">
          {/* A size up and heavier than the states' titles (XS), like the hub's section titles. */}
          <h2 id={`strip-${section.id}`} className="text-gui-s font-gui-heavy text-gui-neutral-10">
            {section.title}
          </h2>
          <ul className="flex flex-col gap-gui-s">
            {section.items.map((item) => {
              const first = frames.find((frame) => frame.item.id === item.id) ?? frames[0];
              const current = item.id === currentId;
              const isViewed = current || viewed.includes(item.id);
              const comments = commentsOn(item);
              const details = chipText(item, isViewed);
              const ring = cn(
                // Only hover fades the ring in. Stepping with J/K moves the current ring at once, so there's never more than one on screen.
                // transition-none, not just no transition class: duration-gui sets a duration, and with no property named every property would ease.
                "transition-none duration-gui ease-gui group-hover:transition-shadow motion-reduce:transition-none",
                current ? "ring-2 ring-gui-neutral-10" : "group-hover:ring-gui-neutral-6",
              );
              return (
                <li key={item.id} className="flex">
                  <Link
                    // Keep the state on screen in view as the reviewer steps through.
                    ref={current ? keepInView : undefined}
                    href={frameHref(manifest, first)}
                    aria-current={current ? "page" : undefined}
                    onClick={onPick}
                    className="group flex w-min flex-col gap-gui-xxs rounded-gui-s outline-offset-2 outline-none focus-visible:gui-focus-ring"
                  >
                    <div className="relative">
                      {render ? (
                        <Thumbnail viewport={viewportOf(manifest, first.inputs)} size="strip" className={ring}>
                          {render(first.inputs)}
                        </Thumbnail>
                      ) : (
                        <InputsThumbnail size="strip" className={ring} changes={inputChanges(manifest, first.inputs)} />
                      )}
                      <CornerChips comments={comments} viewed={isViewed} />
                      <FooterChips item={item} />
                    </div>
                    {/* The same for every state: the outline on the screen alone marks the one on screen. */}
                    <span className="line-clamp-1 text-gui-xs text-gui-neutral-8">
                      {item.title}
                      {comments > 0 ? <span className="sr-only">{`, ${comments} open ${comments === 1 ? "comment" : "comments"}`}</span> : null}
                      {details ? <span className="sr-only">{`, ${details}`}</span> : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}

/**
 * Scrolls the strip so the state on screen is in view. Not `scrollIntoView`:
 * in a focused window Chrome also moves the Tab starting point to the element,
 * so the reviewer's first Tab would skip the bar and land in the strip.
 */
function keepInView(node: HTMLElement | null) {
  const scroller = node ? scrollParent(node) : null;
  if (!node || !scroller) return;
  const item = node.getBoundingClientRect();
  const view = scroller.getBoundingClientRect();
  if (item.top < view.top) scroller.scrollTop += item.top - view.top;
  else if (item.bottom > view.bottom) scroller.scrollTop += item.bottom - view.bottom;
}

function scrollParent(node: HTMLElement) {
  for (let element = node.parentElement; element; element = element.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(element).overflowY)) return element;
  }
  return null;
}

/**
 * The strip's right edge, dragged (or arrowed) to resize the thumbnails
 * between STRIP_WIDTH.min and max. Straddles the edge so it's easy to grab;
 * a grey line shows on hover, and a black one while dragging or focused.
 * Wide screens only: on phones the strip overlays the app at its default size.
 */
function ResizeHandle({ controls, width, onResize }: { controls: string; width: number; onResize: (width: number, settled: boolean) => void }) {
  const drag = useRef<{ x: number; width: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const end = (event: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const start = drag.current;
    if (!start) return;
    drag.current = null;
    setDragging(false);
    onResize(cancelled ? width : start.width + event.clientX - start.x, true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = {
      ArrowLeft: width - STRIP_WIDTH.step,
      ArrowRight: width + STRIP_WIDTH.step,
      Home: STRIP_WIDTH.min,
      End: STRIP_WIDTH.max,
    }[event.key];
    if (next === undefined) return;
    // Arrows here resize the strip rather than step between states.
    event.preventDefault();
    onResize(next, true);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize states"
      aria-controls={controls}
      aria-valuenow={width}
      aria-valuemin={STRIP_WIDTH.min}
      aria-valuemax={STRIP_WIDTH.max}
      tabIndex={0}
      data-dragging={dragging ? "" : undefined}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { x: event.clientX, width };
        setDragging(true);
        onResize(width, false);
      }}
      onPointerMove={(event) => {
        const start = drag.current;
        if (start) onResize(start.width + event.clientX - start.x, false);
      }}
      onPointerUp={(event) => end(event, false)}
      onPointerCancel={(event) => end(event, true)}
      onKeyDown={onKeyDown}
      className={cn(
        "absolute inset-y-0 -right-gui-xxs z-10 w-gui-xs touch-none outline-none select-none max-md:hidden focus-visible:gui-focus-ring",
        "after:absolute after:inset-y-0 after:right-gui-xxs after:w-0.5 after:transition-colors after:duration-gui after:ease-gui hover:after:bg-gui-neutral-6 focus-visible:after:bg-gui-neutral-10 data-dragging:after:bg-gui-neutral-10 motion-reduce:after:transition-none",
        // The cursor points the way the strip can still go.
        width <= STRIP_WIDTH.min ? "cursor-e-resize" : width >= STRIP_WIDTH.max ? "cursor-w-resize" : "cursor-col-resize",
      )}
    />
  );
}
