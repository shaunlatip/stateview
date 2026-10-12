"use client";

import { useCallback, useInsertionEffect, useRef } from "react";

/**
 * React 19.2's useEffectEvent for apps on React 18 too: a stable function
 * that always calls the latest render's handler. Call it from effects and
 * event listeners, never during render.
 */
export function useEffectEvent<A extends unknown[], R>(handler: (...args: A) => R): (...args: A) => R {
  const latest = useRef(handler);
  useInsertionEffect(() => {
    latest.current = handler;
  });
  return useCallback((...args: A) => latest.current(...args), []);
}
