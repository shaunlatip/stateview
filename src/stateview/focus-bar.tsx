"use client";

import Link from "next/link";
import { useRef } from "react";
import { CaretLeftIcon, CaretRightIcon, ChatCircleIcon, CopyIcon, DotsThreeIcon, EyeIcon, EyeSlashIcon, SquaresFourIcon, TrashIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { Frame, Inputs } from "./manifest";
import { Badge, Button, IconButton, Menu, MenuItem, MenuPopup, MenuTrigger, ThemeScope, Tooltip, buttonVariants } from "./ui";
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
  const step = frame.step ? `Step ${frame.step} of ${frame.stepCount}: ${frame.stepTitle}` : null;
  // The pins toggle names the action it takes, with the matching icon.
  const pins = pinsVisible ? { label: "Hide pins", icon: <EyeSlashIcon aria-hidden /> } : { label: "Show pins", icon: <EyeIcon aria-hidden /> };
  const copyLabel = "Copy comments for your agent";
  const deleteLabel = "Delete all comments in this state";
  return (
    <ThemeScope
      as="aside"
      ref={ref}
      aria-label="Review"
      className={cn(
        "fixed inset-x-gui-s bottom-gui-s z-40 mx-auto flex max-w-2xl items-center gap-gui-xxs rounded-gui-m bg-gui-toolbar p-gui-xxs shadow-gui-s ring-1 ring-gui-neutral-4-transparent transition duration-gui-large ease-gui-large motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-reduce:transition-none",
        // Room for the development-only Agentation button in the corner.
        process.env.NODE_ENV === "development" && "max-sm:right-18",
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
      <IconButton label={pins.label} className="max-sm:hidden" onClick={onTogglePins}>
        {pins.icon}
      </IconButton>
      <IconButton label={copyLabel} className="max-sm:hidden" focusableWhenDisabled disabled={!onCopyComments} onClick={onCopyComments ?? undefined}>
        <CopyIcon aria-hidden />
      </IconButton>
      <IconButton label={deleteLabel} className="max-sm:hidden" focusableWhenDisabled disabled={!onDeleteComments} onClick={onDeleteComments ?? undefined}>
        <TrashIcon aria-hidden />
      </IconButton>
      {/* Narrow screens fold the secondary comment actions into one menu. */}
      <Menu>
        <MenuTrigger
          render={
            <IconButton label="More comment actions" className="sm:hidden">
              <DotsThreeIcon aria-hidden />
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
            {copyLabel}
          </MenuItem>
          <MenuItem disabled={!onDeleteComments} onClick={onDeleteComments ?? undefined}>
            <TrashIcon aria-hidden />
            {deleteLabel}
          </MenuItem>
        </MenuPopup>
      </Menu>
      <p aria-live="polite" className="sr-only">
        {`${frame.section.title}: ${frame.item.title}${step ? `, ${step}` : ""}`}
      </p>
    </ThemeScope>
  );
}
