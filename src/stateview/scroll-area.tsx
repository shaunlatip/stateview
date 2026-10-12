"use client";

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { cn } from "@/lib/utils";

/**
 * Graphical scroll area: shadcn's Base UI scroll area, drawn from Stateview's
 * tokens. The scrollbar overlays the content instead of taking width, so a
 * padded column keeps its padding whether or not it scrolls. The thumb is
 * Neutral 5, which reads on the toolbar background in both schemes, and
 * lightens while it's hovered or dragged.
 */
export function ScrollArea({ className, children, ...props }: ScrollAreaPrimitive.Root.Props) {
  return (
    <ScrollAreaPrimitive.Root className={cn("relative min-h-0", className)} {...props}>
      <ScrollAreaPrimitive.Viewport className="size-full overscroll-contain outline-none focus-visible:gui-focus-ring focus-visible:-outline-offset-2">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({ className, orientation = "vertical", ...props }: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      orientation={orientation}
      className={cn(
        "group/scrollbar flex touch-none p-0.5 select-none data-horizontal:h-2 data-horizontal:flex-col data-vertical:w-2",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-gui-neutral-5 transition-colors duration-gui ease-gui group-hover/scrollbar:bg-gui-neutral-6 active:bg-gui-neutral-7 motion-reduce:transition-none" />
    </ScrollAreaPrimitive.Scrollbar>
  );
}
