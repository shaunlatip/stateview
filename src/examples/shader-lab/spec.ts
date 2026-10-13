import { CATALOG, EXAMPLES, STARTERS, UPLOAD, defaultParams, outputDims, presetBySlug, sourceUrl } from "./fixtures";
import type { AspectId, ControlSpec, Effect, GradientStop, ParamValue, Source } from "./fixtures";

/**
 * "Copy spec": the hand-off document from shader-lab's `spec.ts`. A readable
 * summary of the source, output size and the ordered stack (every param that
 * differs from its default), then the exact config JSON.
 */

export type Output = { aspect: AspectId; longEdge: number };

const isStops = (v: ParamValue): v is GradientStop[] => Array.isArray(v);

function fmtValue(v: ParamValue | undefined): string {
  if (v === undefined) return "undefined";
  if (isStops(v)) return v.map((s) => `${s.color} @ ${s.t}`).join(", ");
  if (typeof v === "string") return JSON.stringify(v);
  return String(v);
}

const same = (a: ParamValue | undefined, b: ParamValue | undefined) => JSON.stringify(a) === JSON.stringify(b);

function controlLabel(controls: ControlSpec[], key: string) {
  const c = controls.find((x) => x.key === key);
  return c ? `${c.label} (\`${key}\`)` : `\`${key}\``;
}

function sizeNote(c: ControlSpec, v: ParamValue | undefined, W: number) {
  if (c.kind !== "slider" || !c.unit || typeof v !== "number") return "";
  return ` → ${+(v * (W / 1000)).toFixed(2)}px at ${W}px wide`;
}

function imageId(source: Source) {
  if (source.kind === "example") {
    const ex = EXAMPLES.find((e) => e.slug === source.slug);
    return ex ? `pexels:video:${ex.video}` : null;
  }
  if (source.kind === "upload") return `blob:${UPLOAD.name}`;
  return sourceUrl(source);
}

function describeSource(source: Source): string[] {
  const lines = [`- Mode: ${source.mode}`];
  if (source.kind === "none") return [...lines, `- Asset: none (empty ${source.mode} source)`];
  if (source.kind === "example") {
    const ex = EXAMPLES.find((e) => e.slug === source.slug);
    if (ex) {
      const preset = presetBySlug(ex.preset)?.name ?? ex.preset;
      lines.push(
        `- Asset: Pexels video — ${ex.video}`,
        `- Pexels page: ${ex.page} — by ${ex.credit}`,
        `- Built-in example: "${ex.subject}" (\`${ex.slug}\`, paired with the ${preset} preset)`,
        `- Poster frame: ${ex.image}`,
        "- The JSON's `source.imageId` carries this file URL (`pexels:video:<url>`); the CDN serves it with CORS `*`, so it loads directly.",
        "- Source pixels: 1280×720",
        "- Playhead: 0.00s · speed 1× · paused · loop on",
      );
    }
  } else if (source.kind === "upload") {
    lines.push(
      "- Asset: local upload (image). Its URL only resolves in the browser tab it was dropped into — attach the original file alongside this spec.",
      "- Source pixels: 1280×720",
    );
  } else {
    const s = STARTERS.find((x) => x.id === source.id);
    lines.push(`- Asset: built-in gallery image "${s?.label ?? source.id}" (\`${source.id}\`) — \`public${s?.url ?? ""}\``);
  }
  lines.push("- Crop / rotate: none", "- Fit: cover — after crop/rotate, scaled to fill the output frame, centered, overflow cropped");
  return lines;
}

function describeStack(stack: Effect[], W: number): string[] {
  if (!stack.length) return ["(no effects — the source renders as-is)"];
  return stack.map((e, i) => {
    const meta = CATALOG[e.type];
    const defaults = defaultParams(e.type);
    const changed = meta.controls
      .filter((c) => !c.showIf || c.showIf.in.includes(e.params[c.showIf.key] as ParamValue))
      .filter((c) => !same(e.params[c.key], defaults[c.key]))
      .map(
        (c) =>
          `   - ${controlLabel(meta.controls, c.key)}: ${fmtValue(e.params[c.key])}${sizeNote(c, e.params[c.key], W)} (default ${fmtValue(defaults[c.key])})`,
      );
    const head = `${i + 1}. ${meta.label} (\`${e.type}\`)${e.enabled ? "" : " — DISABLED, skipped by the renderer"}`;
    return [head, ...(changed.length ? changed : ["   - all params at default"])].join("\n");
  });
}

export function buildSpec(opts: { name: string; source: Source; stack: Effect[]; output: Output }) {
  const { aspect, longEdge } = opts.output;
  const dims = outputDims(aspect, longEdge);
  const config = {
    source: { mode: opts.source.mode, imageId: imageId(opts.source) },
    stack: opts.stack.map(({ id, type, enabled, params }) => ({ id, type, enabled, params })),
    output: opts.output,
  };
  return [
    `# Shader Lab spec — ${opts.name}`,
    "",
    "Exact editor state from Shader Lab. The JSON at the bottom is the full `BgConfig` (`src/lib/bg-lab/types.ts`) and is the source of truth; the summary is derived from it. `validateConfig` in `src/lib/bg-lab/schema.ts` parses it.",
    "",
    "## Source",
    ...describeSource(opts.source),
    "",
    "## Output",
    `- Aspect ${aspect} · long edge ${longEdge}px → ${dims.W}×${dims.H}px`,
    "- The live preview renders the same config at up to 1100px on the long edge; size params scale with width, so it's proportionally identical to the export.",
    "",
    "## Effect stack (render order, top → bottom)",
    "Only params that differ from the catalog default are listed; the JSON has every value. Size params are in units of output width ÷ 1000, not pixels — the arrow gives the pixel size at the export width.",
    "",
    ...describeStack(opts.stack, dims.W),
    "",
    "## Config JSON",
    "```json",
    JSON.stringify(config, null, 2),
    "```",
    "",
  ].join("\n");
}
