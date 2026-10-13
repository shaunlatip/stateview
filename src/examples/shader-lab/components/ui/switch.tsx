import { cn } from "../../cn";

/**
 * The app's Switch (ui/switch.tsx): the design system's neutrals instead of
 * shadcn's primary — ink when on, border-strong when off, and a thumb that
 * flips light ↔ dark to stay high-contrast on either track.
 */
export function SlSwitch({
  checked,
  onCheckedChange,
  label,
  labelledBy,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  labelledBy?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-labelledby={labelledBy}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "peer inline-flex h-[1.15rem] w-8 shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-xs outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-sl-text-2",
        checked ? "bg-sl-text" : "bg-sl-border-strong",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none block size-4 rounded-full ring-0 transition-transform duration-150 ease-out",
          checked ? "translate-x-[calc(100%-2px)] bg-sl-canvas" : "translate-x-0 bg-sl-text",
        )}
      />
    </button>
  );
}
