"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Check, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { frameHref, listFrames, listItems, viewportOf, type Inputs, type Item, type Manifest, type Section } from "./manifest";
import { useReview } from "./store";
import { Thumbnail } from "./thumbnail";

type HubProps<T extends Inputs> = {
  manifest: Manifest<T>;
  /** A rendered screen for each item id (first step for sequences). */
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

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-4">
        <p className="font-medium">Stateview</p>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{manifest.screen}</h1>
          <p className="text-muted-foreground">
            Reviewing <code className="font-mono text-foreground">{manifest.scope.branch}</code> against{" "}
            <code className="font-mono text-foreground">{manifest.scope.base}</code> · {manifest.scope.files} files changed
          </p>
          <p className="tabular-nums">
            {items.length} states in {manifest.sections.length} sections · {reviewedCount} of {items.length} reviewed ·{" "}
            {manifest.uncovered.length} combinations not covered
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={frameHref(manifest, nextFrame)} className={buttonVariants({ size: "lg" })}>
            {reviewedCount === 0 ? "Start review" : reviewedCount === items.length ? "Review again" : "Continue review"}
          </Link>
        </div>
        <details className="max-w-prose text-muted-foreground">
          <summary className="w-fit cursor-pointer rounded-sm text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            What this review doesn’t cover
          </summary>
          <div className="flex flex-col gap-2 pt-2">
            <p>Combinations no state shows:</p>
            <ul className="list-disc pl-5">
              {manifest.uncovered.map((combination) => (
                <li key={combination}>{combination}</li>
              ))}
            </ul>
            <p>Left out because no real account can be in them:</p>
            <ul className="list-disc pl-5">
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
              viewport={viewportOf(manifest, firstFrameOf(item).inputs)}
              reviewed={reviewed.includes(item.id)}
              comments={commentsOn(item)}
              thumbnail={thumbnails[item.id]}
            />
          )}
        />
      ))}
    </main>
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
    <section aria-labelledby={headingId} className="flex flex-col gap-4 border-t pt-4 lg:grid lg:grid-cols-4 lg:gap-8">
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="font-semibold">
          {section.title}
        </h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          {done} of {section.items.length} reviewed
        </p>
        <p className="text-sm text-pretty text-muted-foreground">{section.why}</p>
      </div>
      <ul className="flex flex-wrap gap-4 lg:col-span-3">{section.items.map(renderCard)}</ul>
    </section>
  );
}

function StateCard<T extends Inputs>({
  item,
  href,
  viewport,
  reviewed,
  comments,
  thumbnail,
}: {
  item: Item<T>;
  href: string;
  viewport: "desktop" | "mobile";
  reviewed: boolean;
  comments: number;
  thumbnail: ReactNode;
}) {
  return (
    <li className="relative flex w-72 flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
      <Thumbnail viewport={viewport}>{thumbnail}</Thumbnail>
      {reviewed || comments > 0 ? (
        <div className="absolute top-2 right-2 flex gap-1">
          {comments > 0 ? (
            <Badge variant="secondary">
              <MessageSquare aria-hidden />
              <span className="tabular-nums">{comments}</span>
              <span className="sr-only">{comments === 1 ? "open comment" : "open comments"}</span>
            </Badge>
          ) : null}
          {reviewed ? (
            <Badge>
              <Check aria-hidden />
              Reviewed
            </Badge>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="font-medium text-pretty">
          <Link href={href} className="outline-none after:absolute after:inset-0">
            {item.title}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{item.why}</p>
        {item.origin === "code-only" || item.kind === "sequence" ? (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-1.5">
            {item.kind === "sequence" ? <Badge variant="outline">{item.steps.length} steps</Badge> : null}
            {item.origin === "code-only" ? <Badge variant="outline">Code-only</Badge> : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}
