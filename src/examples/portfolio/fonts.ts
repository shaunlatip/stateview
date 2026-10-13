import { Host_Grotesk, Manrope } from "next/font/google";
import localFont from "next/font/local";

/*
 * The portfolio's three faces, all under the SIL Open Font License:
 * Manrope (body, page-scoped on the home), Host Grotesk (headings, nav,
 * nameplate) and Geist Pixel Square (the clock line). Manrope and Host
 * Grotesk come from Google Fonts through next/font; Geist Pixel is the
 * portfolio's own woff2, copied into public/examples/portfolio/fonts.
 * Each sets a prefixed variable that portfolio.css maps to font-pf-* tokens.
 */
export const pfManrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--pf-font-manrope",
});

export const pfHostGrotesk = Host_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--pf-font-host",
});

export const pfGeistPixel = localFont({
  src: "../../../public/examples/portfolio/fonts/GeistPixel-Square.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--pf-font-pixel",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});
