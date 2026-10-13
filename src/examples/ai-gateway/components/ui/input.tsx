import type { ComponentProps } from "react";
import { cn } from "../../cn";

/* Geist input: 40px, 6px radius, gray-alpha-400 hairline, alpha-500 on hover, the focus border on focus. */
function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-gw-md bg-gw-background-100 px-3 text-gw-copy-14 text-gw-gray-1000 shadow-gw-hairline transition-[color,box-shadow] outline-none placeholder:text-gw-gray-700 hover:shadow-gw-hairline-500 focus-visible:shadow-gw-focus-border read-only:cursor-default disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
