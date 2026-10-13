"use client";

import { useEffect } from "react";

/**
 * Sets the tab's title, and keeps it. Set in an effect rather than with
 * <title>, which React 18 doesn't hoist into <head>. The app's shell may set
 * its own title too (next/head or Next metadata, applied after this effect
 * runs), so the title is put back whenever <head> changes.
 */
export function useDocumentTitle(title: string | null) {
  useEffect(() => {
    if (!title) return;
    const keepTitle = () => {
      if (document.title !== title) document.title = title;
    };
    keepTitle();
    const observer = new MutationObserver(keepTitle);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [title]);
}
