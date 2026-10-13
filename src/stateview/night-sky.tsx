"use client";

import { useEffect, useRef } from "react";

/*
 * A pixelated night sky behind the hub, seen only when the reviewer pulls past
 * the top or bottom of the page and the browser's rubber band opens a gap.
 * Browsers fill that gap differently: Chrome keeps fixed layers still while
 * the page slides, so the gap shows what's fixed behind the page; Safari moves
 * everything, so the gap shows whatever sits beyond the page's edge. The sky
 * is a fixed layer behind the page that also reaches past both edges, which
 * covers both. It's hidden while the page is scrolled away from either end.
 *
 * Drawn on a small canvas scaled up without smoothing: every sky pixel is
 * PIXEL CSS pixels square. A noise field decides where space is empty and
 * where it's crowded: empty stretches stay flat black, crowded ones brighten
 * through dithered shades of navy and gather faint dust and more stars, which
 * reads as depth. Stars twinkle in steps between brightness levels; far ones
 * never get past dim.
 */

const PIXEL = 3;
const FRAME_MS = 125;
// How far the sky reaches past each edge of the window, as a share of its height. Matches gui-night-sky.
const REACH = 0.6;
// One star candidate for about this many sky pixels; crowded areas keep more of them.
const STAR_SPACING = 700;
// Within this distance of either end of the page the sky can be pulled into view.
const EDGE_PX = 8;
// How long the stars keep twinkling after the last pull toward an edge.
const AWAKE_MS = 3000;
const RESIZE_SETTLE_MS = 150;
const SEED = 1337;

// 4 × 4 Bayer matrix, thresholds 0–15.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

type Star = { x: number; y: number; big: boolean; far: boolean; period: number; phase: number; color: number };
type Rgb = [number, number, number];

function parseHex(hex: string): Rgb {
  const value = Number.parseInt(hex.trim().replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Deterministic, so the sky is the same on every visit. */
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A repeatable 0–1 value for a lattice point. */
function hash(x: number, y: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ SEED;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smoothly interpolated value noise, 0–1, with features about `size` sky pixels across. */
function noise(x: number, y: number, size: number) {
  const fx = x / size;
  const fy = y / size;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const sx = (fx - ix) * (fx - ix) * (3 - 2 * (fx - ix));
  const sy = (fy - iy) * (fy - iy) * (3 - 2 * (fy - iy));
  const top = hash(ix, iy) + (hash(ix + 1, iy) - hash(ix, iy)) * sx;
  const bottom = hash(ix, iy + 1) + (hash(ix + 1, iy + 1) - hash(ix, iy + 1)) * sx;
  return top + (bottom - top) * sy;
}

/** How crowded space is at a sky pixel: 0 where it's empty, rising to 1 in the densest clouds. */
function crowding(x: number, y: number) {
  const field = 0.55 * noise(x, y, 70) + 0.3 * noise(x + 500, y, 28) + 0.15 * noise(x, y + 500, 11);
  return Math.min(1, Math.max(0, (field - 0.53) / 0.32));
}

export function NightSky() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const style = getComputedStyle(canvas);
    const shades = [1, 2, 3, 4].map((n) => parseHex(style.getPropertyValue(`--night-sky-${n}`)));
    const starColors = [1, 2, 3].map((n) => style.getPropertyValue(`--night-star-${n}`).trim());
    const dim = style.getPropertyValue("--night-star-dim").trim();
    const faint = style.getPropertyValue("--night-star-faint").trim();
    const dust = parseHex(faint);
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

    // The sky and dust never change, so they're painted once and copied in each frame.
    const sky = document.createElement("canvas");
    let stars: Star[] = [];
    let width = 0;
    let height = 0;

    const paintSky = () => {
      sky.width = width;
      sky.height = height;
      const image = new ImageData(width, height);
      const grain = random(SEED);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const crowd = crowding(x, y);
          const level = crowd * (shades.length - 1);
          const base = Math.min(shades.length - 2, Math.floor(level));
          // Mostly ordered dither, loosened with a little noise so it doesn't read as a grid.
          const threshold = ((BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16) * 0.7 + grain() * 0.3;
          let [r, g, b] = shades[level - base > threshold ? base + 1 : base];
          // Faint dust, thickest where space is most crowded.
          if (grain() < 0.05 * crowd * crowd) [r, g, b] = dust;
          const i = (y * width + x) * 4;
          image.data[i] = r;
          image.data[i + 1] = g;
          image.data[i + 2] = b;
          image.data[i + 3] = 255;
        }
      }
      sky.getContext("2d")?.putImageData(image, 0, 0);
    };

    const placeStars = () => {
      const next = random(SEED + 1);
      const candidates = Math.round((width * height) / STAR_SPACING);
      const placed: Star[] = [];
      for (let n = 0; n < candidates; n++) {
        const x = Math.floor(next() * width);
        const y = Math.floor(next() * height);
        const keep = next() < 0.12 + 0.88 * crowding(x, y);
        const star = { x, y, big: next() < 0.14, far: next() < 0.45, period: 1600 + next() * 3600, phase: next() * Math.PI * 2, color: Math.floor(next() * starColors.length) };
        if (keep) placed.push(star);
      }
      return placed;
    };

    // Measured from the window, not the canvas, which has no size while it's hidden.
    const resize = () => {
      width = Math.max(1, Math.ceil(document.documentElement.clientWidth / PIXEL));
      height = Math.max(1, Math.ceil((window.innerHeight * (1 + 2 * REACH)) / PIXEL));
      canvas.width = width;
      canvas.height = height;
      paintSky();
      stars = placeStars();
    };

    const pixel = (x: number, y: number, color: string) => {
      context.fillStyle = color;
      context.fillRect(x, y, 1, 1);
    };

    const draw = (time: number) => {
      context.drawImage(sky, 0, 0);
      for (const star of stars) {
        // Still stars rest at full brightness when motion is reduced.
        const glow = reducedMotion.matches ? 1 : 0.5 + 0.5 * Math.sin((time / star.period) * Math.PI * 2 + star.phase);
        const level = glow > 0.66 ? 2 : glow > 0.33 ? 1 : 0;
        if (star.far) {
          pixel(star.x, star.y, level === 0 ? faint : dim);
          continue;
        }
        const bright = starColors[star.color];
        if (star.big) {
          pixel(star.x, star.y, level === 0 ? dim : bright);
          if (level === 2) {
            pixel(star.x - 1, star.y, dim);
            pixel(star.x + 1, star.y, dim);
            pixel(star.x, star.y - 1, dim);
            pixel(star.x, star.y + 1, dim);
          }
        } else {
          pixel(star.x, star.y, level === 2 ? bright : level === 1 ? dim : faint);
        }
      }
    };

    /*
     * The twinkle only runs for a few seconds after the reviewer pulls toward
     * an end of the page they're already at, which is when a gap can open.
     * Resting at the top costs nothing; the last frame stays on the canvas,
     * so the stars are there the moment the gap opens.
     */
    let frame = 0;
    let last = -Infinity;
    let awakeUntil = 0;
    const loop = (time: number) => {
      if (time > awakeUntil) {
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(loop);
      if (time - last < FRAME_MS) return;
      last = time;
      draw(time);
    };

    const atTop = () => window.scrollY <= EDGE_PX;
    const atBottom = () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - EDGE_PX;

    const wake = () => {
      if (canvas.hidden || reducedMotion.matches || document.visibilityState !== "visible") return;
      awakeUntil = performance.now() + AWAKE_MS;
      if (!frame) frame = requestAnimationFrame(loop);
    };

    const onWheel = (event: WheelEvent) => {
      if ((event.deltaY < 0 && atTop()) || (event.deltaY > 0 && atBottom())) wake();
    };

    const sync = () => {
      const hidden = !atTop() && !atBottom();
      if (hidden !== canvas.hidden) canvas.hidden = hidden;
      if (hidden || document.visibilityState !== "visible") {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const redraw = () => draw(performance.now());

    // Repainting the sky is the one costly step, so a window being dragged wider repaints once it settles.
    let resizeTimer = 0;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
        redraw();
        sync();
      }, RESIZE_SETTLE_MS);
    };

    resize();
    redraw();
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchmove", wake, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", sync);
    reducedMotion.addEventListener("change", redraw);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(resizeTimer);
      window.removeEventListener("scroll", sync);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", wake);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", sync);
      reducedMotion.removeEventListener("change", redraw);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="gui-night-sky" />;
}
