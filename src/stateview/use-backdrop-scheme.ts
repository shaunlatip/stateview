"use client";

import { useEffect, useState, type RefObject } from "react";

export type Scheme = "light" | "dark";

// Agentation's markers and popovers float over the page too; they aren't the backdrop.
const IGNORED = "[data-agentation-portal]";

/**
 * The scheme that contrasts with whatever sits behind the element's center:
 * "dark" over a light backdrop, "light" over a dark one. Re-measures on
 * scroll, resize and whenever the page's DOM changes (a new state renders,
 * a dialog opens), at most once per frame.
 */
export function useBackdropScheme(ref: RefObject<HTMLElement | null>): Scheme {
  // Most apps under review are light, so start dark rather than flash light first.
  const [scheme, setScheme] = useState<Scheme>("dark");

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      if (ref.current) setScheme(luminance(backdropColor(ref.current)) > 0.5 ? "dark" : "light");
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ref]);

  return scheme;
}

type Rgba = [number, number, number, number];

const WHITE: Rgba = [255, 255, 255, 255];

/** The first solid background behind the element's center, page background as the fallback. */
function backdropColor(element: HTMLElement): Rgba {
  const rect = element.getBoundingClientRect();
  const behind = document
    .elementsFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    .find((el) => !element.contains(el) && !el.closest(IGNORED));
  for (let el: Element | null = behind ?? document.body; el; el = el.parentElement) {
    const color = toRgba(getComputedStyle(el).backgroundColor);
    // Faint tints (hover washes, scrims) say little about the surface underneath.
    if (color && color[3] >= 128) return color;
  }
  return WHITE;
}

let probe: CanvasRenderingContext2D | null = null;

/**
 * Any CSS color as sRGB bytes. Computed styles can come back as oklch() or
 * color() (Tailwind v4 themes), so a 1px canvas does the conversion.
 */
function toRgba(color: string): Rgba | null {
  probe ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!probe) return null;
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "transparent";
  probe.fillStyle = color;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a];
}

/** WCAG relative luminance of an sRGB color, 0 (black) to 1 (white). */
function luminance([r, g, b]: Rgba) {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function linear(channel: number) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
