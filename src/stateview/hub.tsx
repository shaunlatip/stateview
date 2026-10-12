"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChatCircleIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
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
      <div className="flex w-full flex-col gap-gui-xl px-gui-m py-gui-xl sm:px-gui-xl">
        <header className="flex flex-col gap-gui-m">
          <p className="font-gui-brand text-gui-s font-gui-medium text-gui-neutral-7">Stateview</p>
          <div className="flex flex-col gap-gui-xs">
            <h1 className="font-gui-brand text-gui-l font-gui-brand-heavy text-balance">{manifest.screen}</h1>
            <p className="text-gui-neutral-7">
              Reviewing <code className="font-gui-data text-gui-neutral-10">{manifest.scope.branch}</code> against{" "}
              <code className="font-gui-data text-gui-neutral-10">{manifest.scope.base}</code> · {manifest.scope.files} files changed
            </p>
            <p className="tabular-nums">
              {items.length} states in {manifest.sections.length} sections · {manifest.uncovered.length} combinations not covered
            </p>
          </div>
          <Link href={frameHref(manifest, frames[0])} className={buttonVariants({ className: "w-fit" })}>
            Start review
          </Link>
          <details className="group flex max-w-prose flex-col gap-gui-s">
            <summary className="-mx-gui-xs w-fit cursor-pointer rounded-gui-s px-gui-xs py-gui-xs font-gui-medium outline-none transition-colors duration-gui ease-gui marker:text-gui-neutral-7 hover:bg-gui-neutral-3 focus-visible:gui-focus-ring motion-reduce:transition-none">
              What this review doesn’t cover
            </summary>
            <div className="flex flex-col gap-gui-xs rounded-gui-s bg-gui-neutral-2 p-gui-s text-gui-neutral-8 ring-1 ring-gui-neutral-4-transparent">
              <p>Combinations no state shows:</p>
              <ul className="list-disc pl-gui-l">
                {manifest.uncovered.map((combination) => (
                  <li key={combination}>{combination}</li>
                ))}
              </ul>
              <p>Left out because no real account can be in them:</p>
              <ul className="list-disc pl-gui-l">
                {manifest.excluded.map((combination) => (
                  <li key={combination}>{combination}</li>
                ))}
              </ul>
            </div>
          </details>
        </header>

        {/* Bento: fixed one-card tracks; dense packing lets one-card sections share a row. */}
        <div className="gui-section-grid grid grid-flow-dense items-start gap-gui-m">
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

/** Columns a section spans, by card count. Capped per breakpoint so a span never asks for more tracks than fit. */
function spanFor(count: number) {
  if (count >= 3) return "md:col-span-2 xl:col-span-3";
  if (count === 2) return "md:col-span-2";
  return undefined;
}

/**
 * A titled container of screens, after Figma's sections: a tinted body with
 * an outline, and the title on a tab at the top-left whose edge steps down
 * into the body's through a curved tail (Rauno's Next.js dev tools notch).
 */
function HubSection<T extends Inputs>({ section, renderCard }: { section: Section<T>; renderCard: (item: Item<T>) => ReactNode }) {
  const headingId = `section-${section.id}`;
  return (
    <section aria-labelledby={headingId} data-tone={section.tone ?? "base"} className={cn("flex flex-col", spanFor(section.items.length))}>
      {/* Overlaps the body by one edge width and paints over it, hiding the body's top edge under the tab and tail. */}
      <div className="gui-section-tab-edge relative z-10 -mb-px self-start rounded-tl-gui-l bg-gui-section-fill px-gui-s pt-gui-xs pb-gui-xxs">
        <h2 id={headingId} className="font-gui-heavy">
          {section.title}
        </h2>
        <svg aria-hidden className="gui-notch-tail w-gui-l" viewBox="0 0 24 24" preserveAspectRatio="none">
          <path d="M0 0C12 0 12 24 24 24V25H0Z" className="fill-gui-section-fill" />
          <path d="M0 0C12 0 12 24 24 24" vectorEffect="non-scaling-stroke" className="gui-stroke-edge fill-none stroke-gui-section-edge" />
        </svg>
      </div>
      {/* L radius: the cards' M radius plus the body's S padding, so the corners stay concentric. */}
      <ul className="flex flex-wrap gap-gui-s rounded-gui-l rounded-tl-none bg-gui-section-fill p-gui-s inset-ring inset-ring-gui-section-edge">
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
  return (
    <li className="flex">
      {/* Named by the title alone; the description and chips are its description. */}
      <Link
        href={href}
        aria-labelledby={`card-${item.id}-title`}
        aria-describedby={`card-${item.id}-details`}
        className="relative flex w-min flex-col rounded-gui-m bg-gui-card p-gui-xxs outline-none transition duration-gui ease-gui hover:bg-gui-card-hover focus-visible:gui-focus-ring active:gui-press motion-reduce:transition-none"
      >
        <Thumbnail viewport={viewport}>{thumbnail}</Thumbnail>
        {comments > 0 ? (
          <Badge className="absolute top-gui-s right-gui-s">
            <ChatCircleIcon aria-hidden />
            <span className="tabular-nums">{comments}</span>
            <span className="sr-only">{comments === 1 ? "open comment" : "open comments"}</span>
          </Badge>
        ) : null}
        <div className="flex flex-1 flex-col gap-gui-xxs px-gui-xs pt-gui-xs pb-gui-xxs">
          <h3 id={`card-${item.id}-title`} className="text-gui-s font-gui-medium">
            {item.title}
          </h3>
          <div id={`card-${item.id}-details`} className="flex flex-col gap-gui-xs">
            {/* Neutral 8, not 7: Neutral 7 drops under 4.5:1 on the tinted sections once the card shade is added. */}
            <p className="text-gui-s text-gui-neutral-8">{item.why}</p>
            {item.origin === "code-only" || item.kind === "sequence" ? (
              <div className="flex flex-wrap gap-gui-xxs">
                {item.kind === "sequence" ? <Badge variant="surface">{item.steps.length} steps</Badge> : null}
                {/* Code-only states are flag-, entitlement- or loading-gated, so no design shows them. */}
                {item.origin === "code-only" ? <Badge variant="surface">Not in designs</Badge> : null}
              </div>
            ) : null}
          </div>
        </div>
      </Link>
    </li>
  );
}
