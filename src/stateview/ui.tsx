"use client";

import type { ComponentProps, ElementType, ReactElement } from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { IconContext, type IconProps } from "@phosphor-icons/react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

/**
 * Stateview's own primitives, styled from the Graphical "Stateview" theme
 * (gui/themes/stateview-components.md). Kept apart from the shadcn kit in
 * components/ui, which belongs to the app under review: an overlay tool
 * shouldn't borrow or restyle its host's components.
 */

// The context replaces Phosphor's defaults wholesale, so restate them alongside the theme's weight.
const iconDefaults: IconProps = { size: "1em", color: "currentColor", mirrored: false, weight: "light" };

/** Root of any Stateview surface: theme tokens, base typography and icon weight. */
export function ThemeScope<T extends ElementType = "div">({
  as,
  className,
  ...props
}: { as?: T } & ComponentProps<T>) {
  const Tag: ElementType = as ?? "div";
  return (
    <IconContext.Provider value={iconDefaults}>
      <Tag className={cn("stateview-theme", className)} {...props} />
    </IconContext.Provider>
  );
}

/**
 * Graphical Button (primary, outline, ghost) and Toolbar control. Disabled
 * styles key off `data-disabled`, which Base UI sets whether the button is
 * natively disabled or kept focusable (`focusableWhenDisabled`).
 */
export const buttonVariants = cva(
  "gui-control inline-flex shrink-0 items-center justify-center gap-gui-xs rounded-gui-s border-0 font-gui-ui text-gui-m font-gui-medium whitespace-nowrap outline-none select-none transition duration-gui ease-gui focus-visible:gui-focus-ring active:gui-press data-disabled:text-gui-neutral-6 data-disabled:active:translate-none motion-reduce:transition-none",
  {
    variants: {
      variant: {
        primary:
          "bg-gui-neutral-10 text-gui-neutral-1 inset-ring inset-ring-gui-neutral-10-transparent hover:bg-gui-neutral-9 hover:shadow-gui-s focus-visible:inset-ring-gui-1-transparent data-disabled:bg-gui-neutral-3 data-disabled:inset-ring-gui-neutral-4-transparent",
        outline:
          "text-gui-neutral-10 inset-ring inset-ring-gui-neutral-4 hover:bg-gui-neutral-3-transparent focus-visible:inset-ring-gui-1-transparent data-disabled:inset-ring-gui-neutral-4-transparent",
        ghost: "text-gui-neutral-10 hover:bg-gui-neutral-3-transparent focus-visible:inset-ring focus-visible:inset-ring-gui-1-transparent",
        // Neutral 4, not the export's Neutral 3: a 3-on-1 hover is a 1.15:1 step and reads as no change.
        toolbar: "text-gui-neutral-10 hover:bg-gui-neutral-4 aria-pressed:bg-gui-neutral-4 data-disabled:hover:bg-transparent",
      },
      size: {
        default: "px-gui-m py-gui-xs",
        toolbar: "px-gui-s py-gui-xs",
        icon: "gui-control-square p-gui-xs",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export function Button({ className, variant, size, ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

// Sized to sit beside S text without outweighing it: one XS line, XXS side padding.
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-gui-xxs rounded-gui-xs px-gui-xxs font-gui-ui text-gui-xs font-gui-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        option: "bg-gui-option-badge text-gui-option-badge-foreground",
        strong: "bg-gui-neutral-10 text-gui-neutral-1",
        // On a shaded card, where the option fill would be lighter than its background.
        surface: "bg-gui-neutral-1 text-gui-neutral-10",
      },
    },
    defaultVariants: { variant: "option" },
  },
);

export function Badge({ className, variant, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/** A keyboard shortcut hint. Decorative: the control carries aria-keyshortcuts. */
export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center rounded-gui-xs bg-gui-option-badge px-gui-xxs font-gui-data text-gui-xs text-gui-option-badge-foreground",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Graphical Tooltip. The popup is portalled to <body>, outside any themed
 * subtree, so it carries the theme scope itself.
 */
export function Tooltip({
  label,
  shortcut,
  children,
  side = "top",
}: {
  label: string;
  /** Shown only in the tooltip; the trigger should also set aria-keyshortcuts. */
  shortcut?: string;
  /** The trigger element. */
  children: ReactElement<Record<string, unknown>>;
  side?: TooltipPrimitive.Positioner.Props["side"];
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger render={children} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} sideOffset={8} className="z-50">
          <TooltipPrimitive.Popup className="stateview-theme flex items-center gap-gui-xs rounded-gui-s bg-gui-neutral-10 px-gui-xs py-gui-xxs text-gui-s font-gui-medium text-gui-neutral-1 shadow-gui-s duration-gui ease-gui motion-safe:data-open:animate-in motion-safe:data-open:fade-in-0 motion-safe:data-closed:animate-out motion-safe:data-closed:fade-out-0">
            {label}
            {shortcut ? (
              <kbd className="font-gui-data text-gui-xs text-gui-neutral-6">{shortcut}</kbd>
            ) : null}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
