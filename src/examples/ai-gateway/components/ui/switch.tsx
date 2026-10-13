"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "../../cn";

/* The prototype's switch: 28 × 14 track, blue-700 on, gray-500 off, a 12px white thumb. */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-3.5 w-7 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors outline-none after:absolute after:-inset-x-2 after:-inset-y-2 focus-visible:shadow-gw-focus-ring data-checked:bg-gw-blue-700 data-unchecked:bg-gw-gray-500 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-3 rounded-full bg-white transition-transform data-checked:translate-x-[calc(100%-2px)] data-unchecked:translate-x-0" />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
