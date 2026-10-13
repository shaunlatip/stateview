"use client";

/*
 * Variant harness for the viewer (temporary): how the state panel lays out
 * its labels (?__panel=) and how the Comment split button is framed
 * (?__comment=), so every combination is a link. H hides the picker; the
 * arrows stay with the viewer, which steps between states with them. Delete
 * this file and its use in app/app/members once both are chosen.
 */

import { useEffect, useState, type ComponentProps } from "react";
import { parseAsStringLiteral, useQueryStates } from "nuqs";
import type { CommentStyle } from "@/stateview/focus-bar";
import { FocusView } from "@/stateview/focus-view";
import type { Inputs } from "@/stateview/manifest";
import type { PanelLayout } from "@/stateview/state-panel";
import "./variant-picker.css";

const PANELS: { value: PanelLayout; label: string }[] = [
  { value: "columns", label: "Columns" },
  { value: "inline", label: "Inline" },
  { value: "pills", label: "Pills" },
];

const COMMENTS: { value: CommentStyle; label: string }[] = [
  { value: "outline", label: "Outline" },
  { value: "filled", label: "Filled" },
  { value: "label", label: "Label" },
];

const parsers = {
  __panel: parseAsStringLiteral(PANELS.map((option) => option.value)).withDefault("columns"),
  __comment: parseAsStringLiteral(COMMENTS.map((option) => option.value)).withDefault("outline"),
};

export function ViewerVariants<T extends Inputs>(props: Omit<ComponentProps<typeof FocusView<T>>, "panelLayout" | "commentStyle">) {
  // Replace, not push: the viewer's own history is one entry per state.
  const [{ __panel: panel, __comment: comment }, setVariants] = useQueryStates(parsers, { history: "replace" });
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], [contenteditable=''], [role='dialog']")) return;
      if (event.key !== "h" && event.key !== "H") return;
      event.preventDefault();
      setHidden((was) => !was);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <FocusView {...props} panelLayout={panel} commentStyle={comment} />
      <nav data-variant-picker="" aria-label="Variants" hidden={hidden}>
        <span data-picker-label="" aria-hidden>
          Panel
        </span>
        {PANELS.map((option) => (
          <button key={option.value} type="button" aria-pressed={panel === option.value} onClick={() => void setVariants({ __panel: option.value })}>
            {option.label}
          </button>
        ))}
        <span data-picker-divider="" aria-hidden />
        <span data-picker-label="" aria-hidden>
          Comment
        </span>
        {COMMENTS.map((option) => (
          <button key={option.value} type="button" aria-pressed={comment === option.value} onClick={() => void setVariants({ __comment: option.value })}>
            {option.label}
          </button>
        ))}
      </nav>
    </>
  );
}
