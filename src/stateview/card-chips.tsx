import { ChatCircleIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { Item } from "./manifest";

/*
 * Chips laid over a state's thumbnail, on the hub and in the viewer's
 * filmstrip. They sit on the app's own (light) screen in either scheme, so
 * the dark chips stay dark and the light ones light. Decorative: the card's
 * description reads the same facts out (see chipText).
 */

const DARK_CHIP = "bg-gui-neutral-10 text-gui-neutral-1 dark:bg-gui-neutral-1 dark:text-gui-neutral-10";

/** Top right: open comments, then a dot until the state has been opened. */
export function CornerChips({ comments, viewed }: { comments: number; viewed: boolean }) {
  if (comments === 0 && viewed) return null;
  return (
    <span aria-hidden className="absolute top-gui-xs right-gui-xs flex items-center gap-gui-xxs">
      {comments > 0 ? (
        <span className={cn("flex h-5 items-center gap-gui-xxs rounded-full ps-gui-xxs pe-gui-xs font-gui-data text-gui-xs tabular-nums", DARK_CHIP)}>
          <ChatCircleIcon />
          {comments}
        </span>
      ) : null}
      {/* Dark on the app's light screen in both schemes, like the dark chips; the ring keeps it apart from the screen. */}
      {viewed ? null : (
        <span className="m-gui-xxs size-2 rounded-full bg-gui-neutral-10 ring-2 ring-gui-neutral-1 dark:bg-gui-neutral-1 dark:ring-gui-neutral-10" />
      )}
    </span>
  );
}

/** Bottom left: how many steps a flow has. */
export function FooterChips<T extends Record<string, string>>({ item }: { item: Item<T> }) {
  if (item.kind !== "sequence") return null;
  return (
    <span aria-hidden className="absolute bottom-gui-xs left-gui-xs flex items-center gap-gui-xxs">
      <span className={cn("flex h-5 items-center rounded-full px-gui-xs font-gui-data text-gui-xs", DARK_CHIP)}>{item.steps.length} steps</span>
    </span>
  );
}

/** What the chips show, as words for the card's description. */
export function chipText<T extends Record<string, string>>(item: Item<T>, viewed: boolean) {
  return [
    item.kind === "sequence" ? `${item.steps.length} steps` : null,
    viewed ? null : "Not opened yet",
  ]
    .filter((text) => text !== null)
    .join(". ");
}
