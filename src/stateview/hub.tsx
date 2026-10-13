"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { CopyIcon, GitBranchIcon } from "@phosphor-icons/react";
import { formatReview } from "./agent-export";
import { CornerChips, FooterChips, chipText } from "./card-chips";
import { cn } from "./cn";
import { Logo } from "./logo";
import { frameHref, listFrames, viewportOf, type Inputs, type Item, type Manifest, type Section } from "./manifest";
import { NightSky } from "./night-sky";
import { useReview } from "./store";
import { InputsThumbnail, Thumbnail, inputChanges } from "./thumbnail";
import { StateviewToaster, notify } from "./toast";
import { Button, Select, ThemeScope } from "./ui";

type HubProps<T extends Inputs> = {
  manifest: Manifest<T>;
  /**
   * A rendered screen for each item id (first step for sequences). Items
   * without one show the inputs they change instead, for screens that can't
   * render many live copies at once (WebGL maps, video).
   */
  thumbnails: Record<string, ReactNode>;
  /** Every review this app serves, for the switcher at the foot of the index. With fewer than two there is no switcher. */
  reviews?: ReviewLink[];
};

/** A review the switcher can open: its manifest id, a label and its hub route. */
export type ReviewLink = { id: string; label: string; hub: string };

const NO_REVIEWS: ReviewLink[] = [];

/*
 * Where the reviewer was on the hub, so coming back from a state lands on the
 * same row. Saved when a card is opened (not on every scroll, which would also
 * catch the jump to the top during navigation) and restored on the way back,
 * retrying for a few frames until the page is tall enough to reach it.
 */
function scrollKey(reviewId: string) {
  return `stateview:hub-scroll:${reviewId}`;
}

function rememberScroll(reviewId: string) {
  try {
    sessionStorage.setItem(scrollKey(reviewId), String(window.scrollY));
  } catch {
    // Storage blocked: nothing to remember.
  }
}

function useRestoredScroll(reviewId: string) {
  useEffect(() => {
    let saved = 0;
    try {
      saved = Number(sessionStorage.getItem(scrollKey(reviewId))) || 0;
    } catch {
      // Storage blocked: start at the top.
    }
    if (saved <= 0) return;
    let tries = 0;
    let frame = requestAnimationFrame(function restore() {
      window.scrollTo(0, saved);
      if (Math.abs(window.scrollY - saved) > 1 && ++tries < 10) frame = requestAnimationFrame(restore);
    });
    return () => cancelAnimationFrame(frame);
  }, [reviewId]);
}

// A section is current once its top is this close to the top of the window.
const CURRENT_LINE_PX = 120;

/** The section whose top has most recently scrolled up to near the top of the window. */
function useCurrentSection(ids: string[]) {
  const [current, setCurrent] = useState(ids[0]);
  const key = ids.join(" ");
  useEffect(() => {
    const update = () => {
      const line = CURRENT_LINE_PX;
      let found = key.split(" ")[0];
      for (const id of key.split(" ")) {
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= line) found = id;
      }
      // At the very bottom the last sections can't reach the line, so the last one counts.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) found = key.split(" ").at(-1) ?? found;
      setCurrent(found);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [key]);
  return current;
}

export function Hub<T extends Inputs>({ manifest, thumbnails, reviews = NO_REVIEWS }: HubProps<T>) {
  useRestoredScroll(manifest.id);
  const { annotations, viewed } = useReview(manifest);
  const frames = listFrames(manifest);
  const firstFrameOf = (item: Item<T>) => frames.find((frame) => frame.item.id === item.id) ?? frames[0];
  const commentsOn = (item: Item<T>) =>
    annotations.filter((a) => a.status === "open" && (a.stateId === item.id || a.stateId.startsWith(`${item.id}/`))).length;
  const current = useCurrentSection(manifest.sections.map((section) => section.id));

  const previewOf = (item: Item<T>) => {
    const inputs = firstFrameOf(item).inputs;
    const className = "transition-shadow duration-gui ease-gui group-hover:shadow-gui-card-hover";
    return item.id in thumbnails ? (
      <Thumbnail viewport={viewportOf(manifest, inputs)} size="fluid" className={className}>
        {thumbnails[item.id]}
      </Thumbnail>
    ) : (
      <InputsThumbnail size="fluid" className={className} changes={inputChanges(manifest, inputs)} />
    );
  };

  return (
    <ThemeScope className="flex min-h-dvh flex-1 bg-gui-neutral-1">
      <NightSky />
      <nav aria-label="Sections" className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto bg-gui-neutral-2 px-gui-m gui-divider-end md:flex">
        {/* One control tall with the header's top padding, so the name sits level with the repo name; the sections follow straight after. */}
        <div className="flex shrink-0 pt-gui-l pb-gui-m">
          <Brand className="gui-control px-gui-xs" />
        </div>
        <ul className="flex flex-col pb-gui-l">
          {manifest.sections.map((section) => (
            <IndexLink key={section.id} id={section.id} current={current === section.id}>
              {section.title}
            </IndexLink>
          ))}
        </ul>
        {/* Pinned to the foot of the index, below the sections. */}
        <ReviewSwitcher reviews={reviews} current={manifest.id} className="sticky bottom-0 mt-auto bg-gui-neutral-2 py-gui-m" />
      </nav>

      <main className="flex min-w-0 flex-1 flex-col">
        {/* Grey like the index, ruled off like every band below it, and inset to the same XL start edge. */}
        <header
          className="flex flex-wrap items-center justify-between gap-x-gui-l gap-y-gui-s bg-gui-neutral-2 px-gui-xl py-gui-l gui-divider-bottom"
        >
          <div className="flex min-w-0 flex-col gap-gui-s">
            {/* Below md the index is hidden, so the brand and the switcher move here. */}
            <div className="flex flex-wrap items-center justify-between gap-gui-s md:hidden">
              <Brand />
              <ReviewSwitcher reviews={reviews} current={manifest.id} labelHidden className="-me-gui-xs" />
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-x-gui-l gap-y-gui-xs">
              {/* One control tall, like Copy comments and the brand beside it, so all three share a centre line. */}
              <h1 className="flex min-w-0 gui-control items-center gap-gui-xs text-gui-m font-gui-medium wrap-anywhere">
                {/* The app's own favicon, decorative beside its repo name. */}
                {manifest.scope.icon ? (
                  // oxlint-disable-next-line nextjs/no-img-element -- the engine is vendored into apps whose next/image config (loader, basePath, export) it can't know; a 20 px favicon gains nothing from optimization
                  <img src={manifest.scope.icon} alt="" width={20} height={20} className="size-5 shrink-0 rounded-gui-xs" />
                ) : null}
                {manifest.scope.repo}
              </h1>
              <p className="flex min-w-0 flex-wrap items-center gap-gui-xs text-gui-s text-gui-neutral-7">
                <GitBranchIcon aria-hidden className="text-gui-m text-gui-neutral-10" />
                <span className="sr-only">Reviewing</span>
                <BranchName>{manifest.scope.branch}</BranchName>
                {manifest.scope.base && manifest.scope.base !== manifest.scope.branch ? (
                  <>
                    vs
                    <BranchName>{manifest.scope.base}</BranchName>
                  </>
                ) : null}
              </p>
              {manifest.scope.diff ? <DiffStat {...manifest.scope.diff} /> : null}
            </div>
          </div>
          <CopyComments manifest={manifest} />
        </header>

        <div className="flex flex-col pb-gui-xxl">
          {manifest.sections.map((section) => (
            <SectionBlock key={section.id} id={section.id} title={section.title} why={section.why}>
              {section.items.map((item) => (
                <StateCard
                  key={item.id}
                  item={item}
                  href={frameHref(manifest, firstFrameOf(item))}
                  comments={commentsOn(item)}
                  viewed={viewed.includes(item.id)}
                  preview={previewOf(item)}
                  onOpen={() => rememberScroll(manifest.id)}
                />
              ))}
            </SectionBlock>
          ))}
        </div>
      </main>
      <StateviewToaster />
    </ThemeScope>
  );
}

/** Stateview's mark with its name set in the UI face. */
function Brand({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-center gap-gui-xs text-gui-m font-gui-heavy", className)}>
      <Logo className="h-4 w-auto" />
      Stateview
    </p>
  );
}

/**
 * Picks which review the hub shows, as a small select like the state panel's.
 * Each review has its own hub route, so switching is a navigation.
 */
function ReviewSwitcher({
  reviews,
  current,
  labelHidden = false,
  className,
}: {
  reviews: ReviewLink[];
  current: string;
  /** In the phone header the select sits on the brand's line, so its label is for screen readers only. */
  labelHidden?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const labelId = useId();
  if (reviews.length < 2) return null;
  const open = (id: string) => {
    const review = reviews.find((r) => r.id === id);
    if (!review || review.id === current) return;
    // A review another app serves (its own dev server, say) is a full page load, not a route in this one.
    if (/^https?:\/\//.test(review.hub)) window.location.assign(review.hub);
    else router.push(review.hub);
  };
  return (
    <div className={cn("flex flex-col gap-gui-xxs", className)}>
      <span id={labelId} className={cn("px-gui-xs text-gui-xs text-gui-neutral-7", labelHidden && "sr-only")}>
        Review
      </span>
      <Select
        aria-labelledby={labelId}
        value={current}
        onValueChange={open}
        options={reviews.map((review) => ({ value: review.id, label: review.label }))}
        scheme="light"
      />
    </div>
  );
}

function IndexLink({ id, current, children }: { id: string; current: boolean; children: ReactNode }) {
  return (
    <li className="flex">
      {/* A router link, not a plain anchor: Back from a state to a #section entry the router didn't make would leave the state on screen. */}
      <Link
        href={`#${id}`}
        aria-current={current ? "location" : undefined}
        className="flex h-8 flex-1 items-center rounded-gui-s px-gui-xs text-gui-s text-gui-neutral-10 outline-none transition-colors duration-gui ease-gui hover:bg-gui-neutral-3 focus-visible:gui-focus-ring aria-[current]:bg-gui-neutral-3 aria-[current]:font-gui-medium motion-reduce:transition-none"
      >
        {children}
      </Link>
    </li>
  );
}

/** How big the change is: files, then lines added and removed. */
function DiffStat({ files, additions, deletions }: { files: number; additions: number; deletions: number }) {
  return (
    <p className="font-gui-data text-gui-s text-gui-neutral-7 tabular-nums">
      {files} {files === 1 ? "file" : "files"} · <span aria-label={`${additions} lines added`}>+{additions}</span>{" "}
      <span aria-label={`${deletions} lines removed`}>−{deletions}</span>
    </p>
  );
}

function BranchName({ children }: { children: ReactNode }) {
  return <code className="rounded-gui-xs bg-gui-neutral-3 px-gui-xxs font-gui-data text-gui-neutral-10 wrap-anywhere">{children}</code>;
}

/** Copies every open comment in the review, state by state, as Markdown for a coding agent. */
function CopyComments<T extends Inputs>({ manifest }: { manifest: Manifest<T> }) {
  const { annotations } = useReview(manifest);
  const open = annotations.filter((a) => a.status === "open");
  const states = new Set(open.map((a) => a.stateId)).size;
  const copy = () => {
    void navigator.clipboard
      .writeText(formatReview(manifest, annotations))
      .then(() =>
        notify.success(`Copied ${open.length} ${open.length === 1 ? "comment" : "comments"} from ${states} ${states === 1 ? "state" : "states"}`, {
          description: "Each with its state’s URL and inputs, ready to paste to your agent.",
        }),
      )
      .catch(() => notify.error("Couldn’t copy. Allow clipboard access for this site in your browser, then copy again."));
  };
  return (
    <Button focusableWhenDisabled disabled={open.length === 0} onClick={copy}>
      <CopyIcon aria-hidden />
      Copy comments for your agent
      {open.length > 0 ? (
        <span className="rounded-gui-xs bg-gui-neutral-9 px-gui-xxs font-gui-data text-gui-xs text-gui-neutral-4 tabular-nums">
          {open.length}
          <span className="sr-only"> open</span>
        </span>
      ) : null}
    </Button>
  );
}

/**
 * One section: a full-width band ruled off below. Its title and question sit
 * on white, ruled off from its states, which run in one grey row that scrolls
 * sideways rather than wrapping, so a section always reads as one line.
 */
function SectionBlock({ id, title, why, children }: Pick<Section, "id" | "title" | "why"> & { children: ReactNode }) {
  const headingId = `${id}-title`;
  return (
    <section id={id} aria-labelledby={headingId} className="flex min-w-0 scroll-mt-gui-m flex-col gui-band-rule">
      <div className="flex flex-col gap-gui-xxs p-gui-xl gui-divider-bottom">
        <h2 id={headingId} className="text-gui-l font-gui-medium text-balance">
          {title}
        </h2>
        <p className="max-w-prose text-gui-m text-gui-neutral-7">{why}</p>
      </div>
      {/*
       * The row bleeds to the band's edges and snaps to the title's inset; its
       * padding leaves room for a flow's fanned-out cards. Relative, so the
       * cards' absolutely placed sr-only text scrolls and clips with the row
       * instead of widening the page.
       */}
      <ul className="relative flex snap-x snap-mandatory gap-gui-l overflow-x-auto overscroll-x-contain bg-gui-neutral-2 p-gui-xl scroll-px-gui-xl">
        {children}
      </ul>
    </section>
  );
}

/**
 * Two targets to the same state: the screen, for the pointer, and the title,
 * with its own hover, which is also the one keyboard stop and carries the
 * card's description. The description text between them isn't a link.
 */
function StateCard<T extends Inputs>({
  item,
  href,
  comments,
  viewed,
  preview,
  onOpen,
}: {
  item: Item<T>;
  href: string;
  comments: number;
  viewed: boolean;
  /** The live thumbnail, or the inputs it changes. */
  preview: ReactNode;
  onOpen: () => void;
}) {
  const details = chipText(item, viewed);
  return (
    <li className="flex min-w-0 gui-state-row-item snap-start flex-col gap-gui-xs">
      {/* Out of the tab order and the accessibility tree: the title link below is the same link. */}
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden
        onClick={onOpen}
        className="group relative block rounded-gui-s outline-none transition-transform duration-gui ease-gui motion-safe:hover:gui-hover-scale motion-safe:active:gui-press-scale"
      >
        {/* The scale sits on the link, so a flow's stacked cards grow and shrink with its first screen as one object. */}
        {item.kind === "sequence" ? <FlowStack steps={item.steps.length} /> : null}
        {preview}
        <CornerChips comments={comments} viewed={viewed} />
        <FooterChips item={item} />
      </Link>
      <div className="flex flex-col">
        <h3 className="line-clamp-1 text-gui-m">
          <Link
            href={href}
            aria-describedby={`card-${item.id}-details`}
            onClick={onOpen}
            className="rounded-gui-xs underline-offset-2 outline-none hover:underline focus-visible:gui-focus-ring"
          >
            {item.title}
          </Link>
        </h3>
        <p id={`card-${item.id}-details`} className="text-gui-s text-gui-neutral-7">
          {item.why}
          {comments > 0 ? <span className="sr-only">{` ${comments} open ${comments === 1 ? "comment" : "comments"}.`}</span> : null}
          {details ? <span className="sr-only">{` ${details}.`}</span> : null}
        </p>
      </div>
    </li>
  );
}

/**
 * Where each card behind a flow's first screen sits, nearest first. Three at
 * most: the farthest offset has to stay inside the row's padding, and the
 * footer chip already gives the exact step count.
 */
const FLOW_STACK_CARDS = [
  "translate-x-gui-xs -translate-y-gui-xxs bg-gui-neutral-1",
  "translate-x-gui-m -translate-y-gui-xs bg-gui-neutral-2",
  "translate-x-gui-l -translate-y-gui-s bg-gui-neutral-2",
];

/**
 * Blank cards fanned out behind a flow's first screen, one per further step,
 * so a flow reads as that many screens. They hold their offsets on hover and
 * take the same shadow as the screen, so the stack lifts as one.
 */
function FlowStack({ steps }: { steps: number }) {
  // Reversed so the farthest card paints first, behind the nearer ones.
  const cards = FLOW_STACK_CARDS.slice(0, Math.max(0, steps - 1)).toReversed();
  return (
    <>
      {cards.map((placement) => (
        <span
          key={placement}
          aria-hidden
          className={cn(
            "absolute inset-0 rounded-gui-s ring-1 ring-gui-border transition-shadow duration-gui ease-gui group-hover:shadow-gui-card-hover",
            placement,
          )}
        />
      ))}
    </>
  );
}
