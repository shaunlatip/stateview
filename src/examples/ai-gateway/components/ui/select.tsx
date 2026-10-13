"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { cn } from "../../cn";
import { IconCheck, IconChevronDown } from "../../icons";
import { usePortalContainer } from "./portal";

/*
 * The prototype's select, re-themed shadcn: a 32px trigger on background-100
 * with a hairline, the Geist menu material for the list, 40px rows with a
 * check on the chosen one. The list overlaps the trigger, as Radix's
 * item-aligned default did.
 */
export function Select({
  value,
  onValueChange,
  items,
  label,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  items: { value: string; label: string }[];
  label: string;
  className?: string;
}) {
  const container = usePortalContainer();
  return (
    <SelectPrimitive.Root items={items} value={value} onValueChange={(next) => next !== null && onValueChange(next)}>
      <SelectPrimitive.Trigger
        aria-label={label}
        className={cn(
          "flex h-8 w-fit cursor-pointer items-center justify-between gap-2 rounded-gw-md bg-gw-background-100 px-3 text-gw-copy-14 whitespace-nowrap text-gw-gray-1000 shadow-gw-hairline transition-[color,box-shadow] outline-none hover:bg-gw-gray-100 focus-visible:shadow-gw-focus-border",
          className,
        )}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon className="flex text-gw-gray-900 opacity-50">
          <IconChevronDown size={16} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      {container ? (
        <SelectPrimitive.Portal container={container}>
          <SelectPrimitive.Positioner sideOffset={4} className="z-60">
            <SelectPrimitive.Popup className="gw-material-menu max-h-(--available-height) min-w-(--anchor-width) overflow-y-auto p-1 text-gw-gray-1000 outline-none">
              <SelectPrimitive.List>
                {items.map((item) => (
                  <SelectPrimitive.Item
                    key={item.value}
                    value={item.value}
                    className="relative flex h-10 cursor-pointer items-center rounded-gw-md pr-8 pl-2 text-gw-copy-14 outline-none select-none data-highlighted:bg-gw-gray-alpha-100"
                  >
                    <SelectPrimitive.ItemText>{item.label}</SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator className="absolute right-2 flex">
                      <IconCheck size={16} />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.List>
            </SelectPrimitive.Popup>
          </SelectPrimitive.Positioner>
        </SelectPrimitive.Portal>
      ) : null}
    </SelectPrimitive.Root>
  );
}
