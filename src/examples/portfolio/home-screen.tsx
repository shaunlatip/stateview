"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useInThumbnail } from "@/stateview/in-thumbnail";
import { cn } from "@/lib/utils";
import { pfGeistPixel, pfHostGrotesk, pfManrope } from "./fonts";
import { Hero } from "./hero";
import { scrollerFor, useReducedMotion, useStagedMoment } from "./hooks";
import { DesktopNav, MobileNav, type SectionTarget } from "./nav";
import type { PortfolioState } from "./state";
import { Experiments, SelectedWork } from "./work";

/** Peek hero: the sheet shows a fixed 176px on load while the copy fits between the nav slot and it. */
const PEEK_PX = 176;
const PEEK_CLEARANCE = 16;
const NAV_SLOT_PX = 80;
/** Section links land 96px under the window top (scroll-mt-24). */
const SECTION_OFFSET = 96;

type Theme = PortfolioState["theme"];

/**
 * Shaun's portfolio home (latip.me, PR #73) as a Stateview screen. Everything
 * on it comes from `state`: the theme, the hero mode, where the selected-work
 * rail sits, the pointer and focus moment on its arrows, and the window.
 * The theme toggle works as a local override until the state changes.
 */
export function PortfolioScreen({ state }: { state: PortfolioState }) {
  const uid = useId();
  const inThumbnail = useInThumbnail();
  const live = !inThumbnail;
  const reduce = useReducedMotion();
  const short = state.windowHeight === "short";
  const mode = state.heroMode;

  const stateKey = JSON.stringify(state);
  const [override, setOverride] = useState<{ key: string; theme: Theme } | null>(null);
  const theme = override?.key === stateKey ? override.theme : state.theme;
  const toggleTheme = () => setOverride({ key: stateKey, theme: theme === "dark" ? "light" : "dark" });

  // The state's pointer and focus moment holds until the reviewer presses or types.
  const staged = useStagedMoment(live);
  const moment = staged ? { pointer: state.pointer, arrowFocus: state.arrowFocus } : null;

  const windowRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const workRef = useRef<HTMLElement>(null);
  const experimentsRef = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Scroll-driven chrome, written straight to the page element: the cover's
  // progress (--pf-cover-p), the hidden cover once the sheet covers it, and
  // whether the peek fits. Measured in thumbnails too, where scroll stays at 0.
  useEffect(() => {
    const win = windowRef.current;
    const page = pageRef.current;
    if (!win || !page) return;
    const scroller = scrollerFor(win, short);
    let raf = 0;
    const update = () => {
      raf = 0;
      const top = live ? scroller.top() : 0;
      const vh = scroller.height();
      const pinned = win.clientWidth >= 1024 && !reduce && mode !== "flat";
      const progress = pinned ? Math.min(1, Math.max(0, top / (vh * 0.72))) : 0;
      page.style.setProperty("--pf-cover-p", String(progress));
      page.toggleAttribute("data-cover-hidden", pinned && top > vh + 64);
      const copyH = copyRef.current?.offsetHeight ?? 0;
      page.toggleAttribute("data-peek-active", mode === "peek" && pinned && vh - NAV_SLOT_PX - PEEK_PX >= copyH + PEEK_CLEARANCE * 2);
      setCollapsed(top > (mode === "flat" ? 24 : vh * 0.85));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(win);
    if (copyRef.current) ro.observe(copyRef.current);
    const unsubscribe = live ? scroller.subscribe(schedule) : () => {};
    return () => {
      ro.disconnect();
      unsubscribe();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [short, live, reduce, mode]);

  const scrollTo = (top: number) => {
    const win = windowRef.current;
    if (!win) return;
    scrollerFor(win, short).scrollTo(top, !reduce);
  };

  const navigate = (target: SectionTarget) => {
    const win = windowRef.current;
    const el = target === "work" ? workRef.current : experimentsRef.current;
    if (!win || !el) return;
    const scroller = scrollerFor(win, short);
    const base = short ? win.getBoundingClientRect().top : 0;
    scrollTo(scroller.top() + el.getBoundingClientRect().top - base - SECTION_OFFSET);
  };

  const contact = () => {
    const win = windowRef.current;
    if (win) scrollTo(scrollerFor(win, short).maxTop());
  };

  return (
    <div
      data-pf-theme={theme}
      data-pf-window={short ? "short" : "tall"}
      data-pf-thumb={inThumbnail || undefined}
      className={cn("portfolio pf-frame", pfManrope.variable, pfHostGrotesk.variable, pfGeistPixel.variable)}
    >
      <div ref={windowRef} data-short={short || undefined} className="pf-window">
        <div ref={pageRef} className="pf-page">
          <h1 className="sr-only">Shaun Latip — Senior Product Designer &amp; Design Engineer</h1>
          <DesktopNav collapsed={collapsed} theme={theme} onToggleTheme={toggleTheme} onNavigate={navigate} />
          <MobileNav theme={theme} onToggleTheme={toggleTheme} onNavigate={navigate} />
          <main>
            <Hero mode={mode} theme={theme} live={live} heroRef={heroRef} copyRef={copyRef} onContact={contact} />
            <div data-mode={mode} className="pf-sheet-card">
              {/* Dark: the page's 12 columns as quiet lanes below the hero (wide windows only). */}
              {theme === "dark" ? (
                <div aria-hidden className="pf-pattern-columns">
                  {Array.from({ length: 12 }, (_, i) => (
                    <div key={i} />
                  ))}
                </div>
              ) : null}
              <SelectedWork
                headingId={`${uid}-work`}
                position={state.railPosition}
                moment={moment}
                live={live}
                sectionRef={workRef}
                mode={mode}
                mask={theme === "dark"}
              />
              <Experiments headingId={`${uid}-experiments`} live={live} sectionRef={experimentsRef} />
              <div className="pf-tail" />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
