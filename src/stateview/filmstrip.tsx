"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CornerChips, FooterChips, chipText } from "./card-chips";
import { frameHref, listFrames, viewportOf, type Inputs, type Item, type Manifest } from "./manifest";
import { Thumbnail } from "./thumbnail";
import { ThemeScope } from "./ui";

type FilmstripProps<T extends Inputs> = {
  id: string;
  manifest: Manifest<T>;
  /** The item on screen. */
  currentId: string;
  open: boolean;
  /** Open because of the screen width rather than the reviewer's choice: CSS decides, so the server render is already right. */
  auto: boolean;
  viewed: string[];
  /** Open comments on an item, across its steps. */
  commentsOn: (item: Item<T>) => number;
  render: (inputs: T) => ReactNode;
  /** Called when a state is picked, before the page changes. */
  onPick: () => void;
};

/**
 * Every state as a small thumbnail down the left of the viewer, grouped by
 * section, with the one on screen outlined. Takes its own column, so the app
 * moves over rather than sliding under it (on phones it overlays instead).
 * Titles only: the hub carries the descriptions.
 */
export function Filmstrip<T extends Inputs>({ id, manifest, currentId, open, auto, viewed, commentsOn, render, onPick }: FilmstripProps<T>) {
  const frames = listFrames(manifest);

  return (
    <ThemeScope
      as="nav"
      id={id}
      aria-label="States"
      // Closed, it slides out and leaves the tab order and the accessibility tree.
      inert={!open}
      className={cn(
        "dark fixed top-(--viewer-bar) bottom-0 left-0 z-30 flex w-(--viewer-strip) -translate-x-full flex-col gap-gui-m overflow-y-auto overscroll-contain bg-gui-toolbar px-gui-s pt-gui-s pb-gui-l shadow-gui-m transition-transform duration-gui-large ease-gui-large motion-reduce:transition-none",
        auto ? "md:translate-x-0" : open && "translate-x-0",
      )}
    >
      {manifest.sections.map((section) => (
        <section key={section.id} aria-labelledby={`strip-${section.id}`} className="flex flex-col gap-gui-xs">
          <h2 id={`strip-${section.id}`} className="text-gui-xs text-gui-neutral-7">
            {section.title}
          </h2>
          <ul className="flex flex-col gap-gui-s">
            {section.items.map((item) => {
              const first = frames.find((frame) => frame.item.id === item.id) ?? frames[0];
              const current = item.id === currentId;
              const isViewed = current || viewed.includes(item.id);
              const comments = commentsOn(item);
              const details = chipText(item, isViewed);
              return (
                <li key={item.id} className="flex">
                  <Link
                    // Keep the state on screen in view as the reviewer steps through.
                    ref={current ? scrollIntoView : undefined}
                    href={frameHref(manifest, first)}
                    aria-current={current ? "page" : undefined}
                    onClick={onPick}
                    className="group flex w-min flex-col gap-gui-xxs rounded-gui-s outline-offset-2 outline-none focus-visible:gui-focus-ring"
                  >
                    <div className="relative">
                      <Thumbnail
                        viewport={viewportOf(manifest, first.inputs)}
                        size="strip"
                        className={cn(
                          "transition-shadow duration-gui ease-gui motion-reduce:transition-none",
                          current ? "ring-2 ring-gui-neutral-10" : "group-hover:ring-gui-neutral-6",
                        )}
                      >
                        {render(first.inputs)}
                      </Thumbnail>
                      <CornerChips comments={comments} viewed={isViewed} />
                      <FooterChips item={item} />
                    </div>
                    <span className={cn("line-clamp-1 text-gui-xs", current ? "font-gui-medium text-gui-neutral-10" : "text-gui-neutral-8")}>
                      {item.title}
                      {comments > 0 ? <span className="sr-only">{`, ${comments} open ${comments === 1 ? "comment" : "comments"}`}</span> : null}
                      {details ? <span className="sr-only">{`, ${details}`}</span> : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </ThemeScope>
  );
}

function scrollIntoView(node: HTMLElement | null) {
  node?.scrollIntoView({ block: "nearest" });
}
