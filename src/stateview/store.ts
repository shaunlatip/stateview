"use client";

import { useSyncExternalStore } from "react";
import type { Annotation } from "./annotations";
import type { Manifest } from "./manifest";

/**
 * Review progress, saved in localStorage under the manifest's id and version.
 * A changed manifest gets a fresh record instead of mapping old comments onto
 * the wrong states.
 */

type ReviewRecord = {
  /** Item ids (states and whole sequences) marked reviewed. */
  reviewed: string[];
  annotations: Annotation[];
};

const EMPTY: ReviewRecord = { reviewed: [], annotations: [] };
const listeners = new Set<() => void>();
const snapshots = new Map<string, { raw: string | null; record: ReviewRecord }>();

function storageKey(manifest: Pick<Manifest, "id" | "version">) {
  return `stateview:${manifest.id}@${manifest.version}`;
}

function read(key: string): ReviewRecord {
  const raw = localStorage.getItem(key);
  const cached = snapshots.get(key);
  if (cached && cached.raw === raw) return cached.record;
  let record = EMPTY;
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<ReviewRecord>) : null;
    if (parsed) record = { reviewed: parsed.reviewed ?? [], annotations: parsed.annotations ?? [] };
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
  for (const listener of listeners) listener();
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
    reviewed: record.reviewed,
    annotations: record.annotations,
    toggleReviewed(itemId: string) {
      write(key, (r) => ({
        ...r,
        reviewed: r.reviewed.includes(itemId) ? r.reviewed.filter((id) => id !== itemId) : [...r.reviewed, itemId],
      }));
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
