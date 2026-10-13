"use client";

import { createContext, useContext, type ComponentProps, type ReactNode, type RefObject } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "../../cn";
import { useInThumbnail } from "@/stateview/in-thumbnail";
import { usePortalContainer } from "./portal";

/*
 * The Geist modal (580px, background-100, 12px radius, the elevated modal
 * shadow) on Base UI's Dialog: focus moves in, is trapped, and returns.
 * In a hub thumbnail the same markup renders as a still picture instead, so
 * a thumbnail never traps focus or locks the hub's scroll.
 */

const StaticContext = createContext(false);

function Dialog({
  open,
  onOpenChange,
  locked = false,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Only the dialog's own buttons can close it: no Escape, no outside press. */
  locked?: boolean;
  children: ReactNode;
}) {
  const still = useInThumbnail();
  if (still) return <StaticContext value>{open ? children : null}</StaticContext>;
  return (
    <DialogPrimitive.Root
      open={open}
      disablePointerDismissal={locked}
      onOpenChange={(next, details) => {
        if (!next && locked && details.reason !== "imperative-action") {
          details.cancel();
          return;
        }
        onOpenChange(next);
      }}
    >
      {children}
    </DialogPrimitive.Root>
  );
}

const popup =
  "gw-material-modal gw-dialog-size fixed top-1/2 left-1/2 z-50 flex -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden text-gw-gray-1000 outline-none";

function DialogContent({
  className,
  children,
  initialFocus,
  finalFocus,
}: {
  className?: string;
  children: ReactNode;
  initialFocus?: RefObject<HTMLElement | null>;
  finalFocus?: RefObject<HTMLElement | null>;
}) {
  const still = useContext(StaticContext);
  const container = usePortalContainer();
  if (still) {
    return (
      <>
        <div className="gw-backdrop fixed inset-0 z-50" />
        <div role="dialog" className={cn(popup, className)}>
          {children}
        </div>
      </>
    );
  }
  if (!container) return null;
  return (
    <DialogPrimitive.Portal container={container}>
      <DialogPrimitive.Backdrop className="gw-backdrop fixed inset-0 z-50 transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0" />
      <DialogPrimitive.Popup
        initialFocus={initialFocus}
        finalFocus={finalFocus}
        className={cn(
          popup,
          "transition-[opacity,scale] duration-300 ease-(--ds-motion-timing-swift) data-ending-style:scale-96 data-ending-style:opacity-0 data-starting-style:scale-96 data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100",
          className,
        )}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function DialogTitle({ className, ...props }: ComponentProps<"h2">) {
  const still = useContext(StaticContext);
  const classes = cn("text-gw-heading-20 text-gw-gray-1000", className);
  if (still) return <h2 className={classes} {...props} />;
  return <DialogPrimitive.Title className={classes} {...props} />;
}

function DialogDescription({ className, ...props }: ComponentProps<"p">) {
  const still = useContext(StaticContext);
  const classes = cn("text-gw-copy-14 text-gw-gray-900", className);
  if (still) return <p className={classes} {...props} />;
  return <DialogPrimitive.Description className={classes} {...props} />;
}

function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center justify-between gap-2 border-t border-gw-gray-alpha-400 bg-gw-background-200 p-3", className)}
      {...props}
    />
  );
}

export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle };
