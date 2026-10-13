import { useId } from "react";
import { cn } from "../../cn";

const THUMB = 14;

/**
 * The app's Slider (Radix, ui/slider.tsx) drawn the same way — a 6px track in
 * border-default, an ink range and a solid 14px ink thumb kept inside the
 * track — over a native range input, which carries the keyboard, the value
 * and the accessible name.
 */
export function SlSlider({
  value,
  min,
  max,
  step,
  onValueChange,
  label,
  labelledBy,
  valueText,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number) => void;
  label?: string;
  labelledBy?: string;
  valueText?: string;
}) {
  const id = useId();
  const pct = max > min ? ((Math.min(max, Math.max(min, value)) - min) / (max - min)) * 100 : 0;
  // Radix keeps the thumb inside the track: offset it by half a thumb at the ends.
  const thumbLeft = `calc(${pct}% + ${(0.5 - pct / 100) * THUMB}px)`;
  return (
    <div className="relative flex h-3.5 w-full touch-none items-center select-none">
      <div className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-sl-border">
        <div className="absolute inset-y-0 left-0 bg-sl-text" style={{ width: `${pct}%` }} />
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        aria-labelledby={labelledBy}
        aria-valuetext={valueText}
        onChange={(e) => onValueChange(Number(e.target.value))}
        className="peer absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none opacity-0"
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 block size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sl-text shadow-sm transition-[box-shadow,transform]",
          "peer-hover:ring-4 peer-hover:ring-sl-text/15 peer-focus-visible:ring-4 peer-focus-visible:ring-sl-text/25",
        )}
        style={{ left: thumbLeft }}
      />
    </div>
  );
}
