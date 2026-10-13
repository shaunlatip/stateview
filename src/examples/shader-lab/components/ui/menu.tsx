import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../../cn";

/**
 * The split button's dropdown (shadcn DropdownMenu, align end, 4px offset,
 * w-64) without a portal, so it stays inside the frame. Opening it from the
 * keyboard or mouse moves focus to the first item; Escape, Tab and an outside
 * click close it, and focus goes back to the trigger.
 */
export function SlMenu({
  open,
  onOpenChange,
  focusOnOpen,
  renderTrigger,
  children,
  label,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** False when the menu starts open from a seeded state, so it never steals focus from the page. */
  focusOnOpen: boolean;
  renderTrigger: (props: { "aria-haspopup": "menu"; "aria-expanded": boolean; onClick: () => void }) => ReactNode;
  children: ReactNode;
  label: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const focusTrigger = () => wrapRef.current?.querySelector<HTMLElement>('[aria-haspopup="menu"]')?.focus();

  useEffect(() => {
    if (!open) return;
    if (focusOnOpen) menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) onOpenChange(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, focusOnOpen, onOpenChange]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      onOpenChange(false);
      focusTrigger();
    } else if (e.key === "Tab") {
      onOpenChange(false);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = e.key === "ArrowDown" ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
      items[next]?.focus();
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      {renderTrigger({
        "aria-haspopup": "menu",
        "aria-expanded": open,
        onClick: () => onOpenChange(!open),
      })}
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className={cn(
            "absolute top-full right-0 z-50 mt-1 w-64 min-w-32 overflow-hidden rounded-sl-card border border-sl-border bg-sl-canvas p-1 font-sl-lab text-sl-text shadow-md",
            "origin-top-right animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function SlMenuItem({ onSelect, children }: { onSelect: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      onClick={onSelect}
      className="relative flex w-full cursor-pointer items-center gap-2 rounded-[4px] px-2 py-1.5 text-left text-sl-sm text-sl-text outline-hidden select-none hover:bg-sl-inverted/10 focus:bg-sl-inverted/10"
    >
      {children}
    </button>
  );
}
