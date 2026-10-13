"use client";

import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { Anchor } from "./anchor";
import { NAV_ITEMS, SITE } from "./fixtures";
import type { PortfolioState } from "./state";

const newTab = { target: "_blank", rel: "noopener noreferrer" } as const;

export type SectionTarget = "work" | "experiments";
type Theme = PortfolioState["theme"];

/** Nav items as anchors: in-page sections scroll, the rest open latip.me in a new tab. */
function itemProps(item: (typeof NAV_ITEMS)[number], onNavigate: (target: SectionTarget) => void, after?: () => void) {
  if ("target" in item) {
    return {
      href: `#${item.target}`,
      onClick: (e: MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        after?.();
        onNavigate(item.target);
      },
    };
  }
  return { href: item.href, ...newTab, onClick: after };
}

/** The dashed "send" glyph from the brand pill (18x18). */
function SendGlyph() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" aria-hidden className="shrink-0">
      {[
        "M13.5 2.25L15.75 2.25 15.75 4.5",
        "M14.25 6L14.25 8.25",
        "M12 3.75L9.75 3.75",
        "M8.25 5.25L6 5.25",
        "M6.75 9.75L3.75 9.75",
        "M4.5 6.75L2.25 6.75 2.25 8.25",
        "M12.75 9.75L12.75 12",
        "M8.25 11.25L8.25 14.25",
        "M11.25 13.5L11.25 15.75H9.75",
      ].map((d) => (
        <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square" />
      ))}
    </svg>
  );
}

/** BrandButton: "By Shaun" slides to "Shaun Latip" on hover. */
function BrandButton() {
  return (
    <Anchor href={SITE} {...newTab} aria-label="Shaun Latip — home" className="pf-brand pf-focus">
      <span data-seg="collapse" className="pf-brand-seg">
        <span className="pf-brand-glyph">
          <SendGlyph />
        </span>
      </span>
      <span className="pf-brand-word">
        <span data-seg="collapse" className="pf-brand-seg">
          <span>By&nbsp;</span>
        </span>
        <span>Shaun</span>
        <span data-seg="expand" className="pf-brand-seg">
          <span>&nbsp;Latip</span>
        </span>
      </span>
    </Anchor>
  );
}

function Burger() {
  return (
    <span aria-hidden className="pf-burger">
      <span />
      <span />
    </span>
  );
}

/**
 * NavCollapse: a bar at rest (brand left, chips and the theme toggle right)
 * that folds into one round menu button at the content edge once the page
 * scrolls (24px on the one-pane hero, 0.85 of the window over a sheet).
 */
export function DesktopNav({
  collapsed,
  theme,
  onToggleTheme,
  onNavigate,
}: {
  collapsed: boolean;
  theme: Theme;
  onToggleTheme: () => void;
  onNavigate: (target: SectionTarget) => void;
}) {
  const [open, setOpen] = useState(false);
  // The panel only exists while collapsed; scrolling back up closes it.
  const menuOpen = open && collapsed;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const toggleLabel = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [menuOpen]);

  const close = () => setOpen(false);

  return (
    <div data-collapsed={collapsed || undefined} className="pf-nav">
      <div inert={collapsed} className="pf-nav-bar">
        <div className="pf-nav-brand">
          <BrandButton />
        </div>
        <nav aria-label="Site" className="pf-nav-links">
          {NAV_ITEMS.map((item) => (
            <Anchor key={item.label} {...itemProps(item, onNavigate)} className="pf-nav-chip pf-focus">
              {item.label}
            </Anchor>
          ))}
          <button type="button" onClick={onToggleTheme} aria-label={toggleLabel} className="pf-theme-toggle">
            <span aria-hidden />
          </button>
        </nav>
      </div>

      <div ref={menuRef} className="pf-menu">
        <button
          ref={buttonRef}
          type="button"
          inert={!collapsed}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="pf-menu-button pf-focus"
        >
          <Burger />
        </button>
        {menuOpen ? (
          <nav id={panelId} aria-label="Menu" className="pf-menu-panel">
            <Anchor href={SITE} {...newTab} onClick={close} className="pf-menu-row">
              Home
            </Anchor>
            {NAV_ITEMS.map((item) => (
              <Anchor key={item.label} {...itemProps(item, onNavigate, close)} className="pf-menu-row">
                {item.label}
              </Anchor>
            ))}
            <button type="button" onClick={onToggleTheme} aria-label={toggleLabel} className="pf-menu-row">
              <span>{theme === "dark" ? "Dark" : "Light"}</span>
              <span aria-hidden className="pf-menu-disc" />
            </button>
          </nav>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Below md: the glass hamburger, the centered wordmark and the theme disc
 * over a soft blur band, opening a side sheet of the same items.
 */
export function MobileNav({
  theme,
  onToggleTheme,
  onNavigate,
}: {
  theme: Theme;
  onToggleTheme: () => void;
  onNavigate: (target: SectionTarget) => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstRef = useRef<HTMLAnchorElement>(null);
  const sheetId = useId();

  useEffect(() => {
    if (!open) return;
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div data-open={open || undefined} className="pf-mnav">
      <div aria-hidden className="pf-mnav-band" />
      {open ? <button type="button" tabIndex={-1} aria-label="Close menu" onClick={close} className="pf-sheet-scrim" /> : null}
      {open ? (
        <nav id={sheetId} aria-label="Site navigation" className="pf-sheet">
          {NAV_ITEMS.map((item, i) => (
            <Anchor key={item.label} ref={i === 0 ? firstRef : undefined} {...itemProps(item, onNavigate, close)} className="pf-sheet-row">
              {item.label}
            </Anchor>
          ))}
        </nav>
      ) : null}
      <div className="pf-mnav-row">
        <button
          ref={buttonRef}
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls={sheetId}
          onClick={() => setOpen((v) => !v)}
          className="pf-glass-button"
        >
          <Burger />
        </button>
        <Anchor href={SITE} {...newTab} aria-label="Shaun Latip — home" inert={open} className="pf-wordmark">
          Shaun Latip
        </Anchor>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          className="pf-mtoggle"
        >
          <span aria-hidden />
        </button>
      </div>
    </div>
  );
}
