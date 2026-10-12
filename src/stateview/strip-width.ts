"use client";

import { useSyncExternalStore } from "react";

/**
 * The filmstrip's thumbnail width in px, set by dragging the strip's edge and
 * saved in localStorage so the viewer opens at the reviewer's width. While a
 * drag is under way the width is held here and saved once, when it ends.
 */
export const STRIP_WIDTH = { min: 112, max: 320, initial: 144, step: 16 } as const;

const KEY = "stateview:strip-width";
const listeners = new Set<() => void>();
let unsaved: number | null = null;

export function clampStripWidth(width: number) {
  return Math.round(Math.min(STRIP_WIDTH.max, Math.max(STRIP_WIDTH.min, width)));
}

function read() {
  if (unsaved !== null) return unsaved;
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {
    // Storage blocked: fall back to the default width.
  }
  const width = Number(stored);
  return stored && Number.isFinite(width) ? clampStripWidth(width) : STRIP_WIDTH.initial;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Sets the width; `settled` saves it (end of a drag, or a key press). */
export function setStripWidth(width: number, settled: boolean) {
  unsaved = clampStripWidth(width);
  if (settled) {
    try {
      localStorage.setItem(KEY, String(unsaved));
      unsaved = null;
    } catch {
      // Storage full or blocked: keep the width for this visit only.
    }
  }
  // forEach rather than for..of: apps that target es5 can't iterate a Set.
  listeners.forEach((listener) => listener());
}

export function useStripWidth() {
  return useSyncExternalStore(subscribe, read, () => STRIP_WIDTH.initial);
}
