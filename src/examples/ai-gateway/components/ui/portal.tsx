"use client";

import { createContext, useContext } from "react";

/**
 * Where the screen's dialogs, menus and selects portal to: an element inside
 * the `.ai-gateway` root, so they keep its scoped tokens and theme rather
 * than landing in <body> with the host's.
 */
export const PortalContainerContext = createContext<HTMLElement | null>(null);

export function usePortalContainer() {
  return useContext(PortalContainerContext);
}
