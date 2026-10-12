"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { CopyIcon, GitBranchIcon } from "@phosphor-icons/react";
import { formatReview } from "./agent-export";
import { CornerChips, FooterChips, chipText } from "./card-chips";
import { cn } from "./cn";
import { Logo } from "./logo";
import { frameHref, listFrames, viewportOf, type Inputs, type Item, type Manifest, type Section, type Uncovered } from "./manifest";
import { useReview } from "./store";
import { InputsThumbnail, Thumbnail, inputChanges } from "./thumbnail";
import { StateviewToaster, notify } from "./toast";
import { Button, ThemeScope } from "./ui";

type HubProps<T extends Inputs> = {
  manifest: Manifest<T>;
  /**
   * A rendered screen for each item id (first step for sequences). Items
   * without one show the inputs they change instead, for screens that can't
   * render many live copies at once (WebGL maps, video).
   */
  thumbnails: Record<string, ReactNode>;
};

const UNCOVERED_ID = "not-covered";

/*
 * Where the reviewer was on the hub, so coming back from a state lands on the
 * same row. Saved when a card is opened (not on every scroll, which would also
 * catch the jump to the top during navigation) and restored on the way back,
 * retrying for a few frames until the page is tall enough to reach it.
 */
const SCROLL_KEY = "stateview:hub-scroll";

function rememberScroll() {
  try {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
  } catch {
    // Storage blocked: nothing to remember.
  }
}

function useRestoredScroll() {
  useEffect(() => {
    let saved = 0;
    try {
      saved = Number(sessionStorage.getItem(SCROLL_KEY)) || 0;
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
  }, []);
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

export function Hub<T extends Inputs>({ manifest, thumbnails }: HubProps<T>) {
  useRestoredScroll();
  const { annotations, viewed } = useReview(manifest);
  const frames = listFrames(manifest);
  const firstFrameOf = (item: Item<T>) => frames.find((frame) => frame.item.id === item.id) ?? frames[0];
  const commentsOn = (item: Item<T>) =>
    annotations.filter((a) => a.status === "open" && (a.stateId === item.id || a.stateId.startsWith(`${item.id}/`))).length;
  const sectionIds = [...manifest.sections.map((section) => section.id), ...(manifest.uncovered.length > 0 ? [UNCOVERED_ID] : [])];
  const current = useCurrentSection(sectionIds);

  const previewOf = (item: Item<T>) => {
    const inputs = firstFrameOf(item).inputs;
    const className = "transition-shadow duration-gui ease-gui group-hover:shadow-gui-m group-hover:ring-gui-neutral-6 motion-reduce:transition-none";
    return item.id in thumbnails ? (
      <Thumbnail viewport={viewportOf(manifest, inputs)} size="card" className={className}>
        {thumbnails[item.id]}
      </Thumbnail>
    ) : (
      <InputsThumbnail size="card" className={className} changes={inputChanges(manifest, inputs)} />
    );
  };

  return (
    <ThemeScope className="flex min-h-dvh flex-1 bg-gui-neutral-1">
      <nav aria-label="Sections" className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-gui-l overflow-y-auto bg-gui-neutral-2 px-gui-m py-gui-l gui-divider-end md:flex">
        <Brand className="px-gui-xs" />
        <ul className="flex flex-col">
          {manifest.sections.map((section) => (
            <IndexLink key={section.id} id={section.id} current={current === section.id}>
              {section.title}
            </IndexLink>
          ))}
          {manifest.uncovered.length > 0 ? (
            <>
              <li aria-hidden className="flex h-gui-m items-center px-gui-xs">
                <span className="h-px flex-1 bg-gui-border" />
              </li>
              <IndexLink id={UNCOVERED_ID} current={current === UNCOVERED_ID} muted>
                Not covered
              </IndexLink>
            </>
          ) : null}
        </ul>
      </nav>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-x-gui-l gap-y-gui-s px-gui-m py-gui-m gui-divider-bottom md:px-gui-xxl">
          <div className="flex min-w-0 flex-col gap-gui-s">
            {/* Below md the index is hidden, so the brand moves here. */}
            <Brand className="md:hidden" />
            <div className="flex min-w-0 flex-wrap items-center gap-x-gui-l gap-y-gui-xs">
              <h1 className="flex min-w-0 items-center gap-gui-xs text-gui-m font-gui-medium wrap-anywhere">
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
                <code className="rounded-gui-xs bg-gui-neutral-3 px-gui-xxs font-gui-data text-gui-neutral-10 wrap-anywhere">{manifest.scope.branch}</code>
                vs
                <code className="rounded-gui-xs bg-gui-neutral-3 px-gui-xxs font-gui-data text-gui-neutral-10 wrap-anywhere">{manifest.scope.base}</code>
              </p>
            </div>
          </div>
          <CopyComments manifest={manifest} />
        </header>

        <div className="flex flex-col px-gui-m pb-gui-xxl md:px-gui-xxl">
          {manifest.sections.map((section) => (
            <SectionRow key={section.id} id={section.id} title={section.title} why={section.why}>
              {section.items.map((item) => (
                <StateCard
                  key={item.id}
                  item={item}
                  href={frameHref(manifest, firstFrameOf(item))}
                  comments={commentsOn(item)}
                  viewed={viewed.includes(item.id)}
                  preview={previewOf(item)}
                />
              ))}
            </SectionRow>
          ))}
          {manifest.uncovered.length > 0 ? (
            <SectionRow
              id={UNCOVERED_ID}
              title="Not covered"
              why="Combinations of inputs no state above shows. Add one to the manifest or leave it out on purpose."
              aside={
                manifest.excluded.length > 0 ? (
                  <div className="flex flex-col gap-gui-xxs pt-gui-xs text-gui-s text-gui-neutral-7">
                    <p className="text-gui-neutral-10">Left out on purpose</p>
                    <ul className="flex flex-col gap-gui-xxs">
                      {manifest.excluded.map((combination) => (
                        <li key={combination}>{combination}</li>
                      ))}
                    </ul>
                  </div>
                ) : null
              }
              last
            >
              {manifest.uncovered.map((combination) => (
                <UncoveredCard key={combination.title} combination={combination} />
              ))}
            </SectionRow>
          ) : null}
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

function IndexLink({ id, current, muted, children }: { id: string; current: boolean; muted?: boolean; children: ReactNode }) {
  return (
    <li className="flex">
      <a
        href={`#${id}`}
        aria-current={current ? "location" : undefined}
        className={cn(
          "flex h-8 flex-1 items-center rounded-gui-s px-gui-xs text-gui-s outline-none transition-colors duration-gui ease-gui hover:bg-gui-neutral-3 focus-visible:gui-focus-ring aria-[current]:bg-gui-neutral-3 aria-[current]:font-gui-medium motion-reduce:transition-none",
          muted ? "text-gui-neutral-7" : "text-gui-neutral-10",
        )}
      >
        {children}
      </a>
    </li>
  );
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

/** One section: its title and question on the left, its states to the right. Stacks on phones. */
function SectionRow({
  id,
  title,
  why,
  aside,
  last,
  children,
}: Pick<Section, "id" | "title" | "why"> & { aside?: ReactNode; last?: boolean; children: ReactNode }) {
  const headingId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn("flex scroll-mt-gui-m flex-col gap-gui-m py-gui-m lg:flex-row lg:gap-gui-xl", !last && "gui-divider-bottom")}
    >
      <div className="flex shrink-0 flex-col gap-gui-xxs lg:w-46">
        <h2 id={headingId} className="text-gui-s font-gui-heavy">
          {title}
        </h2>
        <p className="text-gui-s text-gui-neutral-7">{why}</p>
        {aside}
      </div>
      {/* Top padding leaves room for a flow's fanned-out cards. */}
      <ul className="flex flex-wrap gap-gui-l pt-gui-xxs">{children}</ul>
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
}: {
  item: Item<T>;
  href: string;
  comments: number;
  viewed: boolean;
  /** The live thumbnail, or the inputs it changes. */
  preview: ReactNode;
}) {
  const details = chipText(item, viewed);
  return (
    <li className="flex w-min flex-col gap-gui-xs">
      {/* Out of the tab order and the accessibility tree: the title link below is the same link. */}
      <Link href={href} tabIndex={-1} aria-hidden onClick={rememberScroll} className="group relative block rounded-gui-s outline-none active:gui-press">
        {item.kind === "sequence" ? <FlowStack /> : null}
        {preview}
        <CornerChips comments={comments} viewed={viewed} />
        <FooterChips item={item} />
      </Link>
      <div className="flex flex-col">
        <h3 className="line-clamp-1 text-gui-s">
          <Link
            href={href}
            aria-describedby={`card-${item.id}-details`}
            onClick={rememberScroll}
            className="rounded-gui-xs underline-offset-2 outline-none hover:underline focus-visible:gui-focus-ring"
          >
            {item.title}
          </Link>
        </h3>
        <p id={`card-${item.id}-details`} className="text-gui-xs text-gui-neutral-7">
          {item.why}
          {comments > 0 ? <span className="sr-only">{` ${comments} open ${comments === 1 ? "comment" : "comments"}.`}</span> : null}
          {details ? <span className="sr-only">{` ${details}.`}</span> : null}
        </p>
      </div>
    </li>
  );
}

/** Two blank cards fanned out behind a flow's first screen, so a flow reads as several screens. */
function FlowStack() {
  return (
    <>
      <span
        aria-hidden
        className="absolute inset-0 translate-x-gui-m -translate-y-gui-xs rounded-gui-s bg-gui-neutral-2 ring-1 ring-gui-border transition-transform duration-gui ease-gui group-hover:translate-x-gui-l motion-reduce:transition-none"
      />
      <span
        aria-hidden
        className="absolute inset-0 translate-x-gui-xs -translate-y-gui-xxs rounded-gui-s bg-gui-neutral-1 ring-1 ring-gui-border transition-transform duration-gui ease-gui group-hover:translate-x-gui-s motion-reduce:transition-none"
      />
    </>
  );
}

/** A combination no state shows: its inputs in a dashed outline where the screen would be. */
function UncoveredCard<T extends Inputs>({ combination }: { combination: Uncovered<T> }) {
  return (
    <li className="flex w-min flex-col gap-gui-xs">
      <div className="flex gui-thumb-card flex-col justify-center gap-gui-xxs rounded-gui-s px-gui-m font-gui-data text-gui-xs outline-1 -outline-offset-1 outline-gui-neutral-5 outline-dashed">
        {Object.entries(combination.set).map(([id, value]) => (
          <span key={id}>{`${id}: ${String(value)}`}</span>
        ))}
      </div>
      <div className="flex flex-col">
        <h3 className="text-gui-s">{combination.title}</h3>
        <p className="text-gui-xs text-gui-neutral-7">No state yet</p>
      </div>
    </li>
  );
}
