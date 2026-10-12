"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import { CaretLeftIcon, CaretRightIcon, ChatCircleIcon, CopyIcon, DotsThreeVerticalIcon, EyeIcon, EyeSlashIcon, SquaresFourIcon, TrashIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { Frame, Inputs } from "./manifest";
import { Badge, Button, IconButton, Menu, MenuItem, MenuPopup, MenuTrigger, ThemeScope, ToolbarSeparator, Tooltip, buttonVariants } from "./ui";
import { useBackdropScheme } from "./use-backdrop-scheme";

type FocusBarProps<T extends Inputs> = {
  frame: Frame<T>;
  /** 1-based position among all frames. */
  position: number;
  total: number;
  hubHref: string;
  onPrevious: (() => void) | null;
  onNext: (() => void) | null;
  /** Comment mode: picking an element comments on it. */
  commenting: boolean;
  onToggleCommenting: () => void;
  /** Open comments in this state. */
  commentCount: number;
  pinsVisible: boolean;
  onTogglePins: () => void;
  /** Null when there's nothing to copy. */
  onCopyComments: (() => void) | null;
  /** Null when there's nothing to delete. */
  onDeleteComments: (() => void) | null;
};

/**
 * Floating review controls (Graphical Toolbar). Overlaid rather than framed,
 * so the app keeps its full width. Takes the scheme opposite the content
 * behind it, so it stays distinct from any app.
 */
export function FocusBar<T extends Inputs>({
  frame,
  position,
  total,
  hubHref,
  onPrevious,
  onNext,
  commenting,
  onToggleCommenting,
  commentCount,
  pinsVisible,
  onTogglePins,
  onCopyComments,
  onDeleteComments,
}: FocusBarProps<T>) {
  const ref = useRef<HTMLElement>(null);
  const scheme = useBackdropScheme(ref);
  const near = usePointerNear(ref);
  const step = frame.step ? `Step ${frame.step} of ${frame.stepCount}: ${frame.stepTitle}` : null;
  // The pins toggle names the action it takes, with the matching icon.
  const pins = pinsVisible ? { label: "Hide pins", icon: <EyeSlashIcon aria-hidden /> } : { label: "Show pins", icon: <EyeIcon aria-hidden /> };
  return (
    <ThemeScope
      as="aside"
      ref={ref}
      aria-label="Review"
      data-reveal={near || undefined}
      className={cn(
        "group/bar fixed inset-x-gui-s bottom-gui-s z-40 mx-auto max-w-2xl",
        // Room for the development-only Agentation button in the corner.
        process.env.NODE_ENV === "development" && "max-sm:right-18",
        scheme === "dark" && "dark",
      )}
    >
      {/*
       * Where this state sits in the review. Tucked behind the bar and slid out when
       * the pointer comes near or focus moves into the bar; its bottom runs under the
       * bar so the two join. Quick in, gone at once. Screen readers get it from the
       * live region below.
       */}
      <p
        aria-hidden
        className="pointer-events-none absolute inset-x-gui-m bottom-full -mb-gui-m flex translate-y-full justify-between gap-gui-s rounded-t-gui-m bg-gui-neutral-4 px-gui-m pt-gui-xs pb-gui-l text-gui-xs text-gui-neutral-8 tabular-nums opacity-0 transition-none group-focus-within/bar:translate-y-0 group-focus-within/bar:opacity-100 group-focus-within/bar:transition group-focus-within/bar:duration-gui group-focus-within/bar:ease-gui group-data-reveal/bar:translate-y-0 group-data-reveal/bar:opacity-100 group-data-reveal/bar:transition group-data-reveal/bar:duration-gui group-data-reveal/bar:ease-gui motion-reduce:translate-y-0"
      >
        <span className="truncate font-gui-medium">{frame.section.title}</span>
        <span className="shrink-0">
          {position} of {total}
        </span>
      </p>
      <div className="relative flex items-center gap-gui-xxs rounded-gui-m bg-gui-toolbar p-gui-xxs shadow-gui-s ring-1 ring-gui-neutral-4-transparent transition duration-gui-large ease-gui-large motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-reduce:transition-none">
        <Tooltip label="All states" shortcut="Esc">
          <Link href={hubHref} aria-label="All states" aria-keyshortcuts="Escape" className={buttonVariants({ variant: "toolbar", size: "icon" })}>
            <SquaresFourIcon aria-hidden />
          </Link>
        </Tooltip>
        {/* Wraps rather than truncates: on a phone the step drops below the title. */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-gui-s gap-y-gui-xxs px-gui-xs py-gui-xxs">
          <p className="min-w-0 text-gui-m font-gui-medium">{frame.item.title}</p>
          {frame.step ? (
            <p className="flex items-center gap-gui-xs text-gui-s text-gui-neutral-7">
              <Badge className="tabular-nums">
                <span aria-hidden>{`${frame.step}/${frame.stepCount}`}</span>
                <span className="sr-only">{`Step ${frame.step} of ${frame.stepCount}:`}</span>
              </Badge>
              <ToolbarSeparator />
              {frame.stepTitle}
            </p>
          ) : null}
        </div>
        <Tooltip label="Comment" shortcut="C">
          <Button
            variant="toolbar"
            size={commentCount > 0 ? "toolbar" : "icon"}
            aria-label={commentCount > 0 ? `Comment, ${commentCount} open` : "Comment"}
            aria-pressed={commenting}
            aria-keyshortcuts="C"
            onClick={onToggleCommenting}
          >
            <ChatCircleIcon aria-hidden />
            {commentCount > 0 ? (
              <Badge variant="strong" aria-hidden className="tabular-nums">
                {commentCount}
              </Badge>
            ) : null}
          </Button>
        </Tooltip>
        <Menu>
          <MenuTrigger
            render={
              <IconButton label="More comment actions">
                <DotsThreeVerticalIcon aria-hidden />
              </IconButton>
            }
          />
          <MenuPopup>
            <MenuItem onClick={onTogglePins}>
              {pins.icon}
              {pins.label}
            </MenuItem>
            <MenuItem disabled={!onCopyComments} onClick={onCopyComments ?? undefined}>
              <CopyIcon aria-hidden />
              Copy comments for your agent
            </MenuItem>
            <MenuItem disabled={!onDeleteComments} onClick={onDeleteComments ?? undefined}>
              <TrashIcon aria-hidden />
              Delete all comments in this state
            </MenuItem>
          </MenuPopup>
        </Menu>
        <ToolbarSeparator />
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
      </div>
      <p aria-live="polite" className="sr-only">
        {`${frame.section.title}, ${position} of ${total}: ${frame.item.title}${step ? `, ${step}` : ""}`}
      </p>
    </ThemeScope>
  );
}

// How far around the bar the pointer counts as near it: generous to the sides and
// above, where the section tab slides out, so the reveal isn't a precise target.
const NEAR = { x: 64, above: 96, below: 24 };

/**
 * Whether the pointer is over or near the element. Measured from pointer moves
 * rather than a larger invisible hit area, so the page around the bar still
 * takes clicks.
 */
function usePointerNear(ref: RefObject<HTMLElement | null>) {
  const [near, setNear] = useState(false);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      setNear(
        event.clientX >= rect.left - NEAR.x &&
          event.clientX <= rect.right + NEAR.x &&
          event.clientY >= rect.top - NEAR.above &&
          event.clientY <= rect.bottom + NEAR.below,
      );
    };
    // The pointer leaving the window counts as moving away.
    const onLeave = (event: MouseEvent) => {
      if (!event.relatedTarget) setNear(false);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseout", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseout", onLeave);
    };
  }, [ref]);

  return near;
}
