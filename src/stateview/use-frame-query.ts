"use client";

import { useSyncExternalStore } from "react";

/**
 * The review's place in the URL (`?sv=<state>&step=<n>`, plus one param per
 * input the reviewer changed in the state panel), read from and written to
 * the History API directly. That works the same under the App Router (which
 * syncs its own state on pushState since Next 14.1) and the Pages Router, and
 * stepping between states never waits on the router.
 */

const NAVIGATE = "stateview:navigate";

function subscribe(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener(NAVIGATE, listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener(NAVIGATE, listener);
  };
}

/** `null` on the server and during hydration, when the URL isn't known yet. */
export function useFrameQuery() {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => null,
  );
  if (search === null) return null;
  const params = new URLSearchParams(search);
  const step = Number(params.get("step"));
  return { sv: params.get("sv"), step: Number.isInteger(step) && step > 0 ? step : null, params };
}

/** Moves to another frame's URL as a new history entry, so Back steps back. */
export function pushFrame(href: string) {
  // No state of our own: each router fills in its own on pushState or on the next popstate.
  window.history.pushState(null, "", href);
  window.dispatchEvent(new Event(NAVIGATE));
}

/** Sets or clears (null) params on the current URL without a new history entry. */
export function replaceParams(update: Record<string, string | null>) {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(update)) {
    if (value === null) params.delete(key);
    else params.set(key, value);
  }
  window.history.replaceState(window.history.state, "", `${window.location.pathname}?${params}${window.location.hash}`);
  window.dispatchEvent(new Event(NAVIGATE));
}
