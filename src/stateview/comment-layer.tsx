"use client";

import { useEffect, useEffectEvent, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { Popover } from "@base-ui/react/popover";
import { Tooltip } from "@base-ui/react/tooltip";
import { ArrowCounterClockwiseIcon, CaretRightIcon, CheckIcon, TrashIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { orderAnnotations, type AnnotatedElement, type Annotation, type AnnotationLayerProps } from "./annotations";
import { describeElement, elementLabel } from "./describe-element";
import { Button, ThemeScope } from "./ui";

/**
 * Stateview's comment engine. In comment mode, pointing at or tabbing to an
 * element inside the screen highlights it; clicking it (or Enter) opens the
 * composer instead of using the element. Saved comments show as numbered pins
 * that stay attached to their element.
 */

type Anchor = Annotation["anchor"];
type Box = { top: number; left: number; width: number; height: number; label: string };
type PinPosition = { left: number; top: number; detached: boolean };

type Composer =
  | { kind: "new"; id: string; element: Element; anchor: Anchor; described: AnnotatedElement; text: string }
  | { kind: "edit"; id: string; text: string };

// Pointer events the screen never sees while comment mode is on.
const BLOCKED_EVENTS = ["pointerdown", "mousedown", "pointerup", "mouseup", "dblclick", "auxclick"] as const;

const TEXT_ENTRY = "input, textarea, select, [contenteditable='true']";

export function CommentLayer({ stateId, inputs, annotations, root, active, onActiveChange, pinsVisible, onAdd, onUpdate, onDelete }: AnnotationLayerProps) {
  const [highlight, setHighlight] = useState<{ element: Element; fromKeyboard: boolean } | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [composer, setComposer] = useState<Composer | null>(null);
  const [positions, setPositions] = useState<Record<string, PinPosition>>({});
  const [announcement, setAnnouncement] = useState("");
  const pins = useRef(new Map<string, HTMLElement>());
  const popup = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const returnFocus = useRef<Element | null>(null);

  const ordered = orderAnnotations(annotations);
  const editing = composer?.kind === "edit" ? ordered.find((a) => a.id === composer.id) : undefined;
  // The element being commented on stays highlighted while the composer is open.
  const target = composer?.kind === "new" ? composer.element : active && !composer ? (highlight?.element ?? null) : null;

  const inScreen = (node: EventTarget | null): node is Element => node instanceof Element && !!root && root.contains(node) && node !== root;

  const show = (element: Element | null, fromKeyboard = false) => {
    setHighlight(element ? { element, fromKeyboard } : null);
    setBox(element ? measureBox(element) : null);
  };

  const pick = (element: Element, anchor: Anchor) => {
    if (!root) return;
    returnFocus.current = document.activeElement;
    show(element);
    setComposer({ kind: "new", id: crypto.randomUUID(), element, anchor, described: describeElement(element, root), text: "" });
  };

  /** A dirty composer shakes instead of losing what the reviewer typed. */
  const shake = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      popup.current?.animate(
        [0, -1, 1, -1, 1, 0].map((step) => ({ translate: `calc(${step} * var(--space-xxs)) 0` })),
        { duration: 300, easing: "ease-out" },
      );
    }
    textarea.current?.focus();
  };

  const isDirty = (current: Composer) => current.text.trim() !== (current.kind === "edit" ? (editing?.note ?? "") : "");

  // --- Picking: pointer and keyboard, only while comment mode is on ---------------------

  const onPointerMove = useEffectEvent((event: PointerEvent) => {
    if (composer) return;
    const element = inScreen(event.target) ? event.target : null;
    if (element !== highlight?.element) show(element);
  });

  const onBlocked = useEffectEvent((event: Event) => {
    if (!inScreen(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
  });

  const onClick = useEffectEvent((event: MouseEvent) => {
    if (!inScreen(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    if (composer && isDirty(composer)) {
      shake();
      return;
    }
    const rect = event.target.getBoundingClientRect();
    pick(event.target, {
      x: rect.width ? clamp((event.clientX - rect.left) / rect.width) : 0,
      y: rect.height ? clamp((event.clientY - rect.top) / rect.height) : 0,
    });
  });

  const onFocusIn = useEffectEvent((event: FocusEvent) => {
    if (!composer && inScreen(event.target)) show(event.target, true);
  });

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (composer || event.isComposing || !root) return;
    if (event.key === "Escape") {
      // Prevented so Stateview's own Escape (back to the hub) doesn't also run.
      event.preventDefault();
      onActiveChange(false);
      return;
    }
    const enter = event.key === "Enter";
    const space = event.key === " " && !(event.target instanceof Element && event.target.matches(TEXT_ENTRY));
    if ((enter || space) && inScreen(event.target)) {
      event.preventDefault();
      event.stopPropagation();
      pick(highlight?.fromKeyboard ? highlight.element : event.target, { x: 0, y: 0 });
      return;
    }
    if (!event.altKey || event.metaKey || event.ctrlKey) return;
    const from = highlight?.element ?? (inScreen(document.activeElement) ? document.activeElement : null);
    const next =
      event.key === "ArrowUp"
        ? from?.parentElement
        : event.key === "ArrowDown"
          ? (from ?? root).firstElementChild
          : event.key === "ArrowLeft"
            ? from?.previousElementSibling
            : event.key === "ArrowRight"
              ? from?.nextElementSibling
              : undefined;
    if (next === undefined) return;
    event.preventDefault();
    if (!next || !inScreen(next)) return;
    next.scrollIntoView({ block: "nearest" });
    show(next, true);
    setAnnouncement(elementLabel(next));
  });

  useEffect(() => {
    if (!active || !root) return;
    const listeners: [string, (event: never) => void][] = [
      ["pointermove", onPointerMove],
      ["click", onClick],
      ["focusin", onFocusIn],
      ["keydown", onKeyDown],
      ...BLOCKED_EVENTS.map((type): [string, (event: Event) => void] => [type, onBlocked]),
    ];
    // Window, capture phase: runs before React's own listeners on the document, so the screen never reacts.
    for (const [type, listener] of listeners) window.addEventListener(type, listener as EventListener, true);
    return () => {
      for (const [type, listener] of listeners) window.removeEventListener(type, listener as EventListener, true);
    };
  }, [active, root]);

  // Keep the highlight on its element while the page scrolls or resizes.
  const remeasureBox = useEffectEvent(() => {
    if (target) setBox(measureBox(target));
  });

  useEffect(() => {
    const listener = () => remeasureBox();
    window.addEventListener("scroll", listener, { capture: true, passive: true });
    window.addEventListener("resize", listener);
    return () => {
      window.removeEventListener("scroll", listener, { capture: true });
      window.removeEventListener("resize", listener);
    };
  }, []);

  // --- Pins: placed in page coordinates, so they scroll with the page for free ------------

  const draft = composer?.kind === "new" ? composer : null;
  const draftId = draft?.id;
  const draftElement = draft?.element;
  const draftAnchor = draft?.anchor;

  useEffect(() => {
    if (!root) return;
    const measure = () => {
      const placed = annotations.map((a) => ({ id: a.id, element: find(root, a.element.selector), anchor: a.anchor }));
      if (draftId && draftElement && draftAnchor) placed.push({ id: draftId, element: draftElement, anchor: draftAnchor });
      setPositions(measurePins(root, placed));
    };
    let frame = requestAnimationFrame(measure);
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(root);
    const mutation = new MutationObserver(schedule);
    mutation.observe(root, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", schedule);
    void document.fonts.ready.then(schedule);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [root, annotations, draftId, draftElement, draftAnchor]);

  // --- Composer ---------------------------------------------------------------------------

  const close = () => {
    setComposer(null);
    show(null);
  };

  const onOpenChange = (open: boolean, details: Popover.Root.ChangeEventDetails) => {
    if (open || !composer) return;
    // Only Escape (or Cancel) throws away what was typed; clicking or tabbing away keeps it.
    if (details.reason !== "escape-key" && isDirty(composer)) {
      shake();
      return;
    }
    close();
  };

  const save = (event: FormEvent | ReactKeyboardEvent) => {
    event.preventDefault();
    if (!composer) return;
    const note = composer.text.trim();
    if (!note) return;
    if (composer.kind === "new") {
      onAdd({
        id: composer.id,
        stateId,
        inputs,
        element: composer.described,
        anchor: composer.anchor,
        note,
        status: "open",
        createdAt: Math.round(performance.timeOrigin + event.timeStamp),
      });
      setAnnouncement(`Comment ${ordered.length + 1} added.`);
    } else if (editing) {
      onUpdate({ ...editing, note });
      setAnnouncement("Comment saved.");
    }
    close();
  };

  const onTextKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) save(event);
  };

  const setStatus = (annotation: Annotation, status: Annotation["status"]) => {
    onUpdate({ ...annotation, status, note: composer?.text.trim() || annotation.note });
    setAnnouncement(status === "resolved" ? "Comment resolved." : "Comment reopened.");
    close();
  };

  const remove = (annotation: Annotation) => {
    onDelete(annotation.id);
    setAnnouncement("Comment deleted.");
    close();
  };

  const subject = composer?.kind === "new" ? composer.described : editing?.element;
  const number = composer?.kind === "new" ? ordered.length + 1 : editing ? ordered.indexOf(editing) + 1 : 0;
  const draftPosition = composer?.kind === "new" ? positions[composer.id] : undefined;

  return (
    <ThemeScope>
      {target && box ? <Highlight box={box} /> : null}

      {pinsVisible
        ? ordered.map((annotation, index) => {
            const position = positions[annotation.id];
            if (!position) return null;
            return (
              <Pin
                key={annotation.id}
                annotation={annotation}
                number={index + 1}
                position={position}
                expanded={composer?.id === annotation.id}
                pinRef={(node) => {
                  if (node) pins.current.set(annotation.id, node);
                  else pins.current.delete(annotation.id);
                }}
                onOpen={() => {
                  returnFocus.current = document.activeElement;
                  show(null);
                  setComposer({ kind: "edit", id: annotation.id, text: annotation.note });
                }}
              />
            );
          })
        : null}

      {composer?.kind === "new" && draftPosition ? (
        <span
          aria-hidden
          ref={(node) => {
            if (node) pins.current.set(composer.id, node);
            else pins.current.delete(composer.id);
          }}
          className={cn(pinClassName, activePin)}
          style={at(draftPosition.left, draftPosition.top)}
        >
          {number}
        </span>
      ) : null}

      <Popover.Root open={composer !== null && subject !== undefined} onOpenChange={onOpenChange}>
        <Popover.Portal>
          <ThemeScope>
            <Popover.Positioner
              anchor={draft ? pointOn(draft.element, draft.anchor) : () => (composer ? (pins.current.get(composer.id) ?? null) : null)}
              side="bottom"
              align="start"
              sideOffset={draft ? 22 : 8}
              collisionPadding={BAR_CLEARANCE}
              className="z-50"
            >
              <Popover.Popup
                ref={popup}
                initialFocus={textarea}
                finalFocus={() => (returnFocus.current instanceof HTMLElement && returnFocus.current.isConnected ? returnFocus.current : true)}
                className="flex w-80 max-w-(--available-width) origin-(--transform-origin) flex-col gap-gui-xs rounded-gui-m bg-gui-neutral-1 p-gui-m shadow-gui-m ring-1 ring-gui-border outline-none transition duration-gui ease-gui data-ending-style:opacity-0 data-starting-style:opacity-0 motion-safe:data-ending-style:scale-(--motion-popup-scale) motion-safe:data-starting-style:scale-(--motion-popup-scale) dark:bg-gui-neutral-2"
              >
                {subject ? (
                  <>
                    <div className="flex min-w-0 flex-col">
                      <Popover.Title className="truncate text-gui-m font-gui-medium">
                        <span className="sr-only">{composer?.kind === "edit" ? `Comment ${number} on ` : "Comment on "}</span>
                        {subject.label}
                      </Popover.Title>
                      {subject.components.length > 0 ? (
                        <p className="truncate font-gui-data text-gui-xs text-gui-neutral-7">{subject.components.join(" › ")}</p>
                      ) : null}
                    </div>
                    <CodeDetails element={subject} />
                    {editing?.status === "resolved" ? <p className="text-gui-s text-gui-neutral-7">Resolved</p> : null}
                    <form onSubmit={save} className="flex flex-col gap-gui-xs">
                      <label htmlFor={`${composer?.id}-note`} className="sr-only">
                        Comment
                      </label>
                      <textarea
                        id={`${composer?.id}-note`}
                        ref={textarea}
                        value={composer?.text ?? ""}
                        onChange={(event) => setComposer((current) => (current ? { ...current, text: event.target.value } : current))}
                        onKeyDown={onTextKeyDown}
                        placeholder="What should change?"
                        rows={3}
                        aria-keyshortcuts="Enter"
                        className="max-h-48 min-h-20 resize-none rounded-gui-s bg-gui-neutral-1 px-gui-s py-gui-xs font-gui-ui text-gui-m text-gui-neutral-10 ring-1 ring-gui-neutral-4 outline-none transition-shadow duration-gui ease-gui field-sizing-content placeholder:text-gui-neutral-6 hover:ring-gui-neutral-5 focus-visible:gui-focus-ring dark:bg-gui-neutral-2"
                      />
                      <div className="flex items-center gap-gui-xxs">
                        {editing ? (
                          <>
                            <Button type="button" variant="ghost" size="icon" aria-label="Delete comment" onClick={() => remove(editing)}>
                              <TrashIcon aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="toolbar"
                              onClick={() => setStatus(editing, editing.status === "open" ? "resolved" : "open")}
                            >
                              {editing.status === "open" ? <CheckIcon aria-hidden /> : <ArrowCounterClockwiseIcon aria-hidden />}
                              {editing.status === "open" ? "Resolve" : "Reopen"}
                            </Button>
                          </>
                        ) : null}
                        <Button type="button" variant="ghost" size="toolbar" className="ml-auto" onClick={close}>
                          Cancel
                        </Button>
                        <Button type="submit" size="toolbar" disabled={!composer?.text.trim()}>
                          {composer?.kind === "edit" ? "Save" : "Add"}
                        </Button>
                      </div>
                    </form>
                  </>
                ) : null}
              </Popover.Popup>
            </Popover.Positioner>
          </ThemeScope>
        </Popover.Portal>
      </Popover.Root>

      <p aria-live="polite" className="sr-only">
        {active ? "Comment mode. Point at or tab to an element, then click it or press Enter. Alt and the arrow keys move to nearby elements. Escape to stop." : ""}
      </p>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </ThemeScope>
  );
}

// Keeps the composer clear of the viewport edges and of the review bar along the bottom.
const BAR_CLEARANCE = { top: 11, right: 11, left: 11, bottom: 72 };

const DOCK_INSET = 22;
const DOCK_GAP = 36;

const pinClassName =
  "absolute top-(--y) left-(--x) z-30 inline-flex size-7 -translate-1/2 items-center justify-center rounded-full font-gui-data text-gui-xs font-gui-medium tabular-nums shadow-gui-s ring-2 ring-gui-neutral-1 select-none motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-50 motion-safe:duration-gui-large motion-safe:ease-gui-large";

// The pin being written or edited: outlined rather than filled, so it stands apart from saved pins.
const activePin = "bg-gui-neutral-1 text-gui-selection inset-ring-2 inset-ring-gui-selection";

function Highlight({ box }: { box: Box }) {
  // Above the element, or inside its top edge when there's no room above.
  const labelBelow = box.top < 30;
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-30 h-(--h) w-(--w) translate-x-(--x) translate-y-(--y) rounded-gui-xs bg-gui-selection-fill ring-2 ring-gui-selection transition-all duration-gui ease-gui motion-reduce:transition-none"
        style={{ ...at(box.left, box.top), "--w": `${box.width}px`, "--h": `${box.height}px` } as CSSProperties}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-30 max-w-xs translate-x-(--x) translate-y-(--y) truncate rounded-gui-s bg-gui-neutral-10 px-gui-xs py-gui-xxs font-gui-data text-gui-xs text-gui-neutral-1 shadow-gui-s transition duration-gui ease-gui motion-reduce:transition-none"
        style={at(Math.max(box.left, 0), labelBelow ? `calc(${box.top + box.height}px + var(--space-xxs))` : `calc(${box.top}px - 100% - var(--space-xxs))`)}
      >
        {box.label}
      </div>
    </>
  );
}

type PinProps = {
  annotation: Annotation;
  number: number;
  position: PinPosition;
  expanded: boolean;
  pinRef: (node: HTMLElement | null) => void;
  onOpen: () => void;
};

function Pin({ annotation, number, position, expanded, pinRef, onOpen }: PinProps) {
  const resolved = annotation.status === "resolved";
  const where = position.detached ? `${annotation.element.label}, not found on this screen` : annotation.element.label;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <button
            ref={pinRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={expanded}
            aria-label={`Comment ${number}${resolved ? ", resolved" : ""} on ${where}: ${annotation.note}`}
            onClick={onOpen}
            className={cn(
              pinClassName,
              "cursor-pointer transition outline-offset-2 hover:scale-110 focus-visible:gui-focus-ring motion-reduce:hover:scale-100",
              expanded
                ? activePin
                : resolved
                  ? "bg-gui-neutral-3 text-gui-neutral-7"
                  : position.detached
                    ? "bg-gui-neutral-1 text-gui-neutral-10 inset-ring-1 inset-ring-gui-neutral-6"
                    : "bg-gui-selection text-gui-selection-foreground",
            )}
            style={at(position.left, position.top)}
          />
        }
      >
        {number}
      </Tooltip.Trigger>
      {expanded ? null : (
        <Tooltip.Portal>
          <ThemeScope>
            <Tooltip.Positioner side="top" sideOffset={6} collisionPadding={11} className="z-50">
              <Tooltip.Popup className="flex max-w-64 origin-(--transform-origin) flex-col rounded-gui-s bg-gui-neutral-10 px-gui-xs py-gui-xxs text-gui-s text-gui-neutral-1 shadow-gui-s transition duration-gui ease-gui data-ending-style:opacity-0 data-starting-style:opacity-0 motion-safe:data-ending-style:scale-(--motion-popup-scale) motion-safe:data-starting-style:scale-(--motion-popup-scale)">
                <span className="truncate font-gui-data text-gui-xs text-gui-neutral-6">{where}</span>
                <span className="line-clamp-3 font-gui-medium">{annotation.note}</span>
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </ThemeScope>
        </Tooltip.Portal>
      )}
    </Tooltip.Root>
  );
}

/** The element's code: where it sits in the React tree, its selector and its HTML. */
function CodeDetails({ element }: { element: AnnotatedElement }) {
  return (
    <Collapsible.Root className="flex flex-col">
      <Collapsible.Trigger className="group flex w-fit items-center gap-gui-xxs rounded-gui-s py-gui-xxs text-gui-s font-gui-medium text-gui-neutral-7 outline-none hover:text-gui-neutral-10 focus-visible:gui-focus-ring">
        <CaretRightIcon aria-hidden className="transition-transform duration-gui ease-gui group-data-panel-open:rotate-90 motion-reduce:transition-none" />
        Code
      </Collapsible.Trigger>
      <Collapsible.Panel className="h-(--collapsible-panel-height) overflow-hidden transition-all duration-gui-large ease-gui-large data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none">
        <dl className="mt-gui-xxs flex flex-col gap-gui-xs rounded-gui-s bg-gui-neutral-2 p-gui-s font-gui-data text-gui-xs text-gui-neutral-8 ring-1 ring-gui-neutral-4-transparent">
          <div className="flex flex-col">
            <dt className="text-gui-neutral-7">Selector</dt>
            <dd className="wrap-anywhere">{element.selector}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-gui-neutral-7">HTML</dt>
            <dd>
              {/* Focusable so a long snippet can be scrolled from the keyboard. */}
              {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable region needs keyboard access */}
              <pre tabIndex={0} className="max-h-32 overflow-auto rounded-gui-xs whitespace-pre-wrap wrap-anywhere outline-none focus-visible:gui-focus-ring">
                {element.html}
              </pre>
            </dd>
          </div>
        </dl>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

/** Pin positions in page coordinates, so pins scroll with the page without being re-measured. */
function measurePins(root: Element, placed: { id: string; element: Element | null; anchor: Anchor }[]) {
  const positions: Record<string, PinPosition> = {};
  const screen = root.getBoundingClientRect();
  let detached = 0;
  for (const { id, element, anchor } of placed) {
    if (element) {
      const rect = element.getBoundingClientRect();
      positions[id] = { left: rect.left + scrollX + anchor.x * rect.width, top: rect.top + scrollY + anchor.y * rect.height, detached: false };
    } else {
      // The element isn't on this screen (removed, or the app changed): dock the pin at the screen's top right.
      positions[id] = { left: screen.right + scrollX - DOCK_INSET, top: screen.top + scrollY + DOCK_INSET + detached++ * DOCK_GAP, detached: true };
    }
  }
  return positions;
}

/** The pin's point on its element, as a zero-size anchor that follows the element. */
function pointOn(element: Element, anchor: Anchor) {
  return {
    contextElement: element,
    getBoundingClientRect() {
      const rect = element.getBoundingClientRect();
      return DOMRect.fromRect({ x: rect.left + anchor.x * rect.width, y: rect.top + anchor.y * rect.height, width: 0, height: 0 });
    },
  };
}

function measureBox(element: Element): Box {
  const rect = element.getBoundingClientRect();
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height, label: elementLabel(element) };
}

/** Position as CSS variables, read by the `left-(--x)` / `translate-x-(--x)` classes. */
function at(x: number, y: number | string) {
  return { "--x": `${x}px`, "--y": typeof y === "number" ? `${y}px` : y } as CSSProperties;
}

function find(root: Element, selector: string) {
  try {
    return root.querySelector(selector);
  } catch {
    return null;
  }
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}
