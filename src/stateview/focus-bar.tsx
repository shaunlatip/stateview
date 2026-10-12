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
  /** Changes whenever the reviewer does something worth showing the bar for (new state, new comment). */
  activity: string;
};

/**
 * Floating review controls (Graphical Toolbar). Overlaid rather than framed,
 * so the app keeps its full width. Takes the scheme opposite the content
 * behind it, so it stays distinct from any app. Out of the way until it's
 * needed: it shows on any review action or when the pointer nears the bottom
 * of the window, and tucks away again after six idle seconds.
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
  activity,
}: FocusBarProps<T>) {
  const ref = useRef<HTMLElement>(null);
  const scheme = useBackdropScheme(ref);
  const [menuOpen, setMenuOpen] = useState(false);
  // Comment mode needs its indicator in view, and an open menu needs its trigger.
  const { shown, instant } = useAutoHide(ref, activity, commenting || menuOpen);
  const step = frame.step ? `Step ${frame.step} of ${frame.stepCount}: ${frame.stepTitle}` : null;
  // The pins toggle names the action it takes, with the matching icon.
  const pins = pinsVisible ? { label: "Hide pins", icon: <EyeSlashIcon aria-hidden /> } : { label: "Show pins", icon: <EyeIcon aria-hidden /> };
  return (
    <ThemeScope
      as="aside"
      ref={ref}
      aria-label="Review"
      data-shown={shown || undefined}
      className={cn(
        // Hidden: slid down and faded, and out of the pointer's way. Keyboard focus still reaches it and brings it back.
        "group/bar pointer-events-none fixed inset-x-gui-s bottom-gui-s z-40 mx-auto max-w-2xl translate-y-full opacity-0 transition duration-gui ease-gui focus-within:pointer-events-auto focus-within:translate-y-0 focus-within:opacity-100 data-shown:pointer-events-auto data-shown:translate-y-0 data-shown:opacity-100 motion-reduce:translate-y-0",
        // A keyboard action shows it at once: animating something pressed this often makes it feel slow.
        instant && "transition-none",
        // On phones in development, sit above the Agentation button in the corner rather than narrowing beside it.
        process.env.NODE_ENV === "development" && "max-sm:bottom-18",
        scheme === "dark" && "dark",
      )}
    >
      <div className="relative">
        <div className="relative flex items-center gap-gui-xxs rounded-gui-m bg-gui-toolbar p-gui-xxs shadow-gui-s ring-1 ring-gui-neutral-4-transparent">
          <Tooltip label="All states" shortcut="Esc">
            <Link href={hubHref} scroll={false} aria-label="All states" aria-keyshortcuts="Escape" className={buttonVariants({ variant: "toolbar", size: "icon" })}>
              <SquaresFourIcon aria-hidden />
            </Link>
          </Tooltip>
          {/* Wraps rather than truncates: on a phone the step drops below the title. */}
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-gui-s gap-y-gui-xxs px-gui-xs py-gui-xxs">
            {/* The section is the header: secondary, above the state's title. */}
            <div className="flex min-w-0 flex-col wrap-break-word">
              <p className="text-gui-xs text-gui-neutral-7">{frame.section.title}</p>
              <p className="text-gui-m font-gui-medium">{frame.item.title}</p>
            </div>
            {frame.step ? (
              <p className="flex min-w-0 flex-wrap items-center gap-gui-xs text-gui-s text-gui-neutral-7 wrap-break-word">
                <span className="sr-only">{`Step ${frame.step} of ${frame.stepCount}:`}</span>
                {frame.stepTitle}
                <Badge aria-hidden className="tabular-nums">{`${frame.step}/${frame.stepCount}`}</Badge>
              </p>
            ) : null}
          </div>
          <ToolbarSeparator />
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
          <Menu open={menuOpen} onOpenChange={setMenuOpen}>
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
          <Tooltip label="Previous state" shortcut="J">
            <Button variant="toolbar" size="icon" aria-label="Previous state" aria-keyshortcuts="J ArrowLeft" focusableWhenDisabled disabled={!onPrevious} onClick={onPrevious ?? undefined}>
              <CaretLeftIcon aria-hidden />
            </Button>
          </Tooltip>
          <Tooltip label="Next state" shortcut="K">
            <Button variant="toolbar" size="icon" aria-label="Next state" aria-keyshortcuts="K ArrowRight" focusableWhenDisabled disabled={!onNext} onClick={onNext ?? undefined}>
              <CaretRightIcon aria-hidden />
            </Button>
          </Tooltip>
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {`${frame.section.title}, ${position} of ${total}: ${frame.item.title}${step ? `, ${step}` : ""}`}
      </p>
    </ThemeScope>
  );
}

// How long the bar stays up after the last action, and how close to the bottom of the window brings it back.
const IDLE_MS = 6000;
const BOTTOM_ZONE_PX = 112;

const TEXT_ENTRY = "input, textarea, select, [contenteditable='true']";

/**
 * Shows the element after any action (a key outside a text field, or a change
 * to `activity`) or while the pointer is in the bottom band of the window, and
 * hides it once both have gone quiet. `instant` is true when a key brought it
 * back, so it can appear without a transition.
 */
function useAutoHide(ref: RefObject<HTMLElement | null>, activity: string, pinned: boolean) {
  const [presses, setPresses] = useState(0);
  const [instant, setInstant] = useState(false);
  const [near, setNear] = useState(false);
  // The action that has since gone idle. The bar is awake while the latest action isn't it.
  const [idleAfter, setIdleAfter] = useState<string | null>(null);
  const latest = `${activity}:${presses}`;

  useEffect(() => {
    const timer = setTimeout(() => setIdleAfter(latest), IDLE_MS);
    return () => clearTimeout(timer);
  }, [latest]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Shift" || event.key === "Meta" || event.key === "Control" || event.key === "Alt") return;
      if (event.target instanceof Element && event.target.closest(TEXT_ENTRY)) return;
      setInstant(true);
      setPresses((count) => count + 1);
    };
    const onPointer = (event: PointerEvent) => {
      const rect = ref.current?.getBoundingClientRect();
      const overBar = !!rect && event.clientY >= rect.top && event.clientX >= rect.left && event.clientX <= rect.right;
      const isNear = event.clientY >= window.innerHeight - BOTTOM_ZONE_PX || overBar;
      setNear(isNear);
      if (isNear) setInstant(false);
    };
    // The pointer leaving the window counts as moving away.
    const onLeave = (event: MouseEvent) => {
      if (!event.relatedTarget) setNear(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });
    document.addEventListener("mouseout", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("mouseout", onLeave);
    };
  }, [ref]);

  return { shown: pinned || near || idleAfter !== latest, instant };
}
