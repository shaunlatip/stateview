/**
 * Every input the portfolio home reads, in one place. The screen is a pure
 * function of this object. Values are listed in the order a reviewer reads
 * them; the manifest's baseline says which one is the default.
 *
 * - theme: the site picks it from the visitor's local time (dark 18:00–04:59).
 * - heroMode: "flat" is the new default; "peek" and "cover" still exist behind
 *   `?hero=` and the dev-only AdminMenu.
 * - railPosition: where the selected-work carousel starts (one card along is "middle").
 * - pointer: the pointer moment the header arrows answer to: away from the
 *   section, within 40px of it, or on the enabled arrow itself.
 * - arrowFocus: keyboard focus on the arrow whose direction can't move.
 * - breakpoint: the window's width (mobile renders at 375px).
 * - windowHeight: "short" is a 560px-tall window, too short for the intro and
 *   the full 136px peek together.
 */
export const portfolioInputValues = {
  theme: ["light", "dark"],
  heroMode: ["flat", "peek", "cover"],
  railPosition: ["start", "middle", "end"],
  pointer: ["rest", "near", "hover"],
  arrowFocus: ["none", "disabled"],
  breakpoint: ["desktop", "mobile"],
  windowHeight: ["tall", "short"],
} as const;

type Values = typeof portfolioInputValues;

export type PortfolioState = { [K in keyof Values]: Values[K][number] };

export function parsePortfolioState(inputs: Record<string, string>): PortfolioState {
  const entries = Object.entries(portfolioInputValues).map(([key, values]) => {
    const value = inputs[key];
    return [key, (values as readonly string[]).includes(value) ? value : values[0]];
  });
  return Object.fromEntries(entries) as PortfolioState;
}
