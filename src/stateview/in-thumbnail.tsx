"use client";

import { createContext, useContext, type ReactNode } from "react";

const InThumbnailContext = createContext(false);

/** Marks a screen rendered as a hub or filmstrip thumbnail rather than the live app. */
export function InThumbnail({ children }: { children: ReactNode }) {
  return <InThumbnailContext value>{children}</InThumbnailContext>;
}

/**
 * True inside a thumbnail. A screen can use it to swap something expensive
 * for a still: a WebGL canvas per thumbnail would run past the browser's
 * limit on live contexts.
 */
export function useInThumbnail() {
  return useContext(InThumbnailContext);
}
