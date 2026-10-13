"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduce(onChange: () => void) {
  const query = window.matchMedia(REDUCE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReduce,
    () => window.matchMedia(REDUCE_QUERY).matches,
    () => false,
  );
}

/**
 * The page's scroller: the document in a tall window, or the 560px window
 * element in the short-window state (it scrolls on its own there).
 */
export type Scroller = {
  top: () => number;
  height: () => number;
  scrollTo: (top: number, smooth: boolean) => void;
  maxTop: () => number;
  subscribe: (onScroll: () => void) => () => void;
};

export function scrollerFor(windowEl: HTMLElement, short: boolean): Scroller {
  if (short) {
    return {
      top: () => windowEl.scrollTop,
      height: () => windowEl.clientHeight,
      maxTop: () => windowEl.scrollHeight - windowEl.clientHeight,
      scrollTo: (top, smooth) => windowEl.scrollTo({ top, behavior: smooth ? "smooth" : "auto" }),
      subscribe: (onScroll) => {
        windowEl.addEventListener("scroll", onScroll, { passive: true });
        return () => windowEl.removeEventListener("scroll", onScroll);
      },
    };
  }
  return {
    top: () => window.scrollY,
    height: () => windowEl.clientHeight,
    maxTop: () => document.documentElement.scrollHeight - window.innerHeight,
    scrollTo: (top, smooth) => window.scrollTo({ top, behavior: smooth ? "smooth" : "auto" }),
    subscribe: (onScroll) => {
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    },
  };
}

/** Glide duration for arrow steps and drag release. */
const GLIDE_MS = 560;
/** Pointer travel (px) before a press becomes a drag. */
const DRAG_THRESHOLD = 5;
/** How far (ms) a throw's release velocity is projected forward. */
const THROW_MS = 260;
/** Presses on these keep their own pointer behaviour. */
const NO_DRAG = "canvas, input, textarea, select, [contenteditable], [role=slider], [data-no-drag]";

const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

/** Apple-style resistance past the ends: approaches 120px, never reaches it. */
function rubberBand(over: number) {
  const d = 120;
  return Math.sign(over) * (1 - 1 / ((Math.abs(over) * 0.55) / d + 1)) * d;
}

/** Swallows the click that ends a drag. */
function block(ev: Event) {
  ev.preventDefault();
  ev.stopPropagation();
}

export type CarouselPosition = "start" | "middle" | "end";

/**
 * Port of the portfolio's useCarousel (components/home/useCarousel.tsx):
 * mouse drag-to-scroll with rubber-banding and a velocity throw, arrow steps
 * that queue (each click steps from where the track is going), and one rAF
 * glide shared by both. `position` places the track on mount; stops are read
 * from layout offsets, so they're right inside a scaled thumbnail too.
 */
export function useCarousel(itemSelector: string, position: CarouselPosition) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ canPrev: position !== "start", canNext: position !== "end" });
  const [dragging, setDragging] = useState(false);
  const reduce = useReducedMotion();

  const sync = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    // A track that isn't a scroller (experiments at lg+) has nowhere to go, whatever its hover plates overhang.
    const scrolls = getComputedStyle(t).overflowX !== "visible";
    const canPrev = scrolls && t.scrollLeft > 4;
    const canNext = scrolls && t.scrollLeft < t.scrollWidth - t.clientWidth - 4;
    setEdges((prev) => (prev.canPrev === canPrev && prev.canNext === canNext ? prev : { canPrev, canNext }));
  }, []);

  // Snap stops: each card's left edge on the content edge (the scroll padding), clamped to the range.
  const getStops = useCallback(() => {
    const t = trackRef.current;
    if (!t) return [];
    const pad = parseFloat(getComputedStyle(t).scrollPaddingLeft) || 0;
    const max = t.scrollWidth - t.clientWidth;
    const stops = Array.from(t.querySelectorAll<HTMLElement>(itemSelector))
      .map((el) => Math.min(max, Math.max(0, el.offsetLeft - pad)))
      .toSorted((a, b) => a - b);
    return stops.filter((s, i) => i === 0 || Math.abs(s - stops[i - 1]) > 1);
  }, [itemSelector]);

  useLayoutEffect(() => {
    const t = trackRef.current;
    if (!t) return;
    if (position !== "start") {
      const max = t.scrollWidth - t.clientWidth;
      const target = position === "end" ? max : (getStops().find((s) => s > 4) ?? 0);
      t.style.scrollSnapType = "none";
      t.scrollLeft = target;
      t.style.scrollSnapType = "";
    }
    sync();
    t.addEventListener("scroll", sync, { passive: true });
    const resize = new ResizeObserver(sync);
    resize.observe(t);
    return () => {
      t.removeEventListener("scroll", sync);
      resize.disconnect();
    };
  }, [position, getStops, sync]);

  const glideRaf = useRef(0);
  const targetRef = useRef<number | null>(null);

  const stopGlide = useCallback(() => {
    const t = trackRef.current;
    cancelAnimationFrame(glideRaf.current);
    glideRaf.current = 0;
    targetRef.current = null;
    if (t) t.style.scrollSnapType = "";
  }, []);

  const glideTo = (target: number) => {
    const t = trackRef.current;
    if (!t) return;
    cancelAnimationFrame(glideRaf.current);
    if (reduce) {
      stopGlide();
      t.scrollLeft = target;
      return;
    }
    targetRef.current = target;
    t.style.scrollSnapType = "none";
    const from = t.scrollLeft;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / GLIDE_MS);
      t.scrollLeft = from + (target - from) * easeOutQuart(p);
      if (p < 1) glideRaf.current = requestAnimationFrame(tick);
      else stopGlide();
    };
    glideRaf.current = requestAnimationFrame(tick);
  };

  const step = (dir: 1 | -1) => {
    const t = trackRef.current;
    if (!t) return;
    const base = targetRef.current ?? t.scrollLeft;
    const stops = getStops();
    const next = dir === 1 ? stops.find((s) => s > base + 4) : stops.toReversed().find((s) => s < base - 4);
    if (next !== undefined) glideTo(next);
  };

  // A horizontal trackpad swipe or a touch takes over from any glide.
  useEffect(() => {
    const t = trackRef.current;
    if (!t) return;
    const onWheel = (e: WheelEvent) => {
      if (glideRaf.current && Math.abs(e.deltaX) > Math.abs(e.deltaY)) stopGlide();
    };
    const onTouch = () => {
      if (glideRaf.current) stopGlide();
    };
    t.addEventListener("wheel", onWheel, { passive: true });
    t.addEventListener("touchstart", onTouch, { passive: true });
    return () => {
      t.removeEventListener("wheel", onWheel);
      t.removeEventListener("touchstart", onTouch);
      cancelAnimationFrame(glideRaf.current);
    };
  }, [stopGlide]);

  const drag = useRef<{
    id: number;
    startX: number;
    startScroll: number;
    moved: boolean;
    lastX: number;
    lastT: number;
    v: number;
  } | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const t = trackRef.current;
    if (!t || t.scrollWidth <= t.clientWidth) return;
    if ((e.target as Element).closest(NO_DRAG)) return;
    stopGlide();
    drag.current = { id: e.pointerId, startX: e.clientX, startScroll: t.scrollLeft, moved: false, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const t = trackRef.current;
    if (!d || !t || e.pointerId !== d.id) return;
    const dx = e.clientX - d.startX;
    if (!d.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      d.moved = true;
      // Capture only once it's a drag, so a plain press still clicks the card under it.
      t.setPointerCapture(e.pointerId);
      t.style.scrollSnapType = "none";
      window.getSelection()?.removeAllRanges();
      setDragging(true);
    }
    const max = t.scrollWidth - t.clientWidth;
    const desired = d.startScroll - dx;
    const clamped = Math.min(max, Math.max(0, desired));
    t.scrollLeft = clamped;
    const inner = t.firstElementChild as HTMLElement | null;
    if (inner) {
      inner.style.transition = "none";
      inner.style.transform = desired === clamped ? "" : `translateX(${-rubberBand(desired - clamped)}px)`;
    }
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) {
      d.v = 0.8 * ((e.clientX - d.lastX) / dt) + 0.2 * d.v;
      d.lastX = e.clientX;
      d.lastT = e.timeStamp;
    }
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const t = trackRef.current;
    if (!d || !t || e.pointerId !== d.id) return;
    drag.current = null;
    if (!d.moved) return;
    setDragging(false);
    if (t.hasPointerCapture(e.pointerId)) t.releasePointerCapture(e.pointerId);

    const inner = t.firstElementChild as HTMLElement | null;
    if (inner?.style.transform) {
      inner.style.transition = `transform ${GLIDE_MS}ms cubic-bezier(0.23, 1, 0.32, 1)`;
      inner.style.transform = "";
    }

    // The click that ends a drag must not open the card under the cursor.
    t.addEventListener("click", block, { capture: true, once: true });
    window.setTimeout(() => t.removeEventListener("click", block, true), 0);

    // A pause before letting go means no throw.
    const v = e.timeStamp - d.lastT > 80 ? 0 : d.v;
    const projected = t.scrollLeft - v * THROW_MS;
    const stops = getStops();
    if (stops.length === 0) return;
    const nearest = stops.reduce((a, b) => (Math.abs(b - projected) < Math.abs(a - projected) ? b : a));
    glideTo(nearest);
  };

  return {
    trackRef,
    canPrev: edges.canPrev,
    canNext: edges.canNext,
    step,
    trackProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onLostPointerCapture: endDrag,
      // Links and images are natively draggable; that ghost drag would swallow the pointer stream.
      onDragStart: (e: DragEvent<HTMLDivElement>) => e.preventDefault(),
      "data-dragging": dragging || undefined,
    },
  };
}

export type Carousel = ReturnType<typeof useCarousel>;

/** How far (px) above/below the section the pointer still counts as near. */
const ZONE_MARGIN = 40;

/**
 * True while a mouse or pen is over the zone or within 40px above or below
 * it, full width. Geometric rather than :hover, as in the original: the
 * margin overlaps the hero and the sheet clips overflow. Re-checks on scroll.
 */
export function usePointerNear(zoneRef: RefObject<HTMLElement | null>, enabled: boolean) {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = zoneRef.current;
    if (!el || !enabled) return;
    let y = -1;
    let raf = 0;
    const check = () => {
      raf = 0;
      if (y < 0) return;
      const r = el.getBoundingClientRect();
      setNear(y >= r.top - ZONE_MARGIN && y <= r.bottom + ZONE_MARGIN);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      y = e.clientY;
      schedule();
    };
    const onLeave = () => {
      y = -1;
      setNear(false);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", schedule, { capture: true });
      document.documentElement.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [zoneRef, enabled]);
  return near;
}

/**
 * The state's pointer and focus moment holds until the reviewer does
 * something themselves (a press, a key, a focus move); from then on only
 * the real pointer and keyboard drive the arrows.
 */
export function useStagedMoment(enabled: boolean) {
  const [staged, setStaged] = useState(true);
  useEffect(() => {
    if (!enabled) return;
    const release = () => setStaged(false);
    window.addEventListener("pointerdown", release, { capture: true, once: true });
    window.addEventListener("keydown", release, { capture: true, once: true });
    return () => {
      window.removeEventListener("pointerdown", release, { capture: true });
      window.removeEventListener("keydown", release, { capture: true });
    };
  }, [enabled]);
  return staged;
}
