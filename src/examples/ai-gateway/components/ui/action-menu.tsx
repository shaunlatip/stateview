"use client";

import type { ReactNode } from "react";
import { Menu } from "@base-ui/react/menu";
import { useInThumbnail } from "@/stateview/in-thumbnail";
import { usePortalContainer } from "./portal";

export type MenuAction = { label: string; description?: string; icon?: ReactNode; onSelect: () => void };

/*
 * One secondary button that opens the choices; no separate primary target.
 * Geist's default Menu trigger is a plain button with no chevron. The popup
 * is the Geist menu material: 320px, 8px inset, 14/500 labels over 13px
 * descriptions. In a hub thumbnail an open menu renders as a still picture
 * under its trigger, since floating positioning can't measure a scaled frame.
 */

const trigger =
  "inline-flex h-8 cursor-pointer items-center rounded-gw-md bg-gw-background-100 px-3 text-gw-button-14 text-gw-gray-1000 shadow-gw-control transition-colors outline-none hover:bg-gw-gray-100 focus-visible:shadow-gw-focus-ring data-popup-open:bg-gw-gray-100";
const popup = "gw-material-menu w-80 max-w-[calc(100vw-2rem)] p-2 text-gw-gray-1000 outline-none";
const heading = "px-2 pt-2 pb-1 text-gw-label-13 text-gw-gray-900";
const item = "flex cursor-pointer items-start gap-3 rounded-gw-md px-2 py-2 outline-none select-none data-highlighted:bg-gw-gray-alpha-100";

function ItemBody({ action }: { action: MenuAction }) {
  return (
    <>
      {action.icon ? <span className="mt-0.5 shrink-0 text-gw-gray-1000">{action.icon}</span> : null}
      <span className="flex min-w-0 flex-col">
        <span className="text-gw-copy-14 font-medium text-gw-gray-1000">{action.label}</span>
        {action.description ? <span className="text-gw-copy-13 text-gw-gray-900">{action.description}</span> : null}
      </span>
    </>
  );
}

export function ActionMenu({
  label,
  heading: title,
  actions,
  defaultOpen = false,
}: {
  label: string;
  heading?: string;
  actions: MenuAction[];
  defaultOpen?: boolean;
}) {
  const still = useInThumbnail();
  const container = usePortalContainer();

  if (still) {
    return (
      <span className="relative flex">
        <button type="button" className={trigger} data-popup-open={defaultOpen ? "" : undefined}>
          {label}
        </button>
        {defaultOpen ? (
          <span className={`${popup} absolute top-full right-0 z-40 mt-1 flex flex-col`}>
            {title ? <span className={heading}>{title}</span> : null}
            {actions.map((action) => (
              <span key={action.label} className={item}>
                <ItemBody action={action} />
              </span>
            ))}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <Menu.Root defaultOpen={defaultOpen}>
      <Menu.Trigger className={trigger}>{label}</Menu.Trigger>
      {container ? (
        <Menu.Portal container={container}>
          <Menu.Positioner side="bottom" align="end" sideOffset={4} className="z-40">
            <Menu.Popup className={`${popup} origin-(--transform-origin) transition-[opacity,scale] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100`}>
              <Menu.Group>
                {title ? <Menu.GroupLabel className={heading}>{title}</Menu.GroupLabel> : null}
                {actions.map((action) => (
                  <Menu.Item key={action.label} className={item} onClick={action.onSelect}>
                    <ItemBody action={action} />
                  </Menu.Item>
                ))}
              </Menu.Group>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      ) : null}
    </Menu.Root>
  );
}
