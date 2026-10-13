import type { Effect, Params } from "../fixtures";
import { BLEND_INDEX, DITHER_TYPES, HALFTONE_SHAPES, grainFrame, pb, pn, ps, pstops, rgb01, type FrameInfo } from "./shaders";

/**
 * The CPU path, for when WebGL isn't there (shader-lab's engine/index.ts
 * falls back to its CPU engine) or a GL frame fails. One function per ported
 * pass, each a per-pixel mirror of its shader in gl/shaders.ts, reading and
 * writing 8-bit RGBA like the GL ping-pong textures do. Pixel (x, y) is
 * top-left origin; the shader's P is the pixel centre (x + 0.5, y + 0.5).
 */

type Buf = Uint8ClampedArray;
type Op = (src: Buf, dst: Buf, p: Params, f: FrameInfo) => void;

const luma601 = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lin = (v: number) => v ** 2.2;
const srgb = (v: number) => Math.max(0, v) ** (1 / 2.2);

function perPixel(src: Buf, dst: Buf, fn: (r: number, g: number, b: number, i: number) => [number, number, number]) {
  for (let i = 0; i < src.length; i += 4) {
    const [r, g, b] = fn(src[i] / 255, src[i + 1] / 255, src[i + 2] / 255, i);
    dst[i] = r * 255 + 0.5;
    dst[i + 1] = g * 255 + 0.5;
    dst[i + 2] = b * 255 + 0.5;
    dst[i + 3] = 255;
  }
}

const adjust: Op = (src, dst, p) => {
  const b = pn(p, "brightness", 1), c = pn(p, "contrast", 1), s = pn(p, "saturation", 1);
  const a = (pn(p, "hue", 0) * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a);
  const exp = 2 ** pn(p, "exposure", 0), temp = (pn(p, "temperature", 0) * 40) / 255, gamma = 1 / Math.max(0.01, pn(p, "gamma", 1));
  // The shader's `c*m`: GLSL's mat3 is column-major and a row vector times
  // it dots `c` with each column, so output channel j uses column j.
  const m = [
    [0.213 + cs * 0.787 - sn * 0.213, 0.213 - cs * 0.213 - sn * 0.715, 0.213 - cs * 0.213 + sn * 0.928],
    [0.715 - cs * 0.715 + sn * 0.143, 0.715 + cs * 0.285 + sn * 0.14, 0.715 - cs * 0.715 - sn * 0.283],
    [0.072 - cs * 0.072 - sn * 0.787, 0.072 - cs * 0.072 + sn * 0.715, 0.072 + cs * 0.928 + sn * 0.072],
  ];
  perPixel(src, dst, (r, g, bl) => {
    let v = [r * b, g * b, bl * b].map((x) => (x - 0.5) * c + 0.5);
    const l = v[0] * 0.213 + v[1] * 0.715 + v[2] * 0.072;
    v = v.map((x) => l + (x - l) * s);
    v = m.map((row) => clamp01(row[0] * v[0] + row[1] * v[1] + row[2] * v[2]) * exp);
    v[0] += temp;
    v[2] -= temp;
    return v.map((x) => clamp01(clamp01(x) ** gamma)) as [number, number, number];
  });
};

const grayscale: Op = (src, dst, p) => {
  const k = pn(p, "amount", 1);
  perPixel(src, dst, (r, g, b) => {
    const l = luma601(r, g, b);
    return [r + (l - r) * k, g + (l - g) * k, b + (l - b) * k];
  });
};

const posterize: Op = (src, dst, p) => {
  const L = Math.max(2, Math.round(pn(p, "levels", 5)));
  const q = (v: number) => Math.floor(v * (L - 1) + 0.5) / (L - 1);
  const perChannel = pb(p, "perChannel", true);
  perPixel(src, dst, (r, g, b) => {
    if (perChannel) return [q(r), q(g), q(b)];
    const l = luma601(r, g, b);
    const k = l > 0 ? q(l) / l : 0;
    return [clamp01(r * k), clamp01(g * k), clamp01(b * k)];
  });
};

const BAYER2 = [0, 2, 3, 1];
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const BAYER8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35,
  11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];
const CROSS8 = [
  0, 12, 24, 36, 48, 60, 8, 20, 16, 28, 40, 52, 4, 56, 32, 44, 8, 20, 0, 12, 24, 36, 48, 60, 40, 52, 16, 28, 4, 56, 32, 44, 48, 60, 8,
  20, 0, 12, 24, 36, 32, 44, 40, 52, 16, 28, 4, 56, 24, 36, 48, 60, 8, 20, 0, 12, 56, 4, 32, 44, 40, 52, 16, 28,
];

function threshold(type: number, x: number, y: number) {
  if (type === 0) return (BAYER2[(y % 2) * 2 + (x % 2)] + 0.5) / 4;
  if (type === 2) return (BAYER8[(y % 8) * 8 + (x % 8)] + 0.5) / 64;
  if (type === 4) return (((x % 8) * 8 + (y % 8) * 4) % 64 + 0.5) / 64;
  if (type === 5) return (CROSS8[(y % 8) * 8 + (x % 8)] + 0.5) / 64;
  return (BAYER4[(y % 4) * 4 + (x % 4)] + 0.5) / 16;
}

const dither: Op = (src, dst, p, { w, u }) => {
  const type = DITHER_TYPES[ps(p, "type", "bayer4")] ?? 1;
  const L = Math.max(2, Math.round(pn(p, "levels", 3)));
  const scale = Math.max(1, Math.round(pn(p, "scale", 2) * u));
  const pix = Math.max(0, Math.round(pn(p, "pixelate", 0) * u));
  const mono = pb(p, "mono", false);
  const q = (v: number, m: number) => Math.min(L - 1, Math.max(0, Math.floor(v * (L - 1) + m + 0.5))) / (L - 1);
  for (let i = 0; i < src.length; i += 4) {
    const x = (i / 4) % w, y = Math.floor(i / 4 / w);
    const sx = pix > 0 ? Math.floor((x + 0.5) / pix) * pix : x, sy = pix > 0 ? Math.floor((y + 0.5) / pix) * pix : y;
    const si = (Math.min(sy, src.length / 4 / w - 1) * w + Math.min(sx, w - 1)) * 4;
    const m = threshold(type, Math.floor((x + 0.5) / scale), Math.floor((y + 0.5) / scale)) - 0.5;
    const r = lin(src[si] / 255), g = lin(src[si + 1] / 255), b = lin(src[si + 2] / 255);
    const out = mono ? Array(3).fill(srgb(q(luma601(r, g, b), m))) : [r, g, b].map((v) => srgb(q(v, m)));
    dst[i] = out[0] * 255 + 0.5;
    dst[i + 1] = out[1] * 255 + 0.5;
    dst[i + 2] = out[2] * 255 + 0.5;
    dst[i + 3] = 255;
  }
};

function dotSDF(cx: number, cy: number, r: number, shape: number) {
  if (shape === 3) return Math.max(Math.abs(cx), Math.abs(cy)) - r;
  if (shape === 4) return Math.abs(cx) + Math.abs(cy) - r;
  if (shape === 2) return Math.abs(cy) - r * 0.5;
  const d = Math.hypot(cx, cy);
  if (shape === 1) return Math.max(d - r, r * 0.55 - d);
  return d - r;
}
const aaCov = (dPx: number) => clamp01(0.5 - dPx);
function smin(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

const CMYK_SCREENS: { angle: number; ink: [number, number, number] }[] = [
  { angle: 15, ink: [0, 0.6824, 0.9373] },
  { angle: 75, ink: [0.9255, 0, 0.549] },
  { angle: 0, ink: [1, 0.949, 0] },
  { angle: 45, ink: [0.102, 0.102, 0.102] },
];

const halftone: Op = (src, dst, p, { w, h, u }) => {
  const cell = Math.max(2, pn(p, "cell", 9) * u);
  const contrast = pn(p, "contrast", 1);
  const shape = HALFTONE_SHAPES.indexOf(ps(p, "dotShape", "circle"));
  const stagger = pb(p, "stagger", false), invert = pb(p, "invertCells", false);
  const overflow = clamp01(pn(p, "overflow", 0)), gooeyK = clamp01(pn(p, "gooey", 0)) * 0.4;
  const rscale = 0.71 * (1 + overflow * 0.9), combine = overflow > 0 || gooeyK > 0;
  const cmyk = ps(p, "mode", "mono") === "cmyk";
  const ink = rgb01(ps(p, "ink", "#191512")), paper = rgb01(ps(p, "paper", "#f1ece4"));
  const A = -0.5 * Math.ceil(Math.hypot(w, h)) + 0.5 * cell;
  const ctrX = w / 2, ctrY = h / 2;

  // Coverage of one channel at a source pixel (chan -1 = mono luma; 0..3 = C, M, Y, K).
  const coverage = (si: number, chan: number) => {
    const r = src[si] / 255, g = src[si + 1] / 255, b = src[si + 2] / 255;
    let cov: number;
    if (chan < 0) cov = 1 - luma601(r, g, b);
    else {
      const k = Math.min(1 - r, 1 - g, 1 - b);
      const denom = 1 - k;
      cov = chan === 3 ? k : denom > 1e-6 ? (1 - [r, g, b][chan] - k) / denom : 0;
    }
    return clamp01(invert ? 1 - cov : cov) ** contrast;
  };

  // One rotated screen at pixel centre (px, py): the folded SDF, or per-dot ink when not combining.
  const screen = (px: number, py: number, angleDeg: number, chan: number, perDot?: (d: number) => void) => {
    const a = (angleDeg * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a);
    const dx0 = px - ctrX, dy0 = py - ctrY;
    const qx = cs * dx0 + sn * dy0, qy = -sn * dx0 + cs * dy0;
    const kx0 = Math.floor((qx - A) / cell + 0.5), ky0 = Math.floor((qy - A) / cell + 0.5);
    let acc = 1e9;
    for (let dy = -1; dy <= 1; dy++) {
      const ky = ky0 + dy;
      const rowOff = stagger && ((ky % 2) + 2) % 2 > 0.5 ? 0.5 * cell : 0;
      for (let dx = -1; dx <= 1; dx++) {
        const Cx = A + rowOff + (kx0 + dx) * cell, Cy = A + ky * cell;
        const ix = Math.min(w - 1, Math.max(0, Math.floor(cs * Cx - sn * Cy + ctrX + 0.5)));
        const iy = Math.min(h - 1, Math.max(0, Math.floor(sn * Cx + cs * Cy + ctrY + 0.5)));
        const r = Math.sqrt(coverage((iy * w + ix) * 4, chan)) * rscale;
        if (r * cell <= 0.2) continue;
        const d = dotSDF((qx - Cx) / cell, (qy - Cy) / cell, r, shape);
        if (perDot) perDot(d);
        else acc = gooeyK > 0 ? smin(acc, d, gooeyK) : Math.min(acc, d);
      }
    }
    return acc;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, px = x + 0.5, py = y + 0.5;
      let out: number[];
      if (cmyk) {
        out = [1, 1, 1];
        for (let s = 0; s < 4; s++) {
          const { angle, ink: inkCol } = CMYK_SCREENS[s];
          const apply = (d: number) => {
            const k = aaCov(d * cell);
            for (let c = 0; c < 3; c++) out[c] *= 1 + (inkCol[c] - 1) * k;
          };
          if (combine) apply(screen(px, py, angle, s));
          else screen(px, py, angle, s, apply);
        }
      } else {
        const k = aaCov(screen(px, py, pn(p, "angle", 45), -1) * cell);
        out = [0, 1, 2].map((c) => paper[c] + (ink[c] - paper[c]) * k);
      }
      dst[i] = out[0] * 255 + 0.5;
      dst[i + 1] = out[1] * 255 + 0.5;
      dst[i + 2] = out[2] * 255 + 0.5;
      dst[i + 3] = 255;
    }
  }
};

const gradientMap: Op = (src, dst, p) => {
  const stops = pstops(p, "stops").toSorted((a, b) => a.t - b.t).slice(0, 8);
  if (stops.length < 2) return dst.set(src);
  const colors = stops.map((s) => rgb01(s.color));
  const amount = pn(p, "amount", 1);
  perPixel(src, dst, (r, g, b) => {
    const t = Math.floor((0.2126 * r + 0.7152 * g + 0.0722 * b) * 255 + 0.5) / 255;
    let ai = 0, bi = stops.length - 1;
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s].t && t <= stops[s + 1].t) {
        ai = s;
        bi = s + 1;
        break;
      }
    }
    const span = stops[bi].t - stops[ai].t || 1;
    const k = clamp01((t - stops[ai].t) / span);
    const ramp = [0, 1, 2].map((c) => Math.floor((colors[ai][c] + (colors[bi][c] - colors[ai][c]) * k) * 255 + 0.5) / 255);
    return [r + (ramp[0] - r) * amount, g + (ramp[1] - g) * amount, b + (ramp[2] - b) * amount];
  });
};

/** The shader's integer hash, in 32-bit JS arithmetic. */
function hashf(x: number, y: number, seed: number) {
  let hsh = (Math.imul(x, 1664525) ^ Math.imul(y, 1013904223) ^ Math.imul(seed, 2654435761 | 0)) >>> 0;
  hsh = Math.imul(hsh ^ (hsh >>> 16), 0x45d9f3b) >>> 0;
  hsh = Math.imul(hsh ^ (hsh >>> 16), 0x45d9f3b) >>> 0;
  hsh = (hsh ^ (hsh >>> 16)) >>> 0;
  return hsh / 4294967295;
}

const BLENDS: ((d: number, s: number) => number)[] = [
  (d, s) => d * s,
  (d, s) => 1 - (1 - d) * (1 - s),
  (d, s) => (d < 0.5 ? 2 * d * s : 1 - 2 * (1 - d) * (1 - s)),
  (d, s) => (s < 0.5 ? 2 * d * s + d * d * (1 - 2 * s) : Math.sqrt(d) * (2 * s - 1) + 2 * d * (1 - s)),
];

const grain: Op = (src, dst, p, { w, h, u, t }) => {
  const amount = pn(p, "amount", 0.14);
  if (amount <= 0) return dst.set(src);
  const size = Math.max(1, pn(p, "size", 1.5) * u);
  const nw = Math.max(1, Math.round(w / size)), nh = Math.max(1, Math.round(h / size));
  const mono = pb(p, "mono", true);
  const blend = BLENDS[BLEND_INDEX[ps(p, "blend", "soft-light")] ?? 3] ?? BLENDS[3];
  const base = Math.floor(((grainFrame(p, t) * 0.61803398875) % 1) * 65536);
  const noise = (cx: number, cy: number, ch: number) =>
    hashf(Math.min(nw - 1, Math.max(0, cx)), Math.min(nh - 1, Math.max(0, cy)), base + (mono ? 0 : ch) * 7919);
  perPixel(src, dst, (r, g, b, i) => {
    const x = (i / 4) % w, y = Math.floor(i / 4 / w);
    const nx = ((x + 1) * nw) / w - 0.5, ny = ((y + 1) * nh) / h - 0.5;
    const sample = (ch: number) => {
      if (size <= 1.5) return noise(Math.floor(((x + 1) * nw) / w), Math.floor(((y + 1) * nh) / h), ch);
      const fx = Math.floor(nx), fy = Math.floor(ny), ax = nx - fx, ay = ny - fy;
      const top = noise(fx, fy, ch) * (1 - ax) + noise(fx + 1, fy, ch) * ax;
      const bottom = noise(fx, fy + 1, ch) * (1 - ax) + noise(fx + 1, fy + 1, ch) * ax;
      return top * (1 - ay) + bottom * ay;
    };
    return [r, g, b].map((v, ch) => v + (blend(v, sample(ch)) - v) * amount) as [number, number, number];
  });
};

const vignette: Op = (src, dst, p, { w, h }) => {
  const amount = pn(p, "amount", 0.4), radius = pn(p, "radius", 0.75), soft = pn(p, "softness", 0.45);
  const color = rgb01(ps(p, "color", "#000000"));
  const mx = Math.hypot(w, h) / 2, inner = radius * (1 - soft) * mx, outer = radius * mx + soft * mx;
  perPixel(src, dst, (r, g, b, i) => {
    const x = (i / 4) % w + 0.5 - w / 2, y = Math.floor(i / 4 / w) + 0.5 - h / 2;
    const a = amount * clamp01((Math.hypot(x, y) - inner) / Math.max(1, outer - inner));
    return [r + (color[0] - r) * a, g + (color[1] - g) * a, b + (color[2] - b) * a];
  });
};

const OPS: Record<Effect["type"], Op> = { adjust, grayscale, posterize, dither, halftone, gradientMap, grain, vignette };

/** Run the enabled stack over `base` (RGBA, top-left origin) and return the result. */
export function renderCpu(base: ImageData, stack: Effect[], frame: FrameInfo): ImageData {
  let cur = new Uint8ClampedArray(base.data);
  let next = new Uint8ClampedArray(cur.length);
  for (const e of stack) {
    if (!e.enabled) continue;
    OPS[e.type](cur, next, e.params, frame);
    [cur, next] = [next, cur];
  }
  return new ImageData(cur, base.width, base.height);
}
