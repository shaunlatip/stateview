import { useRef, type KeyboardEvent } from "react";
import { cn } from "../../cn";

export type TabItem<V extends string> = { value: V; label: string; disabled?: boolean; title?: string };

/**
 * The app's Tabs (ui/tabs.tsx): a 36px elevated well with the active trigger
 * lifted onto the canvas. Arrow keys move between enabled tabs, as Radix does.
 */
export function SlTabs<V extends string>({
  items,
  value,
  onValueChange,
  label,
  tourId,
}: {
  items: TabItem<V>[];
  value: V;
  onValueChange: (value: V) => void;
  label: string;
  /** data-tour anchor for the onboarding tour. */
  tourId?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const enabled = items.map((item, i) => (item.disabled ? -1 : i)).filter((i) => i >= 0);
    const at = enabled.indexOf(items.findIndex((item) => item.value === value));
    let next = at;
    if (e.key === "ArrowRight") next = (at + 1) % enabled.length;
    if (e.key === "ArrowLeft") next = (at - 1 + enabled.length) % enabled.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = enabled.length - 1;
    const index = enabled[next];
    onValueChange(items[index].value);
    refs.current[index]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      data-tour={tourId}
      className="inline-flex h-9 w-full items-center justify-center rounded-sl-card bg-sl-elevated p-1 text-sl-text-2"
    >
      {items.map((item, i) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={item.disabled}
            title={item.title}
            onClick={() => onValueChange(item.value)}
            onKeyDown={onKeyDown}
            className={cn(
              "inline-flex flex-1 cursor-pointer items-center justify-center whitespace-nowrap rounded-sl-control px-3 py-1 text-sl-sm font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sl-text-2 focus-visible:ring-offset-2 focus-visible:ring-offset-sl-canvas",
              "disabled:pointer-events-none disabled:opacity-50",
              active ? "bg-sl-canvas text-sl-text shadow-sm" : "hover:text-sl-text",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
