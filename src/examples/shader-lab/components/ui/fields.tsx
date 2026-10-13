import type { ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../cn";

/** The app's Input (ui/input.tsx) at the lab's h-8 / text-xs size. */
export function SlInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-8 w-full min-w-0 rounded-sl-control border border-sl-border bg-sl-canvas px-3 py-1 text-sl-xs text-sl-text outline-none transition-colors placeholder:text-sl-text-2",
        "hover:border-sl-border-strong focus-visible:border-sl-text focus-visible:ring-2 focus-visible:ring-sl-text/20",
        "selection:bg-sl-text selection:text-sl-canvas",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The app's SelectTrigger at size sm (h-8, text-xs) over a native select, so
 * the list is the platform's own and keyboard-complete.
 */
export function SlSelect({
  value,
  onValueChange,
  options,
  label,
  labelledBy,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  label?: string;
  labelledBy?: string;
}) {
  return (
    <div className="relative w-full">
      <select
        value={value}
        aria-label={label}
        aria-labelledby={labelledBy}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(
          "flex h-8 w-full cursor-pointer appearance-none items-center rounded-sl-control border border-sl-border bg-sl-canvas py-2 pr-8 pl-3 text-sl-xs text-sl-text shadow-xs outline-none transition-[color,box-shadow,border-color,background-color] duration-150",
          "hover:border-sl-border-strong hover:bg-sl-hover focus-visible:border-sl-ring focus-visible:ring-[3px] focus-visible:ring-sl-ring/50",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-sl-text-2 opacity-50"
      />
    </div>
  );
}

/**
 * ColorField: the swatch + hex chip. The app opens an OKLCH picker popover;
 * here the chip wraps the platform colour input.
 */
export function SlColorField({
  value,
  onChange,
  compact = false,
  label = "Choose color",
}: {
  value: string;
  onChange: (hex: string) => void;
  compact?: boolean;
  label?: string;
}) {
  return (
    <label
      className={cn(
        "relative flex h-7 w-fit cursor-pointer items-center gap-2 rounded-sl-control border border-sl-border bg-sl-canvas px-1.5 shadow-xs transition-[border-color,background-color] duration-150 hover:border-sl-border-strong",
        "has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-sl-ring/50",
      )}
    >
      <span className="size-4.5 shrink-0 rounded-[4px] border border-sl-swatch-edge" style={{ background: value }} />
      {!compact && <span className="font-mono text-[11px] leading-none text-sl-text-2 uppercase">{value}</span>}
      <input
        type="color"
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value.toLowerCase())}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      />
    </label>
  );
}
