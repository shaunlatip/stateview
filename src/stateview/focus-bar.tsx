"use client";

import Link from "next/link";
import { useRef } from "react";
import { CaretLeftIcon, CaretRightIcon, SquaresFourIcon } from "@phosphor-icons/react";
import { cn } from "./cn";
import type { Frame, Inputs } from "./manifest";
import { Button, ThemeScope, Tooltip, buttonVariants } from "./ui";
import { useBackdropScheme } from "./use-backdrop-scheme";

type FocusBarProps<T extends Inputs> = {
  frame: Frame<T>;
  /** 1-based position among all frames. */
  position: number;
  total: number;
  hubHref: string;
  onPrevious: (() => void) | null;
  onNext: (() => void) | null;
};

/**
 * Floating review controls (Graphical Toolbar). Overlaid rather than framed,
 * so the app keeps its full width. Takes the scheme opposite the content
 * behind it, so it stays distinct from any app.
 */
export function FocusBar<T extends Inputs>({ frame, position, total, hubHref, onPrevious, onNext }: FocusBarProps<T>) {
  const ref = useRef<HTMLElement>(null);
  const scheme = useBackdropScheme(ref);
  const step = frame.step ? `Step ${frame.step} of ${frame.stepCount}: ${frame.stepTitle}` : null;
  return (
    <ThemeScope
      as="aside"
      ref={ref}
      aria-label="Review"
      className={cn(
        "fixed inset-x-gui-s bottom-gui-s z-40 mx-auto flex max-w-2xl items-center gap-gui-xxs rounded-gui-m bg-gui-toolbar p-gui-xxs shadow-gui-s ring-1 ring-gui-neutral-4-transparent transition duration-gui-large ease-gui-large max-sm:right-18 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-reduce:transition-none",
        scheme === "dark" && "dark",
      )}
    >
      <Tooltip label="All states" shortcut="Esc">
        <Link href={hubHref} aria-label="All states" aria-keyshortcuts="Escape" className={buttonVariants({ variant: "toolbar", size: "icon" })}>
          <SquaresFourIcon aria-hidden />
        </Link>
      </Tooltip>
      {/* Wraps rather than truncates: on a phone the step is the part that would be cut. */}
      <div className="flex min-w-0 flex-1 flex-col px-gui-xs py-gui-xxs">
        <p className="text-gui-xs text-gui-neutral-7 tabular-nums">
          {frame.section.title} · {position} of {total}
        </p>
        <p className="text-gui-s font-gui-medium">
          {frame.item.title}
          {step ? <span className="font-gui-regular text-gui-neutral-7"> · {step}</span> : null}
        </p>
      </div>
      <Tooltip label="Previous state" shortcut="K">
        <Button variant="toolbar" size="icon" aria-label="Previous state" aria-keyshortcuts="K ArrowLeft" focusableWhenDisabled disabled={!onPrevious} onClick={onPrevious ?? undefined}>
          <CaretLeftIcon aria-hidden />
        </Button>
      </Tooltip>
      <Tooltip label="Next state" shortcut="J">
        <Button variant="toolbar" size="icon" aria-label="Next state" aria-keyshortcuts="J ArrowRight" focusableWhenDisabled disabled={!onNext} onClick={onNext ?? undefined}>
          <CaretRightIcon aria-hidden />
        </Button>
      </Tooltip>
      <p aria-live="polite" className="sr-only">
        {`${frame.section.title}: ${frame.item.title}${step ? `, ${step}` : ""}`}
      </p>
    </ThemeScope>
  );
}
