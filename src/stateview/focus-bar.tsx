"use client";

import Link from "next/link";
import { ArrowLeft, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import type { Frame, Inputs } from "./manifest";

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

/** Floating review controls. Overlaid rather than framed, so the app keeps its full width. */
export function FocusBar<T extends Inputs>({ frame, position, total, reviewed, hubHref, onPrevious, onNext, onToggleReviewed }: FocusBarProps<T>) {
  const step = frame.step ? `Step ${frame.step} of ${frame.stepCount}: ${frame.stepTitle}` : null;
  return (
    <aside
      aria-label="Review"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-sm:right-18 flex max-w-2xl items-center gap-1 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 sm:gap-2"
    >
      <Link href={hubHref} aria-keyshortcuts="Escape" className={buttonVariants({ variant: "ghost" })}>
        <ArrowLeft aria-hidden />
        <span className="max-sm:sr-only">Hub</span>
        <Kbd aria-hidden className="max-sm:hidden">
          Esc
        </Kbd>
      </Link>
      <Separator orientation="vertical" className="h-6" />
      <div className="flex min-w-0 flex-1 flex-col px-1">
        <p className="truncate text-xs text-muted-foreground tabular-nums">
          {frame.section.title} · {position} of {total}
        </p>
        <p className="truncate text-sm font-medium">
          {frame.item.title}
          {step ? <span className="font-normal text-muted-foreground"> · {step}</span> : null}
        </p>
      </div>
      <div className="flex items-center">
        <Button type="button" variant="ghost" size="icon" aria-label="Previous state" aria-keyshortcuts="K ArrowLeft" disabled={!onPrevious} onClick={onPrevious ?? undefined}>
          <ChevronLeft aria-hidden />
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Next state" aria-keyshortcuts="J ArrowRight" disabled={!onNext} onClick={onNext ?? undefined}>
          <ChevronRight aria-hidden />
        </Button>
      </div>
      <Button type="button" variant={reviewed ? "default" : "outline"} aria-keyshortcuts="R" onClick={onToggleReviewed}>
        <Check aria-hidden />
        <span className="max-sm:sr-only">{reviewed ? "Reviewed" : "Mark reviewed"}</span>
        <Kbd aria-hidden className="max-sm:hidden">
          R
        </Kbd>
      </Button>
      <p aria-live="polite" className="sr-only">
        {`${frame.section.title}: ${frame.item.title}${step ? `, ${step}` : ""}. ${reviewed ? "Reviewed." : "Not reviewed."}`}
      </p>
    </aside>
  );
}
