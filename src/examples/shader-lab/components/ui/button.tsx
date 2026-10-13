import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../cn";

/**
 * Shader Lab's buttons: shadcn's Button as the app restyled it (ui/button.tsx),
 * plus the panel chrome's `labButton` surface (panel.tsx) and the one-off
 * treatments the lab layers on top, each as a named variant so screens never
 * restyle a button with className.
 */

// panel.tsx labButton: white surface, subtle grey outline.
const LAB = "border border-sl-border bg-sl-canvas text-sl-text shadow-xs hover:border-sl-border-strong hover:bg-sl-hover";

export const slButton = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium outline-none transition-[background-color,border-color,color,transform,box-shadow] duration-150 focus-visible:ring-[3px] focus-visible:ring-sl-ring/50 disabled:pointer-events-none disabled:cursor-default disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** shadcn ghost: quiet icon buttons in the header. */
        ghost: "text-sl-text-2 hover:bg-sl-hover hover:text-sl-text active:scale-98",
        /** labButton on an outline Button: Reset, Copy prompt. */
        outline: cn(LAB, "active:scale-98"),
        /** The emphasised action: solid ink on the panel (Save, Export, the tour's Next). */
        solid: "bg-sl-text text-sl-canvas hover:bg-sl-text/90 active:scale-98",
        /** The split button's main segment once everything is saved: quiet, disabled. */
        saved: cn(LAB, "text-sl-text-2 disabled:opacity-100"),
        /** A plain `<button>` styled with labButton (Random image, Show examples, All presets). */
        lab: cn(LAB, "active:scale-98"),
        /** Upload image / video: labButton without the press. */
        upload: LAB,
        /** Small icon actions in section headers and the rail: no surface until hover. */
        quiet: "text-sl-text-2 hover:bg-sl-hover hover:text-sl-text",
        /** The tour's Skip. */
        text: "font-normal text-sl-text-2 hover:bg-sl-hover hover:text-sl-text",
        /** Zoom HUD: ghost with a deeper press. */
        hud: "pointer-events-auto text-sl-text-2 hover:bg-sl-hover hover:text-sl-text active:scale-90",
        hudOn: "pointer-events-auto text-sl-text hover:bg-sl-hover hover:text-sl-text active:scale-90",
        /** Effect card's remove: ghost icon-xs, text colour only. */
        remove: "text-sl-text-2 hover:bg-sl-hover hover:text-sl-text active:scale-90",
      },
      size: {
        /** shadcn sm with an icon (has-[>svg]:px-2.5). */
        sm: "h-8 gap-1.5 rounded-sl-control px-3 text-sl-sm has-[>svg]:px-2.5",
        /** sm, icon-only below md. */
        smCompact: "h-8 gap-1.5 rounded-sl-control px-2 text-sl-sm",
        "icon-sm": "size-8 rounded-sl-control",
        "icon-xs": "size-6 rounded-sl-control",
        /** h-8 labButton rows (text-[12px]). */
        box: "h-8 gap-2 rounded-sl-control px-3 text-sl-12 font-normal",
        /** h-8 square labButton (the + beside a name field). */
        square: "size-8 rounded-sl-control",
        /** h-9 full-width uploads (text-[13px]). */
        upload: "h-9 gap-2 rounded-sl-control text-sl-13 font-normal",
        /** h-6 section-header icons. */
        tiny: "size-6 rounded-sl-control",
        /** The tour's h-7 buttons. */
        tour: "h-7 rounded-sl-control px-2.5 text-sl-12 font-normal",
        tourText: "h-7 rounded-sl-control px-2 text-sl-12",
        /** The Export CTA. */
        cta: "relative h-9 w-full overflow-hidden rounded-sl-control px-3 text-sl-sm active:scale-99",
      },
      split: {
        none: "",
        /** The split button's main segment. */
        start: "rounded-r-none",
        /** The split button's chevron: 28px wide, joined on the left. */
        end: "w-7 rounded-l-none px-0",
      },
    },
    compoundVariants: [
      { split: "end", variant: "solid", className: "border-l border-sl-canvas/25" },
      { split: "end", variant: "lab", className: "-ml-px" },
    ],
    defaultVariants: { variant: "ghost", size: "sm", split: "none" },
  },
);

export type SlButtonProps = ComponentProps<"button"> & VariantProps<typeof slButton>;

export function SlButton({ className, variant, size, split, type = "button", ...props }: SlButtonProps) {
  // `type` defaults to "button"; forms pass "submit".
  // oxlint-disable-next-line react/button-has-type -- the type is a prop with a "button" default
  return <button type={type} className={cn(slButton({ variant, size, split }), className)} {...props} />;
}
