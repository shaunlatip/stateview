"use client";

import { useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { ArrowLeftIcon, ArrowRightIcon, ArrowSquareOutIcon, ArrowUpRightIcon, GlobeIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Anchor } from "./anchor";
import { EXPERIMENT_ROWS, WORK, type Experiment, type WorkItem } from "./fixtures";
import { useCarousel, usePointerNear, type CarouselPosition } from "./hooks";
import type { PortfolioState } from "./state";

const newTab = { target: "_blank", rel: "noopener noreferrer" } as const;

/** The state's staged pointer/focus moment for the selected-work arrows. */
export type ArrowMoment = { pointer: PortfolioState["pointer"]; arrowFocus: PortfolioState["arrowFocus"] };

function CarouselArrow({
  dir,
  enabled,
  near,
  hover,
  focus,
  onStep,
}: {
  dir: "prev" | "next";
  enabled: boolean;
  near: boolean;
  hover: boolean;
  focus: boolean;
  onStep: () => void;
}) {
  const Icon = dir === "prev" ? ArrowLeftIcon : ArrowRightIcon;
  return (
    <button
      type="button"
      // aria-disabled, not disabled: a natively disabled button drops keyboard focus to <body> at the end.
      onClick={enabled ? onStep : undefined}
      aria-disabled={!enabled}
      aria-label={dir === "prev" ? "Scroll back" : "Scroll forward"}
      data-near={near || undefined}
      data-hover={hover || undefined}
      data-focus={focus || undefined}
      className="pf-arrow"
    >
      <Icon size={16} weight="regular" aria-hidden />
    </button>
  );
}

/** Prev/next pair for a carousel's header row; nothing when the track doesn't overflow. */
function CarouselNav({
  canPrev,
  canNext,
  step,
  near,
  moment,
}: {
  canPrev: boolean;
  canNext: boolean;
  step: (dir: 1 | -1) => void;
  near: boolean;
  moment: ArrowMoment | null;
}) {
  if (!canPrev && !canNext) return null;
  const stagedNear = moment !== null && moment.pointer !== "rest";
  // The staged hover sits on whichever direction can move.
  const hoverDir = moment?.pointer === "hover" ? (canNext ? "next" : "prev") : null;
  const focusDisabled = moment?.arrowFocus === "disabled";
  return (
    <div className="pf-arrows">
      <CarouselArrow
        dir="prev"
        enabled={canPrev}
        near={near || stagedNear}
        hover={hoverDir === "prev"}
        focus={focusDisabled && !canPrev}
        onStep={() => step(-1)}
      />
      <CarouselArrow
        dir="next"
        enabled={canNext}
        near={near || stagedNear}
        hover={hoverDir === "next"}
        focus={focusDisabled && !canNext}
        onStep={() => step(1)}
      />
    </div>
  );
}

function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="pf-heading">
      {children}
    </h2>
  );
}

/**
 * Card hover shell: the asset is the hover target and the primary link; the
 * caption below is the caller's. Hover shrinks the asset to 0.985 inside a 5%
 * plate and raises the ↗ chip (or the new-tab chip for links that leave).
 */
function HoverCard({
  href,
  external,
  interactive = true,
  secondary,
  asset,
  label,
  children,
}: {
  href: string;
  external: boolean;
  /** Custom assets stay interactive themselves; only the chip links out. */
  interactive?: boolean;
  secondary?: { href: string; label: string };
  asset: ReactNode;
  label: string;
  children: ReactNode;
}) {
  const Chip = external ? ArrowSquareOutIcon : ArrowUpRightIcon;
  return (
    <div className="relative block">
      <div className="pf-card-asset">
        <span aria-hidden className="pf-card-plate" />
        {interactive ? (
          <Anchor href={href} {...newTab} aria-label={label} data-visit={external || undefined} className="pf-card-link">
            <div className="pf-card-shrink">{asset}</div>
            <span aria-hidden className="pf-card-chip">
              <Chip size={15} weight="regular" />
            </span>
          </Anchor>
        ) : (
          <div className="pf-card-link">
            <div className="pf-card-shrink">{asset}</div>
            <Anchor href={href} {...newTab} aria-label={label} className="pf-card-chip">
              <Chip size={15} weight="regular" aria-hidden />
            </Anchor>
          </div>
        )}
        {secondary ? (
          <Anchor href={secondary.href} {...newTab} className="pf-secondary-chip">
            {secondary.label}
            <ArrowUpRightIcon size={13} weight="bold" aria-hidden />
          </Anchor>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function WorkMedia({ item }: { item: WorkItem }) {
  const media = item.media;
  if (media.kind === "image") {
    return (
      <div className="pf-media" style={{ "--pf-aspect": media.aspect } as CSSProperties}>
        {/* oxlint-disable-next-line nextjs/no-img-element -- static stills sized by their frame; next/image adds nothing here. */}
        <img src={media.src} alt="" decoding="async" />
      </div>
    );
  }
  return (
    <div className="pf-media" style={{ "--pf-aspect": "675 / 449" } as CSSProperties}>
      {/* oxlint-disable-next-line nextjs/no-img-element -- the painted backdrop, pinned while the card shrinks. */}
      <img src={media.backdrop} alt="" aria-hidden decoding="async" className="pf-media-backdrop" style={{ "--pf-pos": media.position } as CSSProperties} />
      {/* oxlint-disable-next-line nextjs/no-img-element -- the transparent UI layer over it. */}
      <img src={media.ui} alt="" decoding="async" className="pf-media-ui" />
    </div>
  );
}

/** Selected-work caption: title, description, then organization and time as two fields. */
function WorkCaption({ item }: { item: WorkItem }) {
  return (
    <div className="pf-caption">
      <Anchor href={item.href} {...newTab} className="pf-caption-link">
        <h3 className="pf-card-title">{item.title}</h3>
      </Anchor>
      <p className="pf-card-text">{item.description}</p>
      <p className="pf-card-meta">
        <span>{item.org}</span>
        <span>{item.time}</span>
      </p>
      {item.articleHref ? (
        <Anchor href={item.articleHref} {...newTab} aria-label="Open related article in a new tab" title="Read the related article" className="pf-globe">
          <GlobeIcon size={16} weight="regular" aria-hidden className="block shrink-0" />
          <span>Read article</span>
        </Anchor>
      ) : null}
    </div>
  );
}

/**
 * Selected work: one horizontal rail that bleeds to the window edges. Cards
 * are 4 grid columns wide, floored at 400px and capped at 60svh and 640px;
 * the first few fill the view and the rest sit past the right edge.
 */
export function SelectedWork({
  headingId,
  position,
  moment,
  live,
  sectionRef,
  mode,
  mask,
}: {
  headingId: string;
  position: CarouselPosition;
  /** The staged pointer/focus moment, until the reviewer does something; null after. */
  moment: ArrowMoment | null;
  live: boolean;
  sectionRef: Ref<HTMLElement>;
  mode: PortfolioState["heroMode"];
  mask: boolean;
}) {
  const { trackRef, trackProps, canPrev, canNext, step } = useCarousel("[data-rail-item]", position);
  const zoneRef = useRef<HTMLDivElement>(null);
  const near = usePointerNear(zoneRef, live);
  return (
    <section ref={sectionRef} aria-labelledby={headingId} data-mode={mode} data-mask={mask || undefined} className="pf-work">
      <div ref={zoneRef} className="pf-zone">
        <div className="pf-zone-head">
          <SectionHeading id={headingId}>selected work</SectionHeading>
          <CarouselNav canPrev={canPrev} canNext={canNext} step={step} near={near} moment={moment} />
        </div>
        {/* A scroll region with focusable cards inside: keyboard users Tab through the cards. */}
        <div ref={trackRef} role="region" aria-label="Selected work" {...trackProps} className="pf-track">
          <div className="pf-track-inner">
            {WORK.map((item) => (
              <div key={item.key} data-rail-item className="pf-rail-item">
                <HoverCard href={item.href} external={item.external} asset={<WorkMedia item={item} />} label={item.title}>
                  <WorkCaption item={item} />
                </HoverCard>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Shader Lab's wipe compare, reduced to two stills: drag (or arrow keys) to move the split. */
function CompareStill({ original, edited, title }: { original: string; edited: string; title: string }) {
  const [split, setSplit] = useState(50);
  return (
    <div data-no-drag className="pf-compare" style={{ "--pf-split": `${split}%` } as CSSProperties}>
      {/* oxlint-disable-next-line nextjs/no-img-element -- still frame */}
      <img src={original} alt="" decoding="async" />
      {/* oxlint-disable-next-line nextjs/no-img-element -- still frame */}
      <img src={edited} alt="" decoding="async" data-edited />
      <input
        type="range"
        min={0}
        max={100}
        value={split}
        onChange={(e) => setSplit(Number(e.target.value))}
        aria-label={`${title}: compare the original with the edited frame`}
        className="pf-compare-input"
      />
      <span aria-hidden className="pf-compare-handle" />
    </div>
  );
}

function ExperimentMediaBox({ e }: { e: Experiment }) {
  const media = e.media;
  return (
    <div className="pf-media" style={{ "--pf-aspect": e.aspect } as CSSProperties}>
      {media.kind === "image" ? (
        // oxlint-disable-next-line nextjs/no-img-element -- still frame
        <img src={media.src} alt="" decoding="async" />
      ) : media.kind === "layered" ? (
        <>
          {/* oxlint-disable-next-line nextjs/no-img-element -- the painted ground */}
          <img src={media.ground} alt="" aria-hidden decoding="async" className="pf-media-backdrop" />
          {/* oxlint-disable-next-line nextjs/no-img-element -- the alpha UI frame */}
          <img src={media.ui} alt={media.alt} decoding="async" className="pf-media-float" />
        </>
      ) : (
        <CompareStill original={media.original} edited={media.edited} title={e.title} />
      )}
    </div>
  );
}

/**
 * Experiments: packed 12-column rows at lg+, a horizontal scroller that
 * bleeds to the edges below it, with the same drag and arrows as the rail.
 */
export function Experiments({ headingId, live, sectionRef }: { headingId: string; live: boolean; sectionRef: Ref<HTMLElement> }) {
  const { trackRef, trackProps, canPrev, canNext, step } = useCarousel("[data-exp-card]", "start");
  const zoneRef = useRef<HTMLDivElement>(null);
  const near = usePointerNear(zoneRef, live);
  return (
    <section ref={sectionRef} aria-labelledby={headingId} className="pf-experiments">
      <div ref={zoneRef} className="pf-zone">
        <div className="pf-zone-head">
          <SectionHeading id={headingId}>experiments</SectionHeading>
          <CarouselNav canPrev={canPrev} canNext={canNext} step={step} near={near} moment={null} />
        </div>
        <div ref={trackRef} role="region" aria-label="Experiments" {...trackProps} className="pf-exp-track">
          <div className="pf-exp-inner">
            {EXPERIMENT_ROWS.map((row) => (
              <div key={row.map((e) => e.key).join()} className="pf-exp-row">
                {row.map((e) => (
                  <div key={e.key} data-exp-card data-span={e.span} className="pf-exp-card">
                    <HoverCard
                      href={e.href}
                      external={e.external}
                      interactive={e.media.kind !== "compare"}
                      secondary={e.readoutHref ? { href: e.readoutHref, label: "Case study" } : undefined}
                      asset={<ExperimentMediaBox e={e} />}
                      label={e.title}
                    >
                      <div data-experiment className={cn("pf-caption")}>
                        <Anchor href={e.href} {...newTab} className="pf-caption-link">
                          <h3 className="pf-card-title">{e.title}</h3>
                        </Anchor>
                        <p className="pf-card-text">{e.description}</p>
                      </div>
                    </HoverCard>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
