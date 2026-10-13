"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CopyIcon, GitBranchIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatReview } from "./agent-export";
import { CornerChips, FooterChips, chipText } from "./card-chips";
import { Logo } from "./logo";
import { frameHref, listFrames, viewportOf, type Inputs, type Item, type Manifest, type Section } from "./manifest";
import { useReview } from "./store";
import { Thumbnail } from "./thumbnail";
import { Button, ThemeScope } from "./ui";

/**
 * Where a section's title sits and how its states wrap:
 * - side: title in a column on the left, states filling even columns beside it.
 * - above: title over the states, which fill even columns across the full width.
 * - scroll: title over one row of states that scrolls sideways.
 */
export type HubLayout = "side" | "above" | "scroll";
/** Rounded cards on the page, or full-width bands ruled off from each other by horizontal lines. */
export type HubLook = "cards" | "grid";
/**
 * What's grey. Cards: "grey" is a grey page with white cards, otherwise a
 * white page with grey cards. Grid: "grey" is a grey page (titles included)
 * with the states on white, "grey-states" the reverse, "white" neither.
 */
export type HubSurface = "white" | "grey" | "grey-states";

type HubProps<T extends Inputs> = {
  manifest: Manifest<T>;
  /** A rendered screen for each item id (first step for sequences). */
  thumbnails: Record<string, ReactNode>;
  layout?: HubLayout;
  look?: HubLook;
  surface?: HubSurface;
  /** Narrowest a state's screen gets in px (its exact width in a scrolling row); the height follows at 16:10. */
  thumbWidth?: number;
};

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

/** Where a line of text's baseline sits, from a zero-size inline box placed on it for the moment of measuring. */
function baselineOf(text: HTMLElement) {
  const probe = document.createElement("span");
  probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
  text.prepend(probe);
  const y = probe.getBoundingClientRect().top;
  probe.remove();
  return y;
}

/**
 * Lines the index up with the page. The header's height goes on the hub as
 * --hub-header, so the index's top block matches it. The index list is then
 * pushed down until its first link's text shares a baseline with the first
 * section's title. Both are measured, and remeasured whenever the header or
 * the content changes size (wrapping, a new layout, fonts arriving).
 */
function useIndexAlignment() {
  const root = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLElement>(null);
  const main = useRef<HTMLElement>(null);
  const index = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const align = () => {
      const headerNode = header.current;
      const list = index.current;
      const title = main.current?.querySelector<HTMLElement>("section h2");
      const label = list?.querySelector<HTMLElement>("[data-index-label]");
      if (!headerNode || !list || !title || !label) return;
      root.current?.style.setProperty("--hub-header", `${headerNode.offsetHeight}px`);
      // The index is sticky at the top; compare both as if the page were scrolled to the top.
      const titleBaseline = baselineOf(title) + window.scrollY;
      const nav = list.parentElement;
      const labelBaseline = baselineOf(label) - (nav?.getBoundingClientRect().top ?? 0) + (nav?.scrollTop ?? 0);
      const padding = parseFloat(getComputedStyle(list).paddingTop) || 0;
      list.style.paddingTop = `${Math.max(0, padding + titleBaseline - labelBaseline)}px`;
    };
    const observer = new ResizeObserver(align);
    if (header.current) observer.observe(header.current);
    if (main.current) observer.observe(main.current);
    void document.fonts?.ready.then(align);
    return () => observer.disconnect();
  }, []);
  return { root, header, main, index };
}

export function Hub<T extends Inputs>({ manifest, thumbnails, layout = "side", look = "cards", surface = "white", thumbWidth = 352 }: HubProps<T>) {
  useRestoredScroll();
  const { root, header, main, index } = useIndexAlignment();
  const { annotations, viewed } = useReview(manifest);
  const frames = listFrames(manifest);
  const firstFrameOf = (item: Item<T>) => frames.find((frame) => frame.item.id === item.id) ?? frames[0];
  const commentsOn = (item: Item<T>) =>
    annotations.filter((a) => a.status === "open" && (a.stateId === item.id || a.stateId.startsWith(`${item.id}/`))).length;
  const current = useCurrentSection(manifest.sections.map((section) => section.id));
  const grid = look === "grid";
  // Cards have no states-only fill, so either grey means the grey page.
  const greyPage = grid ? surface === "grey" : surface !== "white";

  return (
    <ThemeScope
      ref={root}
      style={{ "--state-min": `${thumbWidth}px` } as CSSProperties}
      className={cn(
        "flex min-h-dvh flex-1",
        // On a grey page the cards (or the grid's states) are white; on a white page the cards are grey.
        greyPage ? (grid ? "bg-gui-neutral-2" : "bg-gui-neutral-3") : "bg-gui-neutral-1",
      )}
    >
      <nav aria-label="Sections" className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto bg-gui-neutral-2 px-gui-m gui-divider-end md:flex">
        {/* As tall as the header with the same top padding, so the name sits level with the repo name. */}
        <div className="flex gui-hub-header-height shrink-0 items-start pt-gui-l">
          <Brand className="gui-control px-gui-xs" />
        </div>
        <ul ref={index} className="flex flex-col pb-gui-l">
          {manifest.sections.map((section) => (
            <IndexLink key={section.id} id={section.id} current={current === section.id}>
              {section.title}
            </IndexLink>
          ))}
        </ul>
      </nav>

      <main ref={main} className="flex min-w-0 flex-1 flex-col">
        {/* Cards set the content apart on their own; the grid rules the header off like every other edge. */}
        <header
          ref={header}
          className={cn(
            "flex flex-wrap items-center justify-between gap-x-gui-l gap-y-gui-s py-gui-l",
            // In the grid every start edge is a cell's XL padding; cards sit in XXL page margins.
            grid ? "gui-divider-bottom px-gui-xl" : "px-gui-m md:px-gui-xxl",
          )}
        >
          <div className="flex min-w-0 flex-col gap-gui-s">
            {/* Below md the index is hidden, so the brand moves here. */}
            <Brand className="md:hidden" />
            <div className="flex min-w-0 flex-wrap items-center gap-x-gui-l gap-y-gui-xs">
              {/* One control tall, like Copy comments and the brand beside it, so all three share a centre line. */}
              <h1 className="flex min-w-0 gui-control items-center gap-gui-xs text-gui-m font-gui-medium wrap-anywhere">
                {/* The app's own favicon, decorative beside its repo name. */}
                <Image src={manifest.scope.icon} alt="" width={20} height={20} className="size-5 shrink-0 rounded-gui-xs" />
                {manifest.scope.repo}
              </h1>
              <p className="flex min-w-0 flex-wrap items-center gap-gui-xs text-gui-s text-gui-neutral-7">
                <GitBranchIcon aria-hidden className="text-gui-m text-gui-neutral-10" />
                <span className="sr-only">Reviewing</span>
                <BranchName greyPage={greyPage && !grid}>{manifest.scope.branch}</BranchName>
                vs
                <BranchName greyPage={greyPage && !grid}>{manifest.scope.base}</BranchName>
              </p>
            </div>
          </div>
          <CopyComments manifest={manifest} />
        </header>

        <div className={cn("flex flex-col", grid ? "pb-gui-xxl" : "gap-gui-m px-gui-m pb-gui-xxl md:px-gui-xxl")}>
          {manifest.sections.map((section) => (
            <SectionBlock key={section.id} id={section.id} title={section.title} why={section.why} layout={layout} look={look} surface={surface}>
              {section.items.map((item) => (
                <StateCard
                  key={item.id}
                  item={item}
                  href={frameHref(manifest, firstFrameOf(item))}
                  viewport={viewportOf(manifest, firstFrameOf(item).inputs)}
                  comments={commentsOn(item)}
                  viewed={viewed.includes(item.id)}
                  thumbnail={thumbnails[item.id]}
                  className={cn(layout === "scroll" && "gui-state-row-item snap-start")}
                />
              ))}
            </SectionBlock>
          ))}
        </div>
      </main>
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

function IndexLink({ id, current, children }: { id: string; current: boolean; children: ReactNode }) {
  return (
    <li className="flex">
      <a
        href={`#${id}`}
        aria-current={current ? "location" : undefined}
        className="flex h-8 flex-1 items-center rounded-gui-s px-gui-xs text-gui-s text-gui-neutral-10 outline-none transition-colors duration-gui ease-gui hover:bg-gui-neutral-3 focus-visible:gui-focus-ring aria-[current]:bg-gui-neutral-3 aria-[current]:font-gui-medium motion-reduce:transition-none"
      >
        {/* Its own inline box, so the index can measure the label's baseline (useIndexAlignment). */}
        <span data-index-label="">{children}</span>
      </a>
    </li>
  );
}

function BranchName({ greyPage, children }: { greyPage: boolean; children: ReactNode }) {
  return (
    <code className={cn("rounded-gui-xs px-gui-xxs font-gui-data text-gui-neutral-10 wrap-anywhere", greyPage ? "bg-gui-neutral-1" : "bg-gui-neutral-3")}>{children}</code>
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
        toast.success(`Copied ${open.length} ${open.length === 1 ? "comment" : "comments"} from ${states} ${states === 1 ? "state" : "states"}`, {
          description: "Each with its state’s URL and inputs, ready to paste to your agent.",
        }),
      )
      .catch(() => toast.error("Couldn’t copy. Allow clipboard access for this site in your browser, then copy again."));
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
 * One section: its title and question, and its states.
 *
 * As a card it's a rounded surface on the page, with the title beside or
 * above the states. In the grid it's a full-width band ruled off below. The
 * title and the states are set apart by space alone when both are white, and
 * by a fill and a rule on the edge between them when one of them is grey.
 */
function SectionBlock({
  id,
  title,
  why,
  layout,
  look,
  surface,
  children,
}: Pick<Section, "id" | "title" | "why"> & { layout: HubLayout; look: HubLook; surface: HubSurface; children: ReactNode }) {
  const headingId = `${id}-title`;
  const side = layout === "side";
  const grid = look === "grid";
  const greyPage = grid ? surface === "grey" : surface !== "white";
  // The grid's states area: its own fill, padded like the title, and only the
  // title's padding between them when both share a fill and stack.
  const statesArea =
    grid &&
    cn(
      "p-gui-xl",
      surface === "grey" && "bg-gui-neutral-1",
      surface === "grey-states" && "bg-gui-neutral-2",
      surface === "white" && (side ? "max-lg:pt-0" : "pt-0"),
    );
  // Where the title and the states differ in fill, the edge between them is ruled too.
  const filled = grid && surface !== "white";
  const heading = (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-gui-xxs",
        grid ? ["p-gui-xl", side && "lg:w-80"] : side && "lg:w-56",
        filled && (side ? "max-lg:gui-divider-bottom lg:gui-divider-end" : "gui-divider-bottom"),
      )}
    >
      <h2 id={headingId} className="text-gui-l font-gui-medium text-balance">
        {title}
      </h2>
      <p className="max-w-prose text-gui-m text-gui-neutral-7">{why}</p>
    </div>
  );

  // The states, in whichever arrangement the layout calls for.
  let states: ReactNode;
  if (layout === "scroll") {
    states = (
      // Relative, so the cards' absolutely placed sr-only text scrolls and clips with the row instead of widening the page.
      <ul
        className={cn(
          "relative flex snap-x snap-mandatory gap-gui-l overflow-x-auto overscroll-x-contain",
          // The row bleeds to the band's or card's edges and snaps to its padding; top room keeps a flow's fanned-out cards in view.
          grid ? [statesArea, "scroll-px-gui-xl"] : "-mx-gui-l px-gui-l pt-gui-xs pb-gui-s scroll-px-gui-l md:-mx-gui-xl md:px-gui-xl md:scroll-px-gui-xl",
        )}
      >
        {children}
      </ul>
    );
  } else {
    states = (
      <div className={cn("min-w-0 flex-1", statesArea)}>
        <ul className={cn("gui-states-fill gap-gui-l", !grid && "pt-gui-xxs")}>{children}</ul>
      </div>
    );
  }

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        "flex min-w-0 scroll-mt-gui-m flex-col",
        side && "lg:flex-row",
        grid
          ? "gui-band-rule"
          : ["gap-gui-l rounded-gui-m p-gui-l md:p-gui-xl", side && "lg:gap-gui-xxl", greyPage ? "bg-gui-neutral-1" : "bg-gui-neutral-3"],
      )}
    >
      {heading}
      {states}
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
  viewport,
  comments,
  viewed,
  thumbnail,
  className,
}: {
  item: Item<T>;
  href: string;
  viewport: "desktop" | "mobile";
  comments: number;
  viewed: boolean;
  thumbnail: ReactNode;
  className?: string;
}) {
  const details = chipText(item, viewed);
  return (
    <li className={cn("flex min-w-0 flex-col gap-gui-xs", className)}>
      {/* Out of the tab order and the accessibility tree: the title link below is the same link. */}
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden
        onClick={rememberScroll}
        className="group relative block rounded-gui-s outline-none transition-transform duration-gui ease-gui active:gui-press-scale motion-reduce:transition-none"
      >
        {item.kind === "sequence" ? <FlowStack /> : null}
        <Thumbnail
          viewport={viewport}
          size="fluid"
          className="transition-shadow duration-gui ease-gui group-hover:shadow-gui-m group-hover:ring-gui-neutral-6 motion-reduce:transition-none"
        >
          {thumbnail}
        </Thumbnail>
        <CornerChips comments={comments} viewed={viewed} />
        <FooterChips item={item} />
      </Link>
      <div className="flex flex-col">
        <h3 className="line-clamp-1 text-gui-m">
          <Link
            href={href}
            aria-describedby={`card-${item.id}-details`}
            onClick={rememberScroll}
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
