"use client";

import Link from "next/link";
import { ArrowLeftIcon, CaretLeftIcon, CaretRightIcon, CheckCircleIcon, CircleIcon } from "@phosphor-icons/react";
import type { Frame, Inputs } from "./manifest";
import { Button, Kbd, ThemeScope, ToolbarSeparator, buttonVariants } from "./ui";

type FocusBarProps<T extends Inputs> = {
  frame: Frame<T>;
  /** 1-based position among all frames. */
  position: number;
  total: number;
  reviewed: boolean;
  hubHref: string;
  onPrevious: (() => void) | null;
  onNext: (() => void) | null;
  onToggleReviewed: () => void;
};

/**
 * Floating review controls (Graphical Toolbar). Overlaid rather than framed,
 * so the app keeps its full width.
 */
export function FocusBar<T extends Inputs>({ frame, position, total, reviewed, hubHref, onPrevious, onNext, onToggleReviewed }: FocusBarProps<T>) {
  const step = frame.step ? `Step ${frame.step} of ${frame.stepCount}: ${frame.stepTitle}` : null;
  return (
    <ThemeScope
      as="aside"
      aria-label="Review"
      className="fixed inset-x-gui-s bottom-gui-s z-40 mx-auto flex max-w-2xl items-center gap-gui-xxs rounded-gui-s bg-gui-neutral-1 p-gui-xxs shadow-gui-s ring-1 ring-gui-neutral-4-transparent duration-gui-large ease-gui-large max-sm:right-18 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 dark:bg-gui-neutral-2"
    >
      <Link href={hubHref} aria-keyshortcuts="Escape" className={buttonVariants({ variant: "toolbar", size: "toolbar" })}>
        <ArrowLeftIcon aria-hidden />
        <span className="max-sm:sr-only">Hub</span>
        <Kbd className="max-sm:hidden">Esc</Kbd>
      </Link>
      <ToolbarSeparator />
      <div className="flex min-w-0 flex-1 flex-col px-gui-xs">
        <p className="truncate text-gui-xs text-gui-neutral-7 tabular-nums">
          {frame.section.title} · {position} of {total}
        </p>
        <p className="truncate text-gui-s font-gui-medium">
          {frame.item.title}
          {step ? <span className="font-gui-regular text-gui-neutral-7"> · {step}</span> : null}
        </p>
      </div>
      <Button variant="toolbar" size="icon" aria-label="Previous state" aria-keyshortcuts="K ArrowLeft" disabled={!onPrevious} onClick={onPrevious ?? undefined}>
        <CaretLeftIcon aria-hidden />
      </Button>
      <Button variant="toolbar" size="icon" aria-label="Next state" aria-keyshortcuts="J ArrowRight" disabled={!onNext} onClick={onNext ?? undefined}>
        <CaretRightIcon aria-hidden />
      </Button>
      <ToolbarSeparator />
      <Button variant="toolbar" size="toolbar" aria-pressed={reviewed} aria-keyshortcuts="R" onClick={onToggleReviewed}>
        {reviewed ? <CheckCircleIcon aria-hidden /> : <CircleIcon aria-hidden />}
        <span className="max-sm:sr-only">Mark reviewed</span>
        <Kbd className="max-sm:hidden">R</Kbd>
      </Button>
      <p aria-live="polite" className="sr-only">
        {`${frame.section.title}: ${frame.item.title}${step ? `, ${step}` : ""}. ${reviewed ? "Reviewed." : "Not reviewed."}`}
      </p>
    </ThemeScope>
  );
}
