"use client";

import Link from "next/link";
import { useState, type Ref } from "react";
import {
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ChatCircleIcon,
  CopyIcon,
  EyeIcon,
  EyeSlashIcon,
  FilmStripIcon,
  LinkSimpleIcon,
  SlidersIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import type { Frame, Inputs } from "./manifest";
import { Logo } from "./logo";
import { Badge, Button, Menu, MenuItem, MenuPopup, MenuTrigger, ThemeScope, ToolbarSeparator, Tooltip, TooltipGroup, buttonVariants } from "./ui";

type FocusBarProps<T extends Inputs> = {
  frame: Frame<T>;
  /** 1-based position among all frames. */
  position: number;
  total: number;
  hubHref: string;
  onPrevious: (() => void) | null;
  onNext: (() => void) | null;
  /** The filmstrip this bar shows and hides. */
  strip: { id: string; open: boolean; onToggle: () => void };
  /** Focus returns here when the strip closes from inside. */
  stripTriggerRef: Ref<HTMLButtonElement>;
  /** Comment mode: picking an element comments on it. */
  commenting: boolean;
  onToggleCommenting: () => void;
  /** Open comments in this state. */
  commentCount: number;
  pinsVisible: boolean;
  onTogglePins: () => void;
  /** Null when there's nothing to copy. */
  onCopyComments: (() => void) | null;
  onCopyLink: () => void;
  /** Null when there's nothing to delete. */
  onDeleteComments: (() => void) | null;
  /** The state panel this bar opens and closes. */
  panel: { id: string; open: boolean; onToggle: (fromKeyboard: boolean) => void };
  /** Focus returns here when the panel closes from inside. */
  panelTriggerRef: Ref<HTMLButtonElement>;
};

/**
 * The viewer's bar (Graphical Toolbar), across the top of the window in the
 * hub's light scheme. A divider along its bottom edge, not a shadow, sets it
 * apart from the app as Stateview's frame, and meets the filmstrip's edge. Review tools on the left, the state's title in the
 * middle, the state panel and stepping between states on the right.
 */
export function FocusBar<T extends Inputs>({
  frame,
  position,
  total,
  hubHref,
  onPrevious,
  onNext,
  strip,
  stripTriggerRef,
  commenting,
  onToggleCommenting,
  commentCount,
  pinsVisible,
  onTogglePins,
  onCopyComments,
  onCopyLink,
  onDeleteComments,
  panel,
  panelTriggerRef,
}: FocusBarProps<T>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const step = frame.step ? `Step ${frame.step} of ${frame.stepCount}: ${frame.stepTitle}` : null;
  // The pins toggle names the action it takes, with the matching icon.
  const pins = pinsVisible ? { label: "Hide pins", icon: <EyeSlashIcon aria-hidden /> } : { label: "Show pins", icon: <EyeIcon aria-hidden /> };
  return (
    <ThemeScope
      as="header"
      aria-label="Review"
      className="fixed inset-x-0 top-0 z-40 flex h-(--viewer-bar) items-center gap-gui-xxs bg-gui-toolbar px-gui-xs py-gui-xxs text-gui-neutral-10 gui-divider-bottom"
    >
      {/* The bar's tooltips open over the top of the app, and the reviewer crosses the bar all the time, so they wait for the pointer to rest. */}
      <TooltipGroup>
        <Tooltip label="All states" shortcut="Esc" side="bottom">
          <Link href={hubHref} scroll={false} aria-label="All states" aria-keyshortcuts="Escape" className={buttonVariants({ variant: "toolbar", size: "bar" })}>
            {/* Centred in the 32px control, so its left edge is the bar's XS padding plus 4.5px: within half a pixel of the filmstrip's inset. */}
            <Logo className="h-auto w-(--line-m)" />
          </Link>
        </Tooltip>
        {/* Named for its letter: S is the state panel's, so the strip is the filmstrip, on F. */}
        <Tooltip label={strip.open ? "Hide filmstrip" : "Show filmstrip"} shortcut="F" side="bottom">
          <Button
            ref={stripTriggerRef}
            variant="toolbar"
            size="bar"
            aria-label="Filmstrip"
            aria-keyshortcuts="F"
            aria-expanded={strip.open}
            aria-controls={strip.id}
            onClick={strip.onToggle}
          >
            {/* Turned upright: the strip runs down the left edge, its frames stacked. */}
            <FilmStripIcon aria-hidden className="rotate-90" />
          </Button>
        </Tooltip>
        {/*
         * A split button: Comment, and joined to it a caret for the comment
         * actions. One edge around both halves so they read as one control, the
         * caret as its second part. The edge is drawn over the halves' hover and
         * pressed fills, so it stays unbroken.
         */}
        <div className="relative flex rounded-gui-s after:pointer-events-none after:absolute after:inset-0 after:rounded-gui-s after:inset-ring after:inset-ring-gui-neutral-4">
          <Tooltip label="Comment" shortcut="C" side="bottom">
            <Button
              variant="toolbar"
              size={commentCount > 0 ? "bar-text" : "bar"}
              aria-label={commentCount > 0 ? `Comment, ${commentCount} open` : "Comment"}
              aria-pressed={commenting}
              aria-keyshortcuts="C"
              onClick={onToggleCommenting}
              className="rounded-r-none"
            >
              <ChatCircleIcon aria-hidden />
              {commentCount > 0 ? (
                <Badge variant="strong" aria-hidden className="tabular-nums">
                  {commentCount}
                </Badge>
              ) : null}
            </Button>
          </Tooltip>
          {/* Full height, so it meets the edge and splits the frame. */}
          <ToolbarSeparator className="my-0" />
          <Menu open={menuOpen} onOpenChange={setMenuOpen}>
            <Tooltip label="Comment options" side="bottom">
              <MenuTrigger
                render={
                  <Button variant="toolbar" size="bar-text" aria-label="Comment options" className="w-6 rounded-l-none px-0">
                    <CaretDownIcon aria-hidden weight="regular" className="text-gui-s" />
                  </Button>
                }
              />
            </Tooltip>
            <MenuPopup side="bottom" align="start">
              <MenuItem onClick={onTogglePins}>
                {pins.icon}
                {pins.label}
              </MenuItem>
              <MenuItem disabled={!onCopyComments} onClick={onCopyComments ?? undefined}>
                <CopyIcon aria-hidden />
                Copy this state’s comments for your agent
              </MenuItem>
              <MenuItem onClick={onCopyLink}>
                <LinkSimpleIcon aria-hidden />
                Copy link to this state
              </MenuItem>
              <MenuItem disabled={!onDeleteComments} onClick={onDeleteComments ?? undefined}>
                <TrashIcon aria-hidden />
                Delete all comments in this state
              </MenuItem>
            </MenuPopup>
          </Menu>
        </div>

        {/* One line, centred; the step title truncates first, then the state's, rather than growing the bar. */}
        <p className="flex min-w-0 flex-1 items-center justify-center gap-gui-xs px-gui-xs whitespace-nowrap">
          <span className="min-w-0 truncate font-gui-medium">{frame.item.title}</span>
          {frame.step ? (
            <>
              <Badge className="font-gui-data tabular-nums">{`${frame.step}/${frame.stepCount}`}</Badge>
              <span className="min-w-0 shrink-1000 truncate text-gui-neutral-7">{frame.stepTitle}</span>
            </>
          ) : null}
        </p>

        <Tooltip label={panel.open ? "Hide state" : "Show state"} shortcut="S" side="bottom">
          <Button
            ref={panelTriggerRef}
            variant="toolbar"
            size="bar"
            aria-label="State"
            aria-keyshortcuts="S"
            aria-expanded={panel.open}
            aria-controls={panel.id}
            // Enter and Space click with no pointer (detail 0): opened that way, the panel takes focus, as it does from S.
            onClick={(event) => panel.onToggle(event.detail === 0)}
          >
            <SlidersIcon aria-hidden />
          </Button>
        </Tooltip>
        <ToolbarSeparator />
        <Tooltip label="Previous state" shortcut="J" side="bottom">
          <Button variant="toolbar" size="bar" aria-label="Previous state" aria-keyshortcuts="J ArrowLeft" focusableWhenDisabled disabled={!onPrevious} onClick={onPrevious ?? undefined}>
            <CaretLeftIcon aria-hidden />
          </Button>
        </Tooltip>
        <Tooltip label="Next state" shortcut="K" side="bottom">
          <Button variant="toolbar" size="bar" aria-label="Next state" aria-keyshortcuts="K ArrowRight" focusableWhenDisabled disabled={!onNext} onClick={onNext ?? undefined}>
            <CaretRightIcon aria-hidden />
          </Button>
        </Tooltip>
        <p aria-live="polite" className="sr-only">
          {`${frame.section.title}, ${position} of ${total}: ${frame.item.title}${step ? `, ${step}` : ""}`}
        </p>
      </TooltipGroup>
    </ThemeScope>
  );
}
