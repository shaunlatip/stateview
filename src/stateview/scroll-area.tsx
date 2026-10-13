"use client";

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { cn } from "@/lib/utils";

/**
 * Graphical scroll area: shadcn's Base UI scroll area, drawn from Stateview's
 * tokens. The scrollbar overlays the content instead of taking width, so a
 * padded column keeps its padding whether or not it scrolls. It's hidden at
 * rest and fades in while the area scrolls (Base UI's data-scrolling) or
 * while the pointer is on the bar itself, so it can still be grabbed. The
 * thumb is Neutral 5, which reads on the toolbar background in both schemes,
 * and darkens while it's hovered or dragged.
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
        "group/scrollbar flex touch-none p-0.5 opacity-0 select-none transition-opacity duration-gui-large ease-gui hover:opacity-100 data-horizontal:h-2 data-horizontal:flex-col data-scrolling:opacity-100 data-scrolling:duration-gui data-vertical:w-2 motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-gui-neutral-5 transition-colors duration-gui ease-gui group-hover/scrollbar:bg-gui-neutral-6 active:bg-gui-neutral-7 motion-reduce:transition-none" />
    </ScrollAreaPrimitive.Scrollbar>
  );
}
