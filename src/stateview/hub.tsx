"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChatCircleIcon, CheckIcon } from "@phosphor-icons/react";
import { changedInputs, frameHref, listFrames, listItems, viewportOf, type Inputs, type Item, type Manifest, type Section } from "./manifest";
import { useReview } from "./store";
import { InputsThumbnail, Thumbnail } from "./thumbnail";
import { Badge, ThemeScope, buttonVariants } from "./ui";

type HubProps<T extends Inputs> = {
  manifest: Manifest<T>;
  /**
   * A rendered screen for each item id (first step for sequences). Items
   * without one show the inputs they change instead, for screens that can't
   * render many live copies at once (WebGL maps, video).
   */
  thumbnails: Record<string, ReactNode>;
};

export function Hub<T extends Inputs>({ manifest, thumbnails }: HubProps<T>) {
  const { reviewed, annotations } = useReview(manifest);
  const frames = listFrames(manifest);
  const items = listItems(manifest);
  const reviewedCount = items.filter((item) => reviewed.includes(item.id)).length;
  const nextFrame = frames.find((frame) => !reviewed.includes(frame.item.id)) ?? frames[0];
  const firstFrameOf = (item: Item<T>) => frames.find((frame) => frame.item.id === item.id) ?? frames[0];
  const commentsOn = (item: Item<T>) =>
    annotations.filter((a) => a.status === "open" && (a.stateId === item.id || a.stateId.startsWith(`${item.id}/`))).length;
  const thumbnailOf = (item: Item<T>) => {
    const inputs = firstFrameOf(item).inputs;
    if (item.id in thumbnails) return <Thumbnail viewport={viewportOf(manifest, inputs)}>{thumbnails[item.id]}</Thumbnail>;
    const changes = changedInputs(manifest, inputs).map((id) => ({
      label: manifest.inputs.find((input) => input.id === id)?.label ?? id,
      value: inputs[id],
    }));
    return <InputsThumbnail changes={changes} />;
  };

  return (
    <ThemeScope as="main" className="flex-1 bg-gui-neutral-1">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-gui-xl px-gui-m py-gui-xl sm:px-gui-xl">
        <header className="flex flex-col gap-gui-m">
          <p className="font-gui-brand font-gui-brand-heavy">Stateview</p>
          <div className="flex flex-col gap-gui-xs">
            <h1 className="font-gui-brand text-gui-l font-gui-brand-heavy text-balance">{manifest.screen}</h1>
            <p className="text-gui-neutral-7">
              Reviewing <code className="font-gui-data text-gui-neutral-10">{manifest.scope.branch}</code> against{" "}
              <code className="font-gui-data text-gui-neutral-10">{manifest.scope.base}</code> · {manifest.scope.files} files changed
            </p>
            <p className="tabular-nums">
              {items.length} states in {manifest.sections.length} sections · {reviewedCount} of {items.length} reviewed ·{" "}
              {manifest.uncovered.length} combinations not covered
            </p>
          </div>
          <Link href={frameHref(manifest, nextFrame)} className={buttonVariants({ className: "w-fit" })}>
            {reviewedCount === 0 ? "Start review" : reviewedCount === items.length ? "Review again" : "Continue review"}
          </Link>
          <details className="group flex max-w-prose flex-col gap-gui-s">
            <summary className="w-fit cursor-pointer rounded-gui-s py-gui-xs font-gui-medium outline-none marker:text-gui-neutral-7 focus-visible:gui-focus-ring">
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

        {manifest.sections.map((section) => (
          <HubSection
            key={section.id}
            section={section}
            reviewed={reviewed}
            renderCard={(item) => (
              <StateCard
                key={item.id}
                item={item}
                href={frameHref(manifest, firstFrameOf(item))}
                reviewed={reviewed.includes(item.id)}
                comments={commentsOn(item)}
                thumbnail={thumbnailOf(item)}
              />
            )}
          />
        ))}
      </div>
    </ThemeScope>
  );
}

function HubSection<T extends Inputs>({
  section,
  reviewed,
  renderCard,
}: {
  section: Section<T>;
  reviewed: string[];
  renderCard: (item: Item<T>) => ReactNode;
}) {
  const headingId = `section-${section.id}`;
  const done = section.items.filter((item) => reviewed.includes(item.id)).length;
  return (
    <section aria-labelledby={headingId} className="gui-divider-top flex flex-col gap-gui-m pt-gui-m lg:grid lg:grid-cols-4 lg:gap-gui-xl">
      <div className="flex flex-col gap-gui-xxs">
        <h2 id={headingId} className="font-gui-heavy">
          {section.title}
        </h2>
        <p className="text-gui-s text-gui-neutral-7 tabular-nums">
          {done} of {section.items.length} reviewed
        </p>
        <p className="text-gui-s text-gui-neutral-7">{section.why}</p>
      </div>
      <ul className="flex flex-wrap gap-gui-m lg:col-span-3">{section.items.map(renderCard)}</ul>
    </section>
  );
}

function StateCard<T extends Inputs>({
  item,
  href,
  reviewed,
  comments,
  thumbnail,
}: {
  item: Item<T>;
  href: string;
  reviewed: boolean;
  comments: number;
  thumbnail: ReactNode;
}) {
  return (
    <li className="relative flex w-72 flex-col overflow-hidden rounded-gui-m bg-gui-neutral-1 shadow-gui-s ring-1 ring-gui-border transition duration-gui ease-gui hover:ring-gui-neutral-4 has-focus-visible:gui-focus-ring motion-reduce:transition-none">
      {thumbnail}
      {reviewed || comments > 0 ? (
        <div className="absolute top-gui-xs right-gui-xs flex gap-gui-xxs">
          {comments > 0 ? (
            <Badge>
              <ChatCircleIcon aria-hidden />
              <span className="tabular-nums">{comments}</span>
              <span className="sr-only">{comments === 1 ? "open comment" : "open comments"}</span>
            </Badge>
          ) : null}
          {reviewed ? (
            <Badge variant="strong">
              <CheckIcon aria-hidden />
              Reviewed
            </Badge>
          ) : null}
        </div>
      ) : null}
      <div className="gui-divider-top flex flex-1 flex-col gap-gui-xxs p-gui-s">
        <h3 className="font-gui-medium">
          <Link href={href} className="outline-none after:absolute after:inset-0">
            {item.title}
          </Link>
        </h3>
        <p className="line-clamp-2 text-gui-s text-gui-neutral-7">{item.why}</p>
        {item.origin === "code-only" || item.kind === "sequence" ? (
          <div className="mt-auto flex flex-wrap gap-gui-xxs pt-gui-xs">
            {item.kind === "sequence" ? <Badge>{item.steps.length} steps</Badge> : null}
            {item.origin === "code-only" ? <Badge>Code-only</Badge> : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}
