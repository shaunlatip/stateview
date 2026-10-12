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
  LinkSimpleIcon,
  SidebarSimpleIcon,
  SlidersIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import type { Frame, Inputs } from "./manifest";
import { Logo } from "./logo";
import { Badge, Button, Menu, MenuItem, MenuPopup, MenuTrigger, ThemeScope, ToolbarSeparator, Tooltip, buttonVariants } from "./ui";

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
  panel: { id: string; open: boolean; onToggle: () => void };
  /** Focus returns here when the panel closes from inside. */
  panelTriggerRef: Ref<HTMLButtonElement>;
};

/**
 * The viewer's bar (Graphical Toolbar), across the top of the window in the
 * hub's light scheme, edged so it reads as Stateview's frame around the app
 * rather than part of it. Review tools on the left, the state's title in the
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
      className="fixed inset-x-0 top-0 z-40 flex h-(--viewer-bar) items-center gap-gui-xxs bg-gui-toolbar p-gui-xxs text-gui-neutral-10 shadow-gui-s ring-1 ring-gui-neutral-4-transparent"
    >
      <Tooltip label="All states" shortcut="Esc" side="bottom">
        <Link href={hubHref} scroll={false} aria-label="All states" aria-keyshortcuts="Escape" className={buttonVariants({ variant: "toolbar", size: "icon" })}>
          {/* Fills the control's content box, so its left edge is the bar's XXS padding plus the control's XS: the filmstrip's inset. */}
          <Logo className="h-auto w-(--line-m)" />
        </Link>
      </Tooltip>
      <Tooltip label={strip.open ? "Hide states" : "Show states"} side="bottom">
        <Button variant="toolbar" size="icon" aria-label="States" aria-expanded={strip.open} aria-controls={strip.id} onClick={strip.onToggle}>
          <SidebarSimpleIcon aria-hidden />
        </Button>
      </Tooltip>
      {/* A split button: Comment, and joined to it a caret for the comment actions. */}
      <div className="flex">
        <Tooltip label="Comment" shortcut="C" side="bottom">
          <Button
            variant="toolbar"
            size={commentCount > 0 ? "toolbar" : "icon"}
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
        <ToolbarSeparator />
        <Menu open={menuOpen} onOpenChange={setMenuOpen}>
          <Tooltip label="Comment options" side="bottom">
            <MenuTrigger
              render={
                <Button variant="toolbar" size="toolbar" aria-label="Comment options" className="w-6 rounded-l-none px-0">
                  <CaretDownIcon aria-hidden className="text-gui-xs" />
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
              Copy comments for your agent
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
          size="icon"
          aria-label="State"
          aria-keyshortcuts="S"
          aria-expanded={panel.open}
          aria-controls={panel.open ? panel.id : undefined}
          onClick={panel.onToggle}
        >
          <SlidersIcon aria-hidden />
        </Button>
      </Tooltip>
      <ToolbarSeparator />
      <Tooltip label="Previous state" shortcut="J" side="bottom">
        <Button variant="toolbar" size="icon" aria-label="Previous state" aria-keyshortcuts="J ArrowLeft" focusableWhenDisabled disabled={!onPrevious} onClick={onPrevious ?? undefined}>
          <CaretLeftIcon aria-hidden />
        </Button>
      </Tooltip>
      <Tooltip label="Next state" shortcut="K" side="bottom">
        <Button variant="toolbar" size="icon" aria-label="Next state" aria-keyshortcuts="K ArrowRight" focusableWhenDisabled disabled={!onNext} onClick={onNext ?? undefined}>
          <CaretRightIcon aria-hidden />
        </Button>
      </Tooltip>
      <p aria-live="polite" className="sr-only">
        {`${frame.section.title}, ${position} of ${total}: ${frame.item.title}${step ? `, ${step}` : ""}`}
      </p>
    </ThemeScope>
  );
}
