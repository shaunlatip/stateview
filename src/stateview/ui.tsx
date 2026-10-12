"use client";

import type { ComponentProps, ElementType, ReactElement, ReactNode } from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { CaretUpDownIcon, CheckIcon, IconContext, type IconProps } from "@phosphor-icons/react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

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
        // Neutral 4 hover, like the toolbar: the export's Neutral 3 at 20% was invisible on Neutral 1.
        ghost: "text-gui-neutral-10 hover:bg-gui-neutral-4 focus-visible:inset-ring focus-visible:inset-ring-gui-1-transparent",
        // A secondary action that shouldn't compete, e.g. Delete beside Cancel and Save.
        quiet: "text-gui-neutral-7 hover:bg-gui-neutral-4 hover:text-gui-neutral-10 focus-visible:inset-ring focus-visible:inset-ring-gui-1-transparent",
        // Neutral 4, not the export's Neutral 3: a 3-on-1 hover is a 1.15:1 step and reads as no change.
        toolbar: "text-gui-neutral-10 hover:bg-gui-neutral-4 aria-pressed:bg-gui-neutral-4 aria-expanded:bg-gui-neutral-4 data-disabled:hover:bg-transparent",
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

export type ControlOption = { value: string; label: string; icon?: ReactNode };

/**
 * One choice among a few short options, all visible at once. A radio group
 * rather than a toggle group: exactly one value is always set. Segments split
 * the width evenly so options line up from row to row. Selected is the
 * inverted fill, which keeps Color 1 for focus. Fill and text swap in the
 * same frame, and hover only lightens unselected text: a fade or a hover
 * color on the selected segment leaves light text on its light fill.
 */
export function SegmentedControl({
  value,
  onValueChange,
  options,
  className,
  ...props
}: Omit<RadioGroup.Props, "value" | "onValueChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  options: ControlOption[];
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onValueChange(String(next))}
      className={cn("flex h-8 rounded-gui-s bg-gui-neutral-3 p-0.5", className)}
      {...props}
    >
      {options.map((option) => (
        <Radio.Root
          key={option.value}
          value={option.value}
          className="flex min-w-0 flex-1 basis-0 cursor-default items-center justify-center gap-gui-xs rounded-gui-segment text-gui-s whitespace-nowrap text-gui-neutral-7 outline-none select-none hover:not-data-checked:text-gui-neutral-10 focus-visible:gui-focus-ring data-checked:bg-gui-neutral-10 data-checked:text-gui-neutral-1"
        >
          {option.icon}
          {option.label}
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}

/** Graphical Switch: Neutral 5 track, Color 1 when on. The thumb inverts with the scheme so it reads on both tracks. */
export function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "inline-flex h-5 w-9 shrink-0 cursor-default items-center rounded-full bg-gui-neutral-5 p-0.5 outline-none transition-colors duration-gui ease-gui focus-visible:gui-focus-ring data-checked:bg-gui-1 motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="size-4 rounded-full bg-gui-neutral-1 shadow-gui-s transition-transform duration-gui ease-gui data-checked:translate-x-4 motion-reduce:transition-none dark:bg-gui-neutral-10 dark:data-checked:bg-gui-neutral-1" />
    </SwitchPrimitive.Root>
  );
}

/**
 * Graphical Select, for inputs with too many or too long options to show at
 * once. The list is portalled to <body>, so it takes the trigger's scheme
 * explicitly. In dark it's lifted to Neutral 3 with a Neutral 5 edge, since a
 * shadow doesn't show against a dark panel.
 */
export function Select({
  value,
  onValueChange,
  options,
  scheme,
  className,
  ...props
}: Omit<ComponentProps<"button">, "value"> & {
  value: string;
  onValueChange: (value: string) => void;
  options: ControlOption[];
  scheme: "light" | "dark";
}) {
  return (
    <SelectPrimitive.Root items={options} value={value} onValueChange={(next) => next !== null && onValueChange(String(next))}>
      <SelectPrimitive.Trigger
        className={cn(
          "flex h-8 cursor-default items-center justify-between gap-gui-xs rounded-gui-s bg-gui-neutral-3 px-gui-s text-gui-s text-gui-neutral-10 outline-none select-none transition-colors duration-gui ease-gui hover:bg-gui-neutral-4 focus-visible:gui-focus-ring data-popup-open:bg-gui-neutral-4 motion-reduce:transition-none",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon className="flex text-gui-xs text-gui-neutral-7">
          <CaretUpDownIcon aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner sideOffset={4} className={cn("stateview-theme z-50 outline-none", scheme === "dark" && "dark")}>
          <SelectPrimitive.Popup className="gui-anchor-width rounded-gui-s bg-gui-neutral-1 p-gui-xxs text-gui-s text-gui-neutral-10 shadow-gui-m ring-1 ring-gui-neutral-4-transparent outline-none transition-opacity duration-gui ease-gui data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none dark:bg-gui-neutral-3 dark:ring-gui-neutral-5">
            <SelectPrimitive.List>
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="flex cursor-default items-center justify-between gap-gui-m rounded-gui-xs px-gui-xs py-gui-xxs outline-none select-none data-highlighted:bg-gui-neutral-3 dark:data-highlighted:bg-gui-neutral-4"
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="flex">
                    <CheckIcon aria-hidden />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
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

/** Graphical Toolbar separator. */
export function ToolbarSeparator() {
  return <SeparatorPrimitive orientation="vertical" className="gui-divider-vertical my-gui-xxs self-stretch" />;
}

type IconButtonProps =Omit<ButtonPrimitive.Props, "aria-label"> & {
  /** Accessible name, also shown as the tooltip. */
  label: string;
  /** Shortcut shown in the tooltip. Pass `aria-keyshortcuts` separately. */
  shortcut?: string;
};

/** An icon-only toolbar control, named by `label` and explained by a tooltip. */
export function IconButton({ label, shortcut, ...props }: IconButtonProps) {
  return (
    <Tooltip label={label} shortcut={shortcut}>
      <Button variant="toolbar" size="icon" aria-label={label} {...props} />
    </Tooltip>
  );
}

/** Graphical Menu. Compose `Menu` > `MenuTrigger` + `MenuPopup` > `MenuItem`. */
export const Menu = MenuPrimitive.Root;
export const MenuTrigger = MenuPrimitive.Trigger;

export function MenuPopup({
  className,
  side = "top",
  align = "end",
  ...props
}: MenuPrimitive.Popup.Props & Pick<MenuPrimitive.Positioner.Props, "side" | "align">) {
  return (
    <MenuPrimitive.Portal>
      {/* Portalled to <body>, so the theme scope is restated inside the portal. */}
      <ThemeScope>
        <MenuPrimitive.Positioner side={side} align={align} sideOffset={8} className="z-50">
          <MenuPrimitive.Popup
            className={cn(
              "flex origin-(--transform-origin) flex-col gap-gui-xxs rounded-gui-m bg-gui-neutral-1 p-gui-xxs shadow-gui-m ring-1 ring-gui-border outline-none transition duration-gui ease-gui data-ending-style:opacity-0 data-starting-style:opacity-0 motion-safe:data-ending-style:scale-(--motion-popup-scale) motion-safe:data-starting-style:scale-(--motion-popup-scale) dark:bg-gui-neutral-2",
              className,
            )}
            {...props}
          />
        </MenuPrimitive.Positioner>
      </ThemeScope>
    </MenuPrimitive.Portal>
  );
}

export function MenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      className={cn(
        "gui-control flex items-center gap-gui-xs rounded-gui-xs px-gui-xs py-gui-xxs text-gui-m font-gui-regular whitespace-nowrap text-gui-neutral-10 outline-none select-none focus-visible:gui-focus-ring data-disabled:pointer-events-none data-disabled:text-gui-neutral-6 data-highlighted:bg-gui-neutral-4",
        className,
      )}
      {...props}
    />
  );
}
