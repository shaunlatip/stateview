import type { ShaderLabState } from "./state";

/**
 * Canned data for the Shader Lab editor: the slice of the effect catalog the
 * rebuilt renderer can draw, the presets built from it, the onboarding
 * examples and the source images. Labels, ranges, defaults and preset values
 * are copied from shader-lab's `catalog.ts` and `presets.ts` at 2e0708c.
 */

export type EffectType = "adjust" | "posterize" | "grayscale" | "dither" | "halftone" | "gradientMap" | "grain" | "vignette";
export type GradientStop = { t: number; color: string };
export type ParamValue = number | string | boolean | GradientStop[];
export type Params = Record<string, ParamValue>;
export type Effect = { id: string; type: EffectType; enabled: boolean; params: Params };

type ShowIf = { key: string; in: ParamValue[] };
export type ControlSpec = { showIf?: ShowIf } & (
  | { kind: "slider"; key: string; label: string; min: number; max: number; step: number; default: number; unit?: boolean }
  | { kind: "select"; key: string; label: string; options: { value: string; label: string }[]; default: string }
  | { kind: "switch"; key: string; label: string; default: boolean }
  | { kind: "color"; key: string; label: string; default: string }
  | { kind: "gradient"; key: string; label: string; default: GradientStop[] }
);

type CategoryId = "converter" | "tone" | "color" | "post";
export type EffectMeta = { label: string; blurb: string; category: CategoryId; heavy?: boolean; controls: ControlSpec[] };

const BLENDS = ["soft-light", "overlay", "multiply", "screen"].map((v) => ({ value: v, label: v }));

export const CATALOG: Record<EffectType, EffectMeta> = {
  dither: {
    label: "Dither",
    blurb: "Ordered, blue-noise, or Floyd–Steinberg error diffusion",
    category: "converter",
    controls: [
      {
        kind: "select",
        key: "type",
        label: "Type",
        // Blue noise and the error-diffusion types aren't ported (see gl/shaders.ts).
        options: [
          { value: "bayer2", label: "Bayer 2×2" },
          { value: "bayer4", label: "Bayer 4×4" },
          { value: "bayer8", label: "Bayer 8×8" },
          { value: "stripes", label: "Stripes" },
          { value: "crossStripe", label: "Cross-stripe" },
        ],
        default: "bayer4",
      },
      { kind: "slider", key: "levels", label: "Levels", min: 2, max: 6, step: 1, default: 3 },
      { kind: "slider", key: "scale", label: "Cell scale", min: 1, max: 10, step: 1, default: 2, unit: true },
      { kind: "slider", key: "pixelate", label: "Pixelate", min: 0, max: 16, step: 1, default: 0, unit: true },
      { kind: "switch", key: "mono", label: "Monochrome", default: false },
      { kind: "switch", key: "serpentine", label: "Serpentine (FS)", default: true },
    ],
  },
  halftone: {
    label: "Halftone",
    blurb: "Screened dots — mono or CMYK, anti-aliased",
    category: "converter",
    heavy: true,
    controls: [
      { kind: "slider", key: "cell", label: "Cell size", min: 3, max: 36, step: 1, default: 9, unit: true },
      { kind: "slider", key: "angle", label: "Angle", min: 0, max: 90, step: 1, default: 45 },
      { kind: "slider", key: "contrast", label: "Contrast", min: 0.3, max: 2.6, step: 0.05, default: 1 },
      {
        kind: "select",
        key: "dotShape",
        label: "Dot shape",
        options: ["circle", "ring", "line", "square", "diamond"].map((v) => ({ value: v, label: v })),
        default: "circle",
      },
      {
        kind: "select",
        key: "mode",
        label: "Mode",
        options: [
          { value: "mono", label: "mono" },
          { value: "cmyk", label: "CMYK" },
        ],
        default: "mono",
      },
      { kind: "switch", key: "aa", label: "Anti-alias", default: true },
      { kind: "switch", key: "stagger", label: "Stagger", default: false },
      { kind: "switch", key: "invertCells", label: "Invert cells", default: false },
      { kind: "slider", key: "overflow", label: "Overflow", min: 0, max: 1, step: 0.01, default: 0 },
      { kind: "slider", key: "gooey", label: "Gooey", min: 0, max: 1, step: 0.01, default: 0 },
      { kind: "color", key: "ink", label: "Ink", default: "#191512" },
      { kind: "color", key: "paper", label: "Paper", default: "#f1ece4" },
    ],
  },
  adjust: {
    label: "Adjust",
    blurb: "Exposure, contrast, saturation, hue, temperature, gamma",
    category: "tone",
    controls: [
      { kind: "slider", key: "brightness", label: "Brightness", min: 0.4, max: 1.6, step: 0.01, default: 1 },
      { kind: "slider", key: "contrast", label: "Contrast", min: 0.4, max: 1.8, step: 0.01, default: 1 },
      { kind: "slider", key: "saturation", label: "Saturation", min: 0, max: 2, step: 0.01, default: 1 },
      { kind: "slider", key: "exposure", label: "Exposure", min: -1, max: 1, step: 0.01, default: 0 },
      { kind: "slider", key: "hue", label: "Hue", min: -180, max: 180, step: 1, default: 0 },
      { kind: "slider", key: "temperature", label: "Temperature", min: -1, max: 1, step: 0.01, default: 0 },
      { kind: "slider", key: "gamma", label: "Gamma", min: 0.2, max: 2.5, step: 0.01, default: 1 },
    ],
  },
  posterize: {
    label: "Posterize",
    blurb: "Quantize tones into bands",
    category: "tone",
    controls: [
      { kind: "slider", key: "levels", label: "Levels", min: 2, max: 16, step: 1, default: 5 },
      { kind: "switch", key: "perChannel", label: "Per-channel", default: false },
    ],
  },
  grayscale: {
    label: "Grayscale",
    blurb: "Desaturate",
    category: "tone",
    controls: [{ kind: "slider", key: "amount", label: "Amount", min: 0, max: 1, step: 0.01, default: 1 }],
  },
  gradientMap: {
    label: "Gradient map",
    blurb: "Map luminance to a color ramp (duotone+)",
    category: "color",
    controls: [
      {
        kind: "gradient",
        key: "stops",
        label: "Ramp",
        default: [
          { t: 0, color: "#241a14" },
          { t: 1, color: "#f3e2cf" },
        ],
      },
      { kind: "slider", key: "amount", label: "Amount", min: 0, max: 1, step: 0.01, default: 1 },
    ],
  },
  grain: {
    label: "Grain",
    blurb: "Film grain / noise overlay",
    category: "post",
    controls: [
      { kind: "slider", key: "amount", label: "Amount", min: 0, max: 0.7, step: 0.01, default: 0.14 },
      { kind: "slider", key: "size", label: "Size", min: 1, max: 6, step: 0.5, default: 1.5, unit: true },
      { kind: "switch", key: "mono", label: "Monochrome", default: true },
      { kind: "switch", key: "animate", label: "Animate", default: true },
      { kind: "slider", key: "seed", label: "Seed", min: 1, max: 999, step: 1, default: 1 },
      { kind: "select", key: "blend", label: "Blend", options: BLENDS, default: "soft-light" },
    ],
  },
  vignette: {
    label: "Vignette",
    blurb: "Darkened edges",
    category: "post",
    controls: [
      { kind: "slider", key: "amount", label: "Amount", min: 0, max: 1, step: 0.01, default: 0.4 },
      { kind: "slider", key: "radius", label: "Radius", min: 0, max: 1, step: 0.01, default: 0.75 },
      { kind: "slider", key: "softness", label: "Softness", min: 0, max: 1, step: 0.01, default: 0.45 },
      { kind: "color", key: "color", label: "Color", default: "#000000" },
    ],
  },
};

export const CATEGORY_LABEL: Record<CategoryId, string> = { converter: "Converters", tone: "Tone", color: "Color", post: "Post" };
export const CATEGORY_ORDER: CategoryId[] = ["converter", "tone", "color", "post"];
/** The add-effect menu's order (the catalog's EFFECT_ORDER, filtered to the ported effects). */
export const EFFECT_ORDER: EffectType[] = ["dither", "halftone", "adjust", "posterize", "grayscale", "gradientMap", "grain", "vignette"];

export function defaultParams(type: EffectType): Params {
  return Object.fromEntries(
    CATALOG[type].controls.map((c) => [c.key, c.kind === "gradient" ? c.default.map((s) => ({ ...s })) : c.default]),
  );
}

/** Effect ids are deterministic so the server and client render the same stack. */
function effect(type: EffectType, index: number, params: Params = {}, enabled = true): Effect {
  return { id: `${type}-${index}`, type, enabled, params: { ...defaultParams(type), ...params } };
}

let added = 0;
/** A new effect from the add-effect search, appended to the stack. */
export function makeEffect(type: EffectType): Effect {
  added += 1;
  return { id: `${type}-added-${added}`, type, enabled: true, params: defaultParams(type) };
}

export type PresetCategory = "Print" | "Film" | "Grade";
export type Preset = { slug: string; name: string; category: PresetCategory; build: () => Effect[] };

const INK_PAPER: GradientStop[] = [
  { t: 0, color: "#16140f" },
  { t: 1, color: "#f1ece4" },
];

/** The curated presets whose effects are all ported, in the gallery's order. */
export const PRESETS: Preset[] = [
  {
    slug: "bayer-dither",
    name: "Bayer 8×8",
    category: "Print",
    // The ink/paper gradient map ships disabled: one toggle turns it into the mono print variant.
    build: () => [
      effect("adjust", 0, { contrast: 1.15 }),
      effect("dither", 1, { type: "bayer8", levels: 2, scale: 3, mono: false }),
      effect("gradientMap", 2, { stops: INK_PAPER }, false),
    ],
  },
  {
    slug: "riso-halftone",
    name: "Riso halftone",
    category: "Print",
    build: () => [
      effect("adjust", 0, { brightness: 1.15, contrast: 1.4 }),
      effect("halftone", 1, { cell: 10, angle: 46, dotShape: "square", ink: "#d9412b", paper: "#f3ecdf" }),
      effect("grain", 2, { amount: 0.05, blend: "multiply" }),
    ],
  },
  {
    slug: "newsprint",
    name: "Newsprint",
    category: "Print",
    build: () => [effect("grayscale", 0), effect("halftone", 1, { cell: 8, mode: "mono", aa: true })],
  },
  {
    slug: "cmyk-print",
    name: "CMYK print",
    category: "Print",
    build: () => [effect("halftone", 0, { cell: 9, mode: "cmyk", aa: true, contrast: 0.8, gooey: 0.54 })],
  },
  {
    slug: "risograph",
    name: "Risograph",
    category: "Print",
    build: () => [effect("posterize", 0, { levels: 4 }), effect("gradientMap", 1), effect("grain", 2, { amount: 0.22, blend: "multiply" })],
  },
  {
    slug: "sepia-film",
    name: "Sepia film",
    category: "Film",
    build: () => [effect("gradientMap", 0), effect("grain", 1, { amount: 0.16 }), effect("vignette", 2, { amount: 0.5 })],
  },
  {
    slug: "heavy-grain",
    name: "Heavy grain",
    category: "Film",
    build: () => [effect("grayscale", 0), effect("grain", 1, { amount: 0.5, mono: true })],
  },
  {
    slug: "duotone",
    name: "Duotone",
    category: "Grade",
    build: () => [
      effect("gradientMap", 0, {
        stops: [
          { t: 0, color: "#10243a" },
          { t: 1, color: "#f2d8b8" },
        ],
      }),
    ],
  },
  {
    slug: "grade-bw",
    name: "Black & white",
    category: "Grade",
    build: () => [effect("grayscale", 0), effect("adjust", 1, { contrast: 1.15 })],
  },
];

export const PRESET_CATEGORY_ORDER: PresetCategory[] = ["Print", "Film", "Grade"];

export function presetBySlug(slug: string) {
  return PRESETS.find((p) => p.slug === slug);
}

/** Eight effects stacked by hand: the effects panel at its longest. */
function longStack(): Effect[] {
  return [
    effect("adjust", 0, { contrast: 1.2, saturation: 0.85 }),
    effect("posterize", 1, { levels: 6 }),
    effect("gradientMap", 2, {
      stops: [
        { t: 0, color: "#10243a" },
        { t: 1, color: "#f2d8b8" },
      ],
    }),
    effect("halftone", 3, { cell: 7, mode: "mono", ink: "#10243a", paper: "#f2d8b8", contrast: 1.1 }),
    effect("dither", 4, { type: "bayer4", levels: 3 }, false),
    effect("grayscale", 5, { amount: 0.4 }, false),
    effect("vignette", 6, { amount: 0.3 }),
    effect("grain", 7, { amount: 0.12 }),
  ];
}

export function stackFor(preset: ShaderLabState["preset"]): Effect[] {
  if (preset === "none") return [];
  if (preset === "long") return longStack();
  return presetBySlug(preset)?.build() ?? [];
}

/** A look the reviewer saved and then changed: the halftone's cell size moved from 9 to 13. */
export const TWEAK = { type: "halftone" as EffectType, key: "cell", value: 13 };

export function applyTweak(stack: Effect[]): Effect[] {
  const index = stack.findIndex((e) => e.type === TWEAK.type);
  const target = index >= 0 ? index : 0;
  return stack.map((e, i) => {
    if (i !== target) return e;
    if (e.type === TWEAK.type) return { ...e, params: { ...e.params, [TWEAK.key]: TWEAK.value } };
    // Stacks without a halftone get their first slider nudged instead.
    const slider = CATALOG[e.type].controls.find((c) => c.kind === "slider");
    if (!slider || slider.kind !== "slider") return e;
    return { ...e, params: { ...e.params, [slider.key]: Math.min(slider.max, Number(e.params[slider.key]) + slider.step * 10) } };
  });
}

// ------------------------------------------------------------------ Sources

export type Example = {
  slug: string;
  subject: string;
  preset: string;
  /** The example's source: the Pexels clip's poster frame (the rebuild renders stills, not video). */
  image: string;
  /** Pre-rendered thumbnail from the app (`public/examples/<slug>.webp`). */
  thumb: string;
  video: string;
  credit: string;
  page: string;
};

const BASE = "/examples/shader-lab";

export const EXAMPLES: Example[] = [
  {
    slug: "koi-cmyk",
    subject: "Koi",
    preset: "cmyk-print",
    image: `${BASE}/sources/koi.jpg`,
    thumb: `${BASE}/examples/koi-cmyk.webp`,
    video: "https://videos.pexels.com/video-files/6392574/6392574-hd_1280_720_30fps.mp4",
    credit: "Piya Nimityongskul",
    page: "https://www.pexels.com/video/colorful-fishes-in-a-river-6392574/",
  },
  {
    slug: "palms-halftone",
    subject: "Palms",
    preset: "riso-halftone",
    image: `${BASE}/sources/palms.jpg`,
    thumb: `${BASE}/examples/palms-halftone.webp`,
    video: "https://videos.pexels.com/video-files/19434489/19434489-hd_1280_720_24fps.mp4",
    credit: "Emmett Loverde",
    page: "https://www.pexels.com/video/san-diego-palm-trees-blowing-in-storm-winds-19434489/",
  },
  {
    slug: "clouds-bayer",
    subject: "Clouds",
    preset: "bayer-dither",
    image: `${BASE}/sources/clouds.jpg`,
    thumb: `${BASE}/examples/clouds-bayer.webp`,
    video: "https://videos.pexels.com/video-files/5865939/5865939-hd_1280_720_30fps.mp4",
    credit: "Tolga KARAKAYA",
    page: "https://www.pexels.com/video/time-lapse-video-of-white-clouds-in-the-sky-5865939/",
  },
];

export type Starter = { id: string; label: string; url: string };

export const STARTERS: Starter[] = [
  { id: "mon-haystack", label: "Haystack", url: `${BASE}/starters/mon-haystack.jpg` },
  { id: "mon-sunrise", label: "Sunrise", url: `${BASE}/starters/mon-sunrise.jpg` },
  { id: "mon-poppies", label: "Poppies", url: `${BASE}/starters/mon-poppies.jpg` },
  { id: "photo-fog", label: "Fog", url: `${BASE}/starters/photo-fog.jpg` },
  { id: "photo-dunes", label: "Dunes", url: `${BASE}/starters/photo-dunes.jpg` },
  { id: "atmo-charles", label: "Charles", url: `${BASE}/starters/atmo-charles.jpg` },
];

/** The reviewer's own photo, as if dropped onto the stage. */
export const UPLOAD = { name: "IMG_4120.jpg", url: `${BASE}/sources/upload-surf.jpg` };

/**
 * What the editor's source points at. Examples are video sources in the app
 * (the Video tab is active), uploads and starters are images.
 */
export type Source =
  | { mode: "video"; kind: "example"; slug: string }
  | { mode: "image" | "video"; kind: "upload" }
  | { mode: "image"; kind: "starter"; id: string }
  | { mode: "video" | "image"; kind: "none" };

export function sourceFor(source: ShaderLabState["source"]): Source {
  if (source === "none") return { mode: "image", kind: "none" };
  if (source === "upload") return { mode: "image", kind: "upload" };
  const slug = EXAMPLES.find((e) => e.subject.toLowerCase() === source)?.slug ?? EXAMPLES[0].slug;
  return { mode: "video", kind: "example", slug };
}

export function sourceUrl(source: Source): string | null {
  if (source.kind === "example") return EXAMPLES.find((e) => e.slug === source.slug)?.image ?? null;
  if (source.kind === "upload") return UPLOAD.url;
  if (source.kind === "starter") return STARTERS.find((s) => s.id === source.id)?.url ?? null;
  return null;
}

export function sourceLabel(source: Source): string {
  if (source.kind === "example") return EXAMPLES.find((e) => e.slug === source.slug)?.subject ?? "Video";
  if (source.kind === "upload") return "Upload";
  if (source.kind === "starter") return STARTERS.find((s) => s.id === source.id)?.label ?? "Image";
  return source.mode === "video" ? "Video" : "";
}

/** The header's suggested draft name: the top two effects and the source (library.ts suggestDraftName). */
export function suggestDraftName(stack: Effect[], source: Source): string {
  const fx = stack
    .filter((e) => e.enabled)
    .map((e) => CATALOG[e.type].label)
    .slice(0, 2)
    .join(" + ");
  const src = sourceLabel(source);
  if (fx && src) return `${fx} · ${src}`;
  return fx || src || "Untitled";
}

/** The name a reviewer gave the look when they saved it. */
export const SAVED_DRAFT_NAME = "Koi print, softer dots";

/** Output aspect ratios (resolution.ts ASPECTS). */
export const ASPECTS = [
  { id: "3:2", label: "3:2 landscape", ratio: 3 / 2 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "21:9", label: "21:9 ultrawide", ratio: 21 / 9 },
  { id: "1:1", label: "1:1 square", ratio: 1 },
  { id: "2:3", label: "2:3 portrait", ratio: 2 / 3 },
  { id: "9:16", label: "9:16 portrait", ratio: 9 / 16 },
] as const;

export type AspectId = (typeof ASPECTS)[number]["id"];

export function outputDims(aspect: AspectId, longEdge: number) {
  const a = ASPECTS.find((x) => x.id === aspect)?.ratio ?? 16 / 9;
  const L = Math.max(16, Math.round(longEdge));
  return a >= 1 ? { W: L, H: Math.round(L / a) } : { W: Math.round(L * a), H: L };
}

/** Pexels quick-search chips (presets.ts PEXELS_TAGS). */
export const PEXELS_TAGS = ["minimal", "fog", "dune", "gradient sky", "grain texture", "monochrome landscape", "soft light", "mist", "horizon", "concrete"];
