"use client";

import { useSyncExternalStore } from "react";

/**
 * The phone frame's size in CSS px on wide screens, set by dragging its edges
 * and saved in localStorage so the viewer opens at the reviewer's size, like
 * the filmstrip's width. While a drag is under way the size is held here and
 * saved once, when it ends.
 *
 * Starts at 393 × 852, the screen of the iPhone 15, 16 and 16 Pro in CSS px:
 * the most common current iPhone, and the size browser device modes use for it.
 * The frame is drawn smaller when the window can't fit it.
 */
export const DEVICE_SIZE = {
  min: { width: 320, height: 480 },
  // A sanity bound for stored values; the window is the real limit.
  max: { width: 4096, height: 4096 },
  initial: { width: 393, height: 852 },
  step: 10,
  bigStep: 50,
} as const;

export type DeviceSize = { width: number; height: number };

const KEY = "stateview:device-size";
const INITIAL = `${DEVICE_SIZE.initial.width}x${DEVICE_SIZE.initial.height}`;
const listeners = new Set<() => void>();
let unsaved: string | null = null;

function clamp(value: number, min: number, max: number) {
  return Math.round(Math.min(max, Math.max(min, value)));
}

function format({ width, height }: DeviceSize) {
  return `${clamp(width, DEVICE_SIZE.min.width, DEVICE_SIZE.max.width)}x${clamp(height, DEVICE_SIZE.min.height, DEVICE_SIZE.max.height)}`;
}

function parse(value: string | null): DeviceSize | null {
  const match = value ? /^(\d+)x(\d+)$/.exec(value) : null;
  return match ? { width: Number(match[1]), height: Number(match[2]) } : null;
}

// A string, so the snapshot is stable between reads.
function read() {
  if (unsaved !== null) return unsaved;
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {
    // Storage blocked: fall back to the default size.
  }
  const size = parse(stored);
  return size ? format(size) : INITIAL;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Sets the size; `settled` saves it (end of a drag, a key press, or a reset). */
export function setDeviceSize(size: DeviceSize, settled: boolean) {
  unsaved = format(size);
  if (settled) {
    try {
      localStorage.setItem(KEY, unsaved);
      unsaved = null;
    } catch {
      // Storage full or blocked: keep the size for this visit only.
    }
  }
  for (const listener of listeners) listener();
}

export function useDeviceSize(): DeviceSize {
  const snapshot = useSyncExternalStore(subscribe, read, () => INITIAL);
  return parse(snapshot) ?? DEVICE_SIZE.initial;
}
