"use client";

/*
 * Variant harness for the hub (temporary). Two independent questions, each
 * its own URL param so any combination is a link:
 *   ?__variant=  how sections are set apart
 *   ?__thumb=    how wide a state's screen is
 * Keys: ← → step the layout, [ ] step the size, 1–6 jump, H hides the picker.
 * Delete this folder and the import in app/page.tsx once one is chosen.
 */

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Hub, type HubLayout } from "@/stateview/hub";
import type { Inputs } from "@/stateview/manifest";
import "./variant-picker.css";

const LAYOUTS = [
  { value: "dividers", label: "Dividers" },
  { value: "section-cards", label: "Section cards" },
  { value: "state-tiles", label: "State tiles" },
] as const satisfies readonly { value: HubLayout; label: string }[];

const THUMBS = [
  { value: "208", label: "208" },
  { value: "288", label: "288" },
  { value: "416", label: "416" },
] as const;

const layoutParser = parseAsStringLiteral(LAYOUTS.map((option) => option.value)).withDefault("dividers");
const thumbParser = parseAsStringLiteral(THUMBS.map((option) => option.value)).withDefault("208");

export function HubVariants<T extends Inputs>(props: Omit<ComponentProps<typeof Hub<T>>, "layout" | "thumbWidth">) {
  const [layout, setLayout] = useQueryState("__variant", layoutParser);
  const [thumb, setThumb] = useQueryState("__thumb", thumbParser);
  const [hidden, setHidden] = useState(false);
  const picker = useRef<HTMLElement>(null);

  useEffect(() => {
    const step = <V extends string>(options: readonly { value: V }[], current: V, by: number) =>
      options[(options.findIndex((option) => option.value === current) + by + options.length) % options.length].value;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']")) return;
      const all = [...LAYOUTS.map((o) => () => setLayout(o.value)), ...THUMBS.map((o) => () => setThumb(o.value))];
      if (event.key === "ArrowLeft") void setLayout(step(LAYOUTS, layout, -1));
      else if (event.key === "ArrowRight") void setLayout(step(LAYOUTS, layout, 1));
      else if (event.key === "[") void setThumb(step(THUMBS, thumb, -1));
      else if (event.key === "]") void setThumb(step(THUMBS, thumb, 1));
      else if (event.key === "h" || event.key === "H") setHidden((was) => !was);
      else if (/^[1-9]$/.test(event.key) && all[Number(event.key) - 1]) void all[Number(event.key) - 1]();
      else return;
      event.preventDefault();
      requestAnimationFrame(() => picker.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" }));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [layout, thumb, setLayout, setThumb]);

  return (
    <>
      <Hub {...props} layout={layout} thumbWidth={Number(thumb)} />
      <nav ref={picker} data-variant-picker="" aria-label="Variants" hidden={hidden}>
        <div role="group" aria-label="Layout">
          <span data-picker-label="" aria-hidden>
            Layout
          </span>
          {LAYOUTS.map((option) => (
            <button key={option.value} type="button" data-variant={option.value} aria-pressed={layout === option.value} onClick={() => void setLayout(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
        <span data-picker-rule="" aria-hidden />
        <div role="group" aria-label="Screen width">
          <span data-picker-label="" aria-hidden>
            Screen
          </span>
          {THUMBS.map((option) => (
            <button key={option.value} type="button" data-variant={option.value} aria-pressed={thumb === option.value} onClick={() => void setThumb(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
