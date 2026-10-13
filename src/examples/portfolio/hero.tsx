"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type MouseEvent, type Ref, type RefObject } from "react";
import { ArrowUpRightIcon, CaretDownIcon } from "@phosphor-icons/react";
import { Anchor } from "./anchor";
import { HERO_LEAD, HERO_PLAYLIST_TAIL, PORTRAIT, PRINTS, ROLES, SITE, berkeleyTime } from "./fixtures";
import { useReducedMotion } from "./hooks";
import type { PortfolioState } from "./state";

const newTab = { target: "_blank", rel: "noopener noreferrer" } as const;

/** The nameplate's role swaps every 3.6s (NameplateBadge's ROLE_SWAP_MS). */
const ROLE_SWAP_MS = 3600;
/** Ceiling on the figure's scale: the role line is 28px natural, and nothing but the name passes 24px. */
const FIG_SCALE_MAX = 24 / 28;
const WIDEST_ROLE = ROLES.reduce((a, b) => (a.length >= b.length ? a : b));

/** The playlist.com mark, em-sized so it rides the copy's type scale. */
function PlaylistMark() {
  return (
    <svg viewBox="0.344 1.871 23.008 18.288" width="23" height="18" aria-hidden>
      <path transform="translate(266.99 0)" d="M -242.768 1.75 L -247.569 19.536 L -255.544 19.536 L -250.744 1.75 Z" fill="currentColor" />
      <path transform="translate(0 76.04)" d="M11.149-71.282 7.975-59.519 0-59.519 3.175-71.282Z" fill="currentColor" />
    </svg>
  );
}

/** The role segment: an odometer swap between the two titles in a slot sized by the longer one. */
function RoleRoll({ tick }: { tick: number }) {
  return (
    <span className="pf-roll">
      <span aria-hidden className="invisible">
        {WIDEST_ROLE}
      </span>
      {tick > 0 ? (
        <span key={`out-${tick}`} aria-hidden data-roll="out">
          {ROLES[(tick - 1) % ROLES.length]}
        </span>
      ) : null}
      <span key={`in-${tick}`} data-roll={tick > 0 ? "in" : undefined}>
        {ROLES[tick % ROLES.length]}
      </span>
    </span>
  );
}

/**
 * PrintStack, simplified: the same five-print pile and resting poses; a click
 * or Enter deals the top print to the back of the pile (the drag and the
 * cursor-facing tilt are left out).
 */
function PrintStack({ live }: { live: boolean }) {
  const [order, setOrder] = useState(() => PRINTS.map((_, i) => i));
  const [dealing, setDealing] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const deal = () => {
    if (!live || dealing !== null) return;
    const top = order[0];
    const commit = () => {
      setOrder((prev) => [...prev.slice(1), prev[0]]);
      setDealing(null);
    };
    if (reduce) {
      commit();
      return;
    }
    setDealing(top);
    window.setTimeout(commit, 250);
  };
  return (
    <>
      <button
        type="button"
        onClick={deal}
        aria-label={`Photo stack, ${PRINTS.length} photos. Press Enter to see the next one.`}
        className="pf-prints"
      >
        {PRINTS.map((print, i) => (
          <span key={print.src} data-depth={order.indexOf(i)} data-dealing={dealing === i || undefined} className="pf-print">
            {/* oxlint-disable-next-line nextjs/no-img-element -- a fixed-size print in a transform-scaled figure. */}
            <img src={print.src} alt={print.alt} draggable={false} decoding="async" />
          </span>
        ))}
      </button>
      <span className="sr-only" aria-live="polite">
        {PRINTS[order[0]].alt}
      </span>
    </>
  );
}

type FigureFit = { w: number; h: number; minX: number; minY: number; box: number };

/**
 * Scale-to-box for the hero figure: its natural bounds (prints + plate,
 * overhangs included) are measured once and again when the fonts land; the
 * box's clamp()-driven width then sets the scale.
 */
function useFigureFit(boxRef: RefObject<HTMLDivElement | null>, figRef: RefObject<HTMLDivElement | null>) {
  const [fit, setFit] = useState<FigureFit | null>(null);
  useEffect(() => {
    const box = boxRef.current;
    const fig = figRef.current;
    if (!box || !fig) return;
    let nat: Omit<FigureFit, "box"> | null = null;
    const measure = () => {
      const figRect = fig.getBoundingClientRect();
      const layoutW = fig.offsetWidth;
      if (!layoutW || !figRect.width) return null;
      // Corrects for both the figure's own scale and a scaled thumbnail around it.
      const scale = figRect.width / layoutW;
      let minX = 0;
      let minY = 0;
      let maxX = layoutW;
      let maxY = fig.offsetHeight;
      const walk = (el: Element) => {
        for (const child of Array.from(el.children)) {
          if (child.classList.contains("sr-only")) continue;
          const r = child.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            minX = Math.min(minX, (r.left - figRect.left) / scale);
            minY = Math.min(minY, (r.top - figRect.top) / scale);
            maxX = Math.max(maxX, (r.right - figRect.left) / scale);
            maxY = Math.max(maxY, (r.bottom - figRect.top) / scale);
          }
          walk(child);
        }
      };
      walk(fig);
      return { w: maxX - minX, h: maxY - minY, minX, minY };
    };
    const update = (remeasure: boolean) => {
      const w = box.clientWidth;
      if (!w) return;
      if (!nat || remeasure) nat = measure();
      if (!nat) return;
      const next = { ...nat, box: w };
      setFit((prev) => (prev && prev.box === next.box && prev.w === next.w && prev.h === next.h ? prev : next));
    };
    const ro = new ResizeObserver(() => update(false));
    ro.observe(box);
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) update(true);
    });
    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, [boxRef, figRef]);
  return fit;
}

/** Holds the figure until every print has decoded, then fades it in once (capped at 1.5s). */
function usePrintsReady(figRef: RefObject<HTMLDivElement | null>) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const fig = figRef.current;
    if (!fig) return;
    let cancelled = false;
    const show = () => {
      if (!cancelled) setReady(true);
    };
    void Promise.all(Array.from(fig.querySelectorAll("img")).map((img) => img.decode().catch(() => undefined))).then(show);
    const cap = window.setTimeout(show, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(cap);
    };
  }, [figRef]);
  return ready;
}

/**
 * Radial clearings: the light hero's grid opens behind each [data-grid-hole]
 * paragraph. Positions are measured in the hero's own layout pixels, so the
 * mask lines up inside a scaled thumbnail too.
 */
function useGridHoleMask(heroRef: RefObject<HTMLElement | null>, enabled: boolean) {
  const [mask, setMask] = useState<string | undefined>(undefined);
  useEffect(() => {
    const el = heroRef.current;
    if (!el || !enabled) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const cr = el.getBoundingClientRect();
      const scale = el.offsetWidth ? cr.width / el.offsetWidth : 1;
      const holes = Array.from(el.querySelectorAll<HTMLElement>("[data-grid-hole]"))
        .map((h) => h.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0)
        .map((r) => {
          const cx = Math.round((r.left - cr.left + r.width / 2) / scale);
          const cy = Math.round((r.top - cr.top + r.height / 2) / scale);
          const rx = Math.round((r.width / scale) * 1.3);
          const ry = Math.round((r.height / scale) * 1.15);
          return `radial-gradient(ellipse ${rx}px ${ry}px at ${cx}px ${cy}px, transparent 55%, black 100%)`;
        });
      const next = holes.length ? holes.join(", ") : undefined;
      setMask((prev) => (prev === next ? prev : next));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    for (const hole of Array.from(el.querySelectorAll("[data-grid-hole]"))) ro.observe(hole);
    return () => {
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [heroRef, enabled]);
  return mask;
}

/** Berkeley time, ticking each second while live; a thumbnail keeps the time it rendered at. */
function useBerkeleyClock(live: boolean) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!live) return () => {};
      const id = window.setInterval(onChange, 1000);
      return () => window.clearInterval(id);
    },
    [live],
  );
  return useSyncExternalStore(
    subscribe,
    () => berkeleyTime(new Date()),
    () => null,
  );
}

/** Per-character split roll: each letter slides up out of its line box as its twin rolls in. */
function SplitHoverText({ text }: { text: string }) {
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="pf-split">
        {Array.from(text).map((ch, i) => (
          // oxlint-disable-next-line react/no-array-index-key -- letters repeat; position is the identity.
          <span key={i}>
            <span>{ch}</span>
            <span>{ch}</span>
          </span>
        ))}
      </span>
    </>
  );
}

/** Hero action chip: a quiet pill; hover inverts, the label rolls and the glyph swaps in its own direction. */
function HeroChip({
  href,
  label,
  glyph,
  onClick,
}: {
  href: string;
  label: string;
  glyph: "route" | "scroll";
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const Icon = glyph === "route" ? ArrowUpRightIcon : CaretDownIcon;
  return (
    <Anchor href={href} onClick={onClick} {...(glyph === "route" ? newTab : null)} className="pf-chip">
      <SplitHoverText text={label} />
      <span aria-hidden data-glyph={glyph} className="pf-chip-glyph">
        <Icon size={14} weight="regular" />
        <Icon size={14} weight="regular" />
      </span>
    </Anchor>
  );
}

/**
 * The hero: the per-theme pattern, the 80px nav slot, and the lockup (figure
 * + copy) centered as one unit. Flat is the one-pane hero; cover and peek pin
 * behind the sheet on wide windows (portfolio.css).
 */
export function Hero({
  mode,
  theme,
  live,
  heroRef,
  copyRef,
  onContact,
}: {
  mode: PortfolioState["heroMode"];
  theme: PortfolioState["theme"];
  live: boolean;
  heroRef: RefObject<HTMLElement | null>;
  copyRef: Ref<HTMLDivElement>;
  onContact: () => void;
}) {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!live || reduce) return;
    const id = window.setInterval(() => setTick((t) => t + 1), ROLE_SWAP_MS);
    return () => window.clearInterval(id);
  }, [live, reduce]);

  const time = useBerkeleyClock(live);
  // Light: the 40px line grid behind the hero with clearings behind the copy. Dark: a plain hero.
  const grid = theme === "light";
  const mask = useGridHoleMask(heroRef, grid);

  const boxRef = useRef<HTMLDivElement>(null);
  const figRef = useRef<HTMLDivElement>(null);
  const fit = useFigureFit(boxRef, figRef);
  const ready = usePrintsReady(figRef);
  const scale = fit ? Math.min(FIG_SCALE_MAX, fit.box / fit.w) : 0;

  return (
    <section id="top" ref={heroRef} aria-label="Introduction" data-mode={mode} className="pf-hero">
      {grid ? (
        <div aria-hidden data-fade={mode === "flat" || undefined} className="pf-pattern">
          <div className="pf-pattern-grid" style={mask ? ({ "--pf-holes": mask } as CSSProperties) : undefined} />
        </div>
      ) : null}

      <div aria-hidden className="pf-hero-slot" />

      <div data-mode={mode} className="pf-lockup">
        <div className="pf-lockup-row">
          <div ref={boxRef} className="pf-figure-box" style={fit && scale ? ({ "--pf-fig-h": `${fit.h * scale}px` } as CSSProperties) : undefined}>
            <div
              ref={figRef}
              data-ready={(fit && scale && ready) || undefined}
              className="pf-figure"
              style={fit && scale ? ({ "--pf-fig-x": `${-fit.minX * scale}px`, "--pf-fig-y": `${-fit.minY * scale}px`, "--pf-fig-s": scale } as CSSProperties) : undefined}
            >
              <PrintStack live={live} />
              <div className="pf-nameplate-slot">
                <div className="pf-nameplate">
                  <div className="pf-nameplate-name">Shaun Latip</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="pf-nameplate-role">
                      is a senior <RoleRoll tick={tick} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Below lg: a round portrait over the bare nameplate. */}
          <div className="pf-portrait-stack">
            <div className="pf-portrait">
              {/* oxlint-disable-next-line nextjs/no-img-element -- a fixed 112px crop. */}
              <img src={PORTRAIT} alt="Shaun Latip" decoding="async" />
            </div>
            <div className="pf-bare-plate">
              <div className="pf-bare-name">Shaun Latip</div>
              <span className="pf-bare-role">
                is a senior <RoleRoll tick={tick} />
              </span>
            </div>
          </div>

          <div ref={copyRef} className="pf-copy">
            <div className="pf-copy-paras">
              <p data-grid-hole className="pf-copy-text">
                <span aria-hidden className="pf-scroll-dot" />
                {HERO_LEAD}
              </p>
              <p data-grid-hole className="pf-copy-text">
                At{" "}
                <Anchor href="https://www.playlist.com/" {...newTab} className="pf-playlist pf-focus-wide">
                  <PlaylistMark />
                  <span>Playlist</span>
                </Anchor>
                {HERO_PLAYLIST_TAIL}
              </p>
            </div>
            <div className="pf-copy">
              <p className="pf-clock">
                Last seen in Berkeley, where it is currently{" "}
                <span className="pf-clock-slot">
                  <span aria-hidden data-reserve>
                    23:59:59
                  </span>
                  <span data-time>{time ?? <span className="invisible">00:00:00</span>}</span>
                </span>
              </p>
              <div className="pf-chips">
                <HeroChip href={`${SITE}/about`} label="Info" glyph="route" />
                <HeroChip
                  href="#contact"
                  label="Contact"
                  glyph="scroll"
                  onClick={(e) => {
                    e.preventDefault();
                    onContact();
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {mode !== "flat" ? <div aria-hidden className="pf-scrim" /> : null}
    </section>
  );
}
