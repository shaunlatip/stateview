"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Popover } from "@base-ui/react/popover";
import { CaretDownIcon, ChatCircleIcon } from "@phosphor-icons/react";
import { frameHref, listFrames, listItems, viewportOf, type Inputs, type Item, type Manifest, type Section } from "./manifest";
import { useReview } from "./store";
import { Thumbnail } from "./thumbnail";
import { Badge, ThemeScope, buttonVariants } from "./ui";

type HubProps<T extends Inputs> = {
  manifest: Manifest<T>;
  /** A rendered screen for each item id (first step for sequences). */
  thumbnails: Record<string, ReactNode>;
};

export function Hub<T extends Inputs>({ manifest, thumbnails }: HubProps<T>) {
  const { annotations } = useReview(manifest);
  const frames = listFrames(manifest);
  const items = listItems(manifest);
  const firstFrameOf = (item: Item<T>) => frames.find((frame) => frame.item.id === item.id) ?? frames[0];
  const commentsOn = (item: Item<T>) =>
    annotations.filter((a) => a.status === "open" && (a.stateId === item.id || a.stateId.startsWith(`${item.id}/`))).length;

  return (
    <ThemeScope as="main" className="flex-1 bg-gui-neutral-1">
      <div className="mx-auto box-content flex max-w-300 flex-col gap-gui-xl px-gui-m py-gui-xl sm:px-gui-xl">
        <header className="flex flex-wrap items-end justify-between gap-x-gui-xl gap-y-gui-s">
          <div className="flex flex-col gap-gui-xxs">
            <p className="font-gui-brand text-gui-s font-gui-medium text-gui-neutral-7">Stateview</p>
            <h1 className="font-gui-brand text-gui-l font-gui-brand-heavy text-balance">{manifest.screen}</h1>
            <p className="text-gui-neutral-7">
              Reviewing <code className="font-gui-data text-gui-neutral-10">{manifest.scope.branch}</code> against{" "}
              <code className="font-gui-data text-gui-neutral-10">{manifest.scope.base}</code> · {manifest.scope.files} files changed
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-gui-s">
            <p className="text-gui-neutral-7 tabular-nums">
              {items.length} states in {manifest.sections.length} sections
            </p>
            <Coverage uncovered={manifest.uncovered} excluded={manifest.excluded} />
          </div>
        </header>

        {/* Sections hug their cards and wrap, so one-card sections share a row and padding stays even. */}
        <div className="flex flex-wrap items-start gap-gui-m">
          {manifest.sections.map((section) => (
            <HubSection
              key={section.id}
              section={section}
              renderCard={(item) => (
                <StateCard
                  key={item.id}
                  item={item}
                  href={frameHref(manifest, firstFrameOf(item))}
                  viewport={viewportOf(manifest, firstFrameOf(item).inputs)}
                  comments={commentsOn(item)}
                  thumbnail={thumbnails[item.id]}
                />
              )}
            />
          ))}
        </div>
      </div>
    </ThemeScope>
  );
}

/** What the review leaves out, behind a count so the header stays one line. */
function Coverage({ uncovered, excluded }: { uncovered: string[]; excluded: string[] }) {
  return (
    <Popover.Root>
      <Popover.Trigger className={buttonVariants({ variant: "outline", size: "toolbar" })}>
        <span className="tabular-nums">{uncovered.length} combinations not covered</span>
        <CaretDownIcon aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
          <Popover.Popup className="stateview-theme flex max-w-sm flex-col gap-gui-xs rounded-gui-m bg-gui-neutral-1 p-gui-m shadow-gui-m ring-1 ring-gui-neutral-4-transparent outline-none duration-gui ease-gui motion-safe:data-open:animate-in motion-safe:data-open:fade-in-0 motion-safe:data-closed:animate-out motion-safe:data-closed:fade-out-0">
            <Popover.Title className="font-gui-medium">Combinations no state shows</Popover.Title>
            <ul className="list-disc pl-gui-l text-gui-neutral-8">
              {uncovered.map((combination) => (
                <li key={combination}>{combination}</li>
              ))}
            </ul>
            <p className="pt-gui-xs font-gui-medium">Left out because no real account can be in them</p>
            <ul className="list-disc pl-gui-l text-gui-neutral-8">
              {excluded.map((combination) => (
                <li key={combination}>{combination}</li>
              ))}
            </ul>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/**
 * A titled group of screens, after Figma's sections: a light fill and outline
 * in the section's hue, with the title in a bold chip sitting on top of the
 * section's top-left corner, outside it.
 */
function HubSection<T extends Inputs>({ section, renderCard }: { section: Section<T>; renderCard: (item: Item<T>) => ReactNode }) {
  const headingId = `section-${section.id}`;
  return (
    <section aria-labelledby={headingId} data-tone={section.tone ?? "base"} className="flex max-w-full flex-col">
      <h2
        id={headingId}
        className="w-fit rounded-t-gui-xs bg-gui-section-chip px-gui-xs py-gui-xxs text-gui-s font-gui-medium text-gui-section-chip-text"
      >
        {section.title}
      </h2>
      {/* M padding and gap leave room for a hovered card's fill, which extends XS past the card. */}
      <ul className="flex flex-wrap gap-gui-m rounded-gui-s rounded-tl-none bg-gui-section-fill p-gui-m inset-ring inset-ring-gui-section-edge">
        {section.items.map(renderCard)}
      </ul>
    </section>
  );
}

/** The whole card is the link, so element pickers (Agentation) and pointers hit one target. */
function StateCard<T extends Inputs>({
  item,
  href,
  viewport,
  comments,
  thumbnail,
}: {
  item: Item<T>;
  href: string;
  viewport: "desktop" | "mobile";
  comments: number;
  thumbnail: ReactNode;
}) {
  const chips = [item.kind === "sequence" ? `${item.steps.length} steps` : null, item.origin === "code-only" ? "Not in designs" : null].filter(
    (chip): chip is string => chip !== null,
  );
  return (
    <li className="flex">
      {/*
        Named by the title alone; the description and chips are its description.
        At rest it's just the image and text. The hover and focus fill is a
        pseudo-element extending XS past the card on every side, so nothing moves.
      */}
      <Link
        href={href}
        aria-labelledby={`card-${item.id}-title`}
        aria-describedby={`card-${item.id}-details`}
        className="relative isolate flex w-min flex-col gap-gui-xs outline-none before:absolute before:-inset-gui-xs before:-z-10 before:rounded-gui-m before:transition-colors before:duration-gui before:ease-gui hover:before:bg-gui-section-card focus-visible:before:bg-gui-section-card focus-visible:before:gui-focus-ring active:gui-press active:before:bg-gui-section-card-hover motion-reduce:before:transition-none"
      >
        <Thumbnail viewport={viewport}>{thumbnail}</Thumbnail>
        {comments > 0 ? (
          <Badge className="absolute top-gui-xs right-gui-xs">
            <ChatCircleIcon aria-hidden />
            <span className="tabular-nums">{comments}</span>
            <span className="sr-only">{comments === 1 ? "open comment" : "open comments"}</span>
          </Badge>
        ) : null}
        <div className="flex flex-1 flex-col gap-gui-xxs">
          <div className="flex items-start justify-between gap-gui-xs">
            <h3 id={`card-${item.id}-title`} className="text-gui-s font-gui-medium">
              {item.title}
            </h3>
            {chips.length > 0 ? (
              // Code-only states are flag-, entitlement- or loading-gated, so no design shows them.
              // Hidden here because the description below already reads them out.
              <span aria-hidden className="flex shrink-0 gap-gui-xxs pt-gui-xxs">
                {chips.map((chip) => (
                  <Badge key={chip} variant="surface">
                    {chip}
                  </Badge>
                ))}
              </span>
            ) : null}
          </div>
          {/* Neutral 8, not 7: Neutral 7 drops under 4.5:1 on the tinted cards. */}
          <p id={`card-${item.id}-details`} className="text-gui-s text-gui-neutral-8">
            {item.why}
            {chips.length > 0 ? <span className="sr-only">{` ${chips.join(", ")}.`}</span> : null}
          </p>
        </div>
      </Link>
    </li>
  );
}
