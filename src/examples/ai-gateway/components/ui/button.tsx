import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../cn";
import { Anchor } from "./anchor";

/*
 * The Geist button as the prototype measured it: 14/20 medium label, 6px
 * radius, primary gray-1000 fill, secondary background-100 with a 1px
 * gray-400 ring, focus as a 2px gap plus a 2px blue ring.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-gw-md text-gw-button-14 whitespace-nowrap transition-[background-color,box-shadow,color] duration-150 outline-none focus-visible:shadow-gw-focus-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gw-gray-1000 text-gw-background-100 hover:bg-[color-mix(in_oklab,var(--ds-gray-1000)_82%,black)]",
        secondary: "bg-gw-background-100 text-gw-gray-1000 shadow-gw-control hover:bg-gw-gray-100 aria-disabled:hover:bg-gw-background-100",
        ghost: "text-gw-gray-1000 hover:bg-gw-gray-alpha-200",
        quiet: "text-gw-gray-900 hover:bg-gw-gray-alpha-200 hover:text-gw-gray-1000",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

type Variants = VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, type, ...props }: ComponentProps<"button"> & Variants) {
  const classes = cn(buttonVariants({ variant, size }), className);
  if (type === "submit") return <button type="submit" data-slot="button" className={classes} {...props} />;
  return <button type="button" data-slot="button" className={classes} {...props} />;
}

function ButtonLink({ className, variant, size, ...props }: ComponentProps<"a"> & Variants) {
  return <Anchor data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, ButtonLink, buttonVariants };
