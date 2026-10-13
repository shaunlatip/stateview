/**
 * The home page's content, copied from the portfolio's studio-emitted JSON
 * (data/projects.json, data/experiments.json) and pages/index.tsx on main.
 * Images are stills in public/examples/portfolio: video cards show their
 * poster frame, layered cards their painted backdrop plus the static UI layer.
 */

const ASSET = "/examples/portfolio";

export const SITE = "https://latip.me";

export type Print = { src: string; alt: string };

export const PRINTS: Print[] = [
  { src: `${ASSET}/prints/tuolumne.jpg`, alt: "Shaun sitting on a wooden footbridge in Tuolumne Meadows, Yosemite" },
  { src: `${ASSET}/prints/charles.jpg`, alt: "Red sailboats on the Charles River, seen from the Cambridge bank" },
  { src: `${ASSET}/prints/yosemite.jpg`, alt: "Granite domes and pines at dusk in Yosemite high country" },
  { src: `${ASSET}/prints/arch.jpg`, alt: "Shaun in front of Delicate Arch in Moab, Utah" },
  { src: `${ASSET}/prints/pines.jpg`, alt: "Autumn pines and golden foliage in New England" },
];

export const PORTRAIT = PRINTS[0].src;

export const HERO_LEAD =
  "I love working across the entire process of how something gets built; from strategy and systems, to pixels and code.";
export const HERO_PLAYLIST_TAIL =
  ", I’ve been building and scaling complex B2B systems that tens of thousands of wellness businesses rely on every day.";

/** The nameplate's role line rolls between these two. */
export const ROLES = ["product designer", "design engineer"] as const;

export type CardMedia =
  | { kind: "image"; src: string; aspect: "675 / 449" | "1920 / 1284" }
  | { kind: "layered"; backdrop: string; ui: string; position: string };

export type WorkItem = {
  key: string;
  title: string;
  description: string;
  org: string;
  time: string;
  href: string;
  /** Leaves the site: a new-tab chip and alias cursor instead of ↗. */
  external: boolean;
  articleHref?: string;
  media: CardMedia;
};

/** The selected-work rail: the featured project, the featured experiment, then every other project. */
export const WORK: WorkItem[] = [
  {
    key: "agentic-platform",
    title: "Mindbody AI",
    description: "Teaching Mindbody to act: from a support assistant to an agentic platform",
    org: "Playlist",
    time: "Present",
    href: `${SITE}/work/agentic-platform`,
    external: false,
    articleHref: "https://athletechnews.com/not-just-a-tool-a-teammate-mindbodys-ai-assistant-goes-beyond-support/",
    media: { kind: "image", src: `${ASSET}/work/mindbody-ai.jpg`, aspect: "675 / 449" },
  },
  {
    key: "curio",
    title: "Curio",
    description: "Search, explore CC0 art across five museums with an AI guide",
    org: "Solo project",
    time: "Sep 2026",
    href: "https://curiosearch.art/",
    external: true,
    media: { kind: "image", src: `${ASSET}/work/curio.jpg`, aspect: "1920 / 1284" },
  },
  {
    key: "appointments-overview",
    title: "Appointment Setup",
    description: "Redesigning for simplicity, clarity, and flexibility",
    org: "Playlist",
    time: "Q3 2025",
    href: `${SITE}/work/appointments-overview`,
    external: false,
    media: {
      kind: "layered",
      backdrop: `${ASSET}/work/appointments-backdrop.jpg`,
      ui: `${ASSET}/work/appointments-ui.png`,
      position: "56% 50%",
    },
  },
  {
    key: "corporate-dashboard",
    title: "Corporate Dashboard",
    description: "Clearer tools for our largest customers",
    org: "Playlist",
    time: "Q1 2026",
    href: `${SITE}/work/corporate-dashboard`,
    external: false,
    media: {
      kind: "layered",
      backdrop: `${ASSET}/work/corporate-backdrop.jpg`,
      ui: `${ASSET}/work/corporate-ui.png`,
      position: "56% 45%",
    },
  },
  {
    key: "settings",
    title: "Settings",
    description: "A new settings framework built on search and progressive disclosure",
    org: "Playlist",
    time: "Q4 2024",
    href: `${SITE}/work/settings`,
    external: false,
    media: {
      kind: "layered",
      backdrop: `${ASSET}/work/settings-backdrop.jpg`,
      ui: `${ASSET}/work/settings-ui.png`,
      position: "50% 42%",
    },
  },
];

export type ExperimentMedia =
  | { kind: "image"; src: string }
  | { kind: "layered"; ground: string; ui: string; alt: string }
  | { kind: "compare"; original: string; edited: string };

export type Experiment = {
  key: string;
  title: string;
  description: string;
  href: string;
  external: boolean;
  /** 12-column span on the desktop grid; scroller width below lg. */
  span: 2 | 3 | 4 | 5;
  /** Natural aspect of the asset, "w / h". */
  aspect: string;
  /** The case study behind a live-app card, as a hover chip on its corner. */
  readoutHref?: string;
  media: ExperimentMedia;
};

/**
 * Experiments that weren't promoted into the rail, packed into 12-column rows
 * in landing order (5 + 4 + 3, then 4 + 2 with the rest left as air).
 */
export const EXPERIMENT_ROWS: Experiment[][] = [
  [
    {
      key: "onto",
      title: "Onto",
      description:
        "A focused tool to overlay and compare any two places — countries, cities, schools, states — on top of each other in an interactive map.",
      href: "https://placeonto.com/",
      external: true,
      span: 5,
      aspect: "1400 / 1000",
      readoutHref: `${SITE}/work/onto`,
      media: {
        kind: "layered",
        ground: `${ASSET}/experiments/onto-ground.jpg`,
        ui: `${ASSET}/experiments/onto-ui.png`,
        alt: "Onto map interface",
      },
    },
    {
      key: "effects-lab",
      title: "Shader Lab",
      description:
        "Visual effects playground that stacks reorderable shaders — including dithering, Kuwahara, ASCII, halftones — onto open-source images and video. Built with WebGL.",
      href: "https://shaderlab.tools/",
      external: true,
      span: 4,
      aspect: "535 / 357",
      media: {
        kind: "compare",
        original: `${ASSET}/experiments/shader-lab-original.jpg`,
        edited: `${ASSET}/experiments/shader-lab-edited.jpg`,
      },
    },
    {
      key: "lissajous-curves",
      title: "Lissajous Curves",
      description:
        "A study on customizing stacked, complex interactive waves. Built a panel of controls to map mathematical parameters to different interactive and visual states.",
      href: `${SITE}/work/lissajous-curves`,
      external: false,
      span: 3,
      aspect: "512 / 284",
      media: { kind: "image", src: `${ASSET}/experiments/lissajous.jpg` },
    },
  ],
  [
    {
      key: "think-bot-split-flaps",
      title: "Think-Bot Split Flaps",
      description: "Designed and coded an Arduino split-flap display for an artistic robotic installation.",
      href: "https://www.browndailyherald.com/article/2021/10/richie-engn-robots",
      external: true,
      span: 4,
      aspect: "540 / 356",
      media: { kind: "image", src: `${ASSET}/experiments/robots.jpg` },
    },
    {
      key: "scallop-bot",
      title: "Scallop-Bot",
      description: "Designer, woodworker, and coder for an Arduino-based kinetic art installation.",
      href: "https://www.browndailyherald.com/article/2021/10/richie-engn-robots",
      external: true,
      span: 2,
      aspect: "248 / 248",
      media: { kind: "image", src: `${ASSET}/experiments/scallops.jpg` },
    },
  ],
];

export const NAV_ITEMS = [
  { label: "Work", target: "work" },
  { label: "Experiments", target: "experiments" },
  { label: "Writing", href: `${SITE}/#writing` },
  { label: "About", href: `${SITE}/about` },
] as const;

/** Berkeley time, the clock line's claim (not the visitor's). */
const TIME_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function berkeleyTime(date: Date) {
  const parts = TIME_PARTS.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("hour")}:${get("minute")}:${get("second")}`;
}
