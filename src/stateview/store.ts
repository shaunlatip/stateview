"use client";

import { useSyncExternalStore } from "react";
import type { Annotation } from "./annotations";
import type { Manifest } from "./manifest";

/**
 * Review comments and the states the reviewer has opened, saved in
 * localStorage under the manifest's id and version. A changed manifest gets a
 * fresh record instead of mapping old comments onto the wrong states.
 */

type ReviewRecord = {
  annotations: Annotation[];
  /** Ids of the states and flows the reviewer has opened. */
  viewed: string[];
};

const EMPTY: ReviewRecord = { annotations: [], viewed: [] };
const listeners = new Set<() => void>();
const snapshots = new Map<string, { raw: string | null; record: ReviewRecord }>();

function storageKey(manifest: Pick<Manifest, "id" | "version">) {
  return `stateview:${manifest.id}@${manifest.version}`;
}

// Comments saved by the old Agentation adapter have no element or anchor, so the comment engine can't place them.
function isPlaceable(annotation: Partial<Annotation>): annotation is Annotation {
  return isObject(annotation.element) && isObject(annotation.anchor);
}

function isObject(value: unknown) {
  return typeof value === "object" && value !== null;
}

function read(key: string): ReviewRecord {
  const raw = localStorage.getItem(key);
  const cached = snapshots.get(key);
  if (cached && cached.raw === raw) return cached.record;
  let record = EMPTY;
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<ReviewRecord>) : null;
    if (parsed) {
      record = {
        annotations: (parsed.annotations ?? []).filter(isPlaceable),
        viewed: (parsed.viewed ?? []).filter((id) => typeof id === "string"),
      };
    }
  } catch {
    // Unreadable record: start fresh rather than crash the review.
  }
  snapshots.set(key, { raw, record });
  return record;
}

function write(key: string, update: (record: ReviewRecord) => ReviewRecord) {
  try {
    localStorage.setItem(key, JSON.stringify(update(read(key))));
  } catch {
    // Storage full or blocked: progress won't persist, but the review keeps working.
  }
  // Array.from, not for…of: apps on an es5 target can't iterate a Set without downlevelIteration.
  for (const listener of Array.from(listeners)) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep two open tabs of the same review in sync.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function useReview(manifest: Pick<Manifest, "id" | "version">) {
  const key = storageKey(manifest);
  const record = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => EMPTY,
  );

  return {
    annotations: record.annotations,
    viewed: record.viewed,
    markViewed(id: string) {
      if (read(key).viewed.includes(id)) return;
      write(key, (r) => ({ ...r, viewed: [...r.viewed, id] }));
    },
    addAnnotation(annotation: Annotation) {
      write(key, (r) => ({ ...r, annotations: [...r.annotations.filter((a) => a.id !== annotation.id), annotation] }));
    },
    updateAnnotation(annotation: Annotation) {
      write(key, (r) => ({ ...r, annotations: r.annotations.map((a) => (a.id === annotation.id ? annotation : a)) }));
    },
    deleteAnnotation(id: string) {
      write(key, (r) => ({ ...r, annotations: r.annotations.filter((a) => a.id !== id) }));
    },
  };
}
