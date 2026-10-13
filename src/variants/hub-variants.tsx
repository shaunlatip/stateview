"use client";

/*
 * Variant harness for the hub (temporary). Each question is its own URL
 * param, so any combination is a link:
 *   ?__variant=  where a section's title sits and how its states wrap
 *   ?__look=     rounded cards or one ruled grid
 *   ?__bg=       which of the page and the sections is grey
 *   ?__thumb=    the narrowest a screen gets, in px
 * Keys: ← → or 1–3 the layout, G the look, B the background, [ ] the screen
 * width, H hides the picker. Delete this folder and the import in
 * app/page.tsx once one is chosen.
 */

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { parseAsStringLiteral, useQueryStates } from "nuqs";
import { Hub, type HubLayout, type HubLook, type HubSurface } from "@/stateview/hub";
import type { Inputs } from "@/stateview/manifest";
import "./variant-picker.css";

const LAYOUTS = [
  { value: "side", label: "Side" },
  { value: "above", label: "Above" },
  { value: "scroll", label: "Scroll" },
] as const satisfies readonly { value: HubLayout; label: string }[];

const LOOKS = [
  { value: "cards", label: "Cards" },
  { value: "grid", label: "Grid" },
] as const satisfies readonly { value: HubLook; label: string }[];

const BACKGROUNDS = [
  { value: "white", label: "White" },
  { value: "grey", label: "Grey" },
  { value: "grey-states", label: "Grey states" },
] as const satisfies readonly { value: HubSurface; label: string }[];

// Cards have no states-only fill, so they offer white or grey; the grid names which part its grey is on.
const CARD_BACKGROUNDS = BACKGROUNDS.slice(0, 2);
const GRID_BACKGROUNDS = [
  { value: "white", label: "None" },
  { value: "grey", label: "Titles" },
  { value: "grey-states", label: "States" },
] as const satisfies readonly { value: HubSurface; label: string }[];

const THUMBS = [
  { value: "288", label: "288" },
  { value: "352", label: "352" },
  { value: "416", label: "416" },
] as const;

const parsers = {
  __variant: parseAsStringLiteral(LAYOUTS.map((option) => option.value)).withDefault("side"),
  __look: parseAsStringLiteral(LOOKS.map((option) => option.value)).withDefault("cards"),
  __bg: parseAsStringLiteral(BACKGROUNDS.map((option) => option.value)).withDefault("white"),
  __thumb: parseAsStringLiteral(THUMBS.map((option) => option.value)).withDefault("352"),
};

function group<V extends string>(label: string, options: readonly { value: V; label: string }[], current: V, set: (value: V) => void) {
  return (
    <>
      <span data-picker-label="" aria-hidden>
        {label}
      </span>
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={current === option.value} onClick={() => set(option.value)}>
          {option.label}
        </button>
      ))}
    </>
  );
}

function step<V extends string>(options: readonly { value: V }[], current: V, by: number) {
  return options[(options.findIndex((option) => option.value === current) + by + options.length) % options.length].value;
}

export function HubVariants<T extends Inputs>(props: Omit<ComponentProps<typeof Hub<T>>, "layout" | "look" | "surface" | "thumbWidth">) {
  const [{ __variant: layout, __look: look, __bg: bg, __thumb: thumb }, setVariants] = useQueryStates(parsers, { history: "replace" });
  const [hidden, setHidden] = useState(false);
  const backgrounds = look === "grid" ? GRID_BACKGROUNDS : CARD_BACKGROUNDS;
  // "Grey states" carried over from the grid shows as Grey on cards (the Hub reads it that way too).
  const background = backgrounds.some((option) => option.value === bg) ? bg : "grey";
  const picker = useRef<HTMLElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']")) return;
      const key = event.key.toLowerCase();
      const jump = LAYOUTS[Number(event.key) - 1];
      if (event.key === "ArrowLeft") void setVariants({ __variant: step(LAYOUTS, layout, -1) });
      else if (event.key === "ArrowRight") void setVariants({ __variant: step(LAYOUTS, layout, 1) });
      else if (/^[1-9]$/.test(event.key) && jump) void setVariants({ __variant: jump.value });
      else if (key === "g") void setVariants({ __look: step(LOOKS, look, 1) });
      else if (key === "b") void setVariants({ __bg: step(backgrounds, background, 1) });
      else if (event.key === "[") void setVariants({ __thumb: step(THUMBS, thumb, -1) });
      else if (event.key === "]") void setVariants({ __thumb: step(THUMBS, thumb, 1) });
      else if (key === "h") setHidden((was) => !was);
      else return;
      event.preventDefault();
      requestAnimationFrame(() => picker.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" }));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [layout, look, backgrounds, background, thumb, setVariants]);

  return (
    <>
      <Hub {...props} layout={layout} look={look} surface={bg} thumbWidth={Number(thumb)} />
      <nav ref={picker} data-variant-picker="" aria-label="Variants" hidden={hidden}>
        {group("Layout", LAYOUTS, layout, (value) => void setVariants({ __variant: value }))}
        <span data-picker-divider="" aria-hidden />
        {group("Look", LOOKS, look, (value) => void setVariants({ __look: value }))}
        <span data-picker-divider="" aria-hidden />
        {group(look === "grid" ? "Grey" : "Page", backgrounds, background, (value) => void setVariants({ __bg: value }))}
        <span data-picker-divider="" aria-hidden />
        {group("Screen", THUMBS, thumb, (value) => void setVariants({ __thumb: value }))}
      </nav>
    </>
  );
}
