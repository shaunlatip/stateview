"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CopyPlus, Crop, Download, ImageDown, Plus, Search, Shuffle, Trash2, Upload } from "lucide-react";
import { cn } from "./cn";
import { SlButton } from "./components/ui/button";
import { CollapsibleSection } from "./components/ui/collapsible";
import { SlInput, SlSelect } from "./components/ui/fields";
import { SlTabs } from "./components/ui/tabs";
import { IconTip } from "./components/ui/tooltip";
import { ASPECTS, PEXELS_TAGS, STARTERS, outputDims, type AspectId } from "./fixtures";
import type { Format, Lab } from "./use-lab";
import { useDrop } from "./use-drop";

const NOT_HERE = "Not part of this rebuild";

/** PexelsSearch: this build has no Pexels key, so every search ends in the app's no-key message. */
function PexelsSearch({ kind }: { kind: "photo" | "video" }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"loading" | "disabled">("disabled");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const search = (query: string) => {
    if (!query.trim()) return;
    setStatus("loading");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("disabled"), 500);
  };

  return (
    <CollapsibleSection title="Pexels">
      <div className="flex flex-col gap-2.5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            search(q);
          }}
          className="flex gap-1.5"
        >
          <SlInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Pexels…"
            aria-label={kind === "video" ? "Search Pexels videos" : "Search Pexels photos"}
          />
          <IconTip label="Search Pexels">
            <SlButton type="submit" variant="outline" size="icon-sm" aria-label="Search">
              <Search className="size-3.5" />
            </SlButton>
          </IconTip>
        </form>
        <div className="sl-no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5">
          {PEXELS_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                setQ(tag);
                search(tag);
              }}
              className="shrink-0 cursor-pointer rounded-full border border-sl-border px-2.5 py-0.5 text-sl-11 whitespace-nowrap text-sl-text-2 transition duration-150 ease-out hover:border-sl-border-strong hover:text-sl-text motion-safe:active:scale-95"
            >
              {tag}
            </button>
          ))}
        </div>
        <p role="status" className="text-sl-11 leading-snug text-sl-text-2">
          {status === "loading" ? "Searching…" : "Pexels search isn’t configured (no API key). Gallery + upload still work."}
        </p>
      </div>
    </CollapsibleSection>
  );
}

/** SourcePanel: Image / Video / Generated / Solid, then that tab's pickers. */
function SourcePanel({ lab }: { lab: Lab }) {
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const tab = lab.source.mode;
  const hasMedia = lab.source.kind !== "none";

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) lab.actions.loadFile(file);
    e.target.value = "";
  };

  return (
    <section className="flex flex-col gap-4">
      <SlTabs
        label="Source type"
        tourId="source"
        value={tab}
        onValueChange={(v) => {
          if (v === "image" || v === "video") lab.actions.setTab(v);
        }}
        items={[
          { value: "image", label: "Image" },
          { value: "video", label: "Video" },
          { value: "generated", label: "Generated", disabled: true, title: NOT_HERE },
          { value: "solid", label: "Solid", disabled: true, title: NOT_HERE },
        ]}
      />

      <div className="flex gap-1.5">
        <SlButton
          variant="lab"
          size="box"
          className="flex-1"
          onClick={tab === "video" ? lab.actions.randomVideo : lab.actions.randomImage}
        >
          <Shuffle className="size-3.5" />
          {tab === "video" ? "Random video" : "Random image"}
        </SlButton>
        {hasMedia && (
          <SlButton variant="lab" size="box" className="flex-1" disabled title={NOT_HERE}>
            <Crop className="size-3.5" /> Crop
          </SlButton>
        )}
      </div>

      {tab === "image" ? (
        <>
          <SlButton variant="upload" size="upload" onClick={() => imageRef.current?.click()}>
            <Upload className="size-3.5" /> Upload image
          </SlButton>
          <input ref={imageRef} type="file" accept="image/*" hidden onChange={onPick} />
          <PexelsSearch kind="photo" />
          <CollapsibleSection title="Starters">
            <div className="grid grid-cols-3 gap-1.5">
              {STARTERS.map((s) => {
                const active = lab.source.kind === "starter" && lab.source.id === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    title={s.label}
                    aria-pressed={active}
                    onClick={() => lab.actions.pickStarter(s.id)}
                    className={cn(
                      "group aspect-square cursor-pointer overflow-hidden rounded-sl-control border-2 transition duration-150 ease-out motion-safe:active:scale-96",
                      active ? "border-sl-text" : "border-transparent hover:border-sl-border-strong",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- a fixed local starter */}
                    <img
                      src={s.url}
                      alt={s.label}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-300 ease-out motion-safe:group-hover:scale-106"
                    />
                  </button>
                );
              })}
            </div>
          </CollapsibleSection>
        </>
      ) : (
        <>
          <SlButton variant="upload" size="upload" onClick={() => videoRef.current?.click()}>
            <Upload className="size-3.5" /> Upload video
          </SlButton>
          <input ref={videoRef} type="file" accept="video/*" hidden onChange={onPick} />
          <PexelsSearch kind="video" />
        </>
      )}
    </section>
  );
}

function DraftsPanel({ lab }: { lab: Lab }) {
  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          lab.actions.saveDraft(true);
        }}
        className="flex gap-1.5"
      >
        <SlInput
          value={lab.draftName}
          onChange={(e) => lab.setDraftName(e.target.value)}
          placeholder={lab.suggested}
          aria-label="Draft name"
        />
        <IconTip label={lab.hasActiveDraft ? "Update draft" : "Save draft"}>
          <SlButton type="submit" variant="lab" size="square" aria-label={lab.hasActiveDraft ? "Update draft" : "Save draft"}>
            <Plus className="size-4" />
          </SlButton>
        </IconTip>
        {lab.hasActiveDraft && (
          <IconTip label="Save as new draft" align="end">
            <SlButton variant="lab" size="square" onClick={lab.actions.saveAsNewDraft} aria-label="Save as new draft">
              <CopyPlus className="size-4" />
            </SlButton>
          </IconTip>
        )}
      </form>
      {lab.drafts.length === 0 ? (
        <p className="rounded-md border border-dashed border-sl-border px-3 py-8 text-center text-sl-12 leading-relaxed text-sl-text-2">
          {lab.hasActiveDraft ? "No other drafts." : "No drafts yet."}
          <br />
          Save the current image + effects above.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {lab.drafts.map((d) => (
            <li
              key={d.id}
              className="group/draft flex items-center gap-2 rounded-sl-card border border-sl-border bg-sl-canvas p-2 transition-colors hover:border-sl-border-strong"
            >
              <button
                type="button"
                onClick={() => lab.actions.loadDraft(d.id)}
                className="flex min-w-0 flex-1 cursor-pointer flex-col items-start text-left"
              >
                <span className="w-full truncate text-sl-13 font-medium text-sl-text">{d.name}</span>
                <span className="text-sl-11 text-sl-text-2">
                  {d.stack.length} effect{d.stack.length === 1 ? "" : "s"} · {lab.output.aspect}
                </span>
              </button>
              <IconTip label="Delete draft" align="end">
                <SlButton
                  variant="quiet"
                  size="tiny"
                  onClick={() => lab.actions.removeDraft(d.id)}
                  aria-label={`Delete ${d.name}`}
                  className="opacity-0 group-hover/draft:opacity-100 focus-visible:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </SlButton>
              </IconTip>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const FORMATS: { value: Format; label: string }[] = [
  { value: "png", label: "PNG" },
  { value: "jpg", label: "JPG" },
  { value: "mp4", label: "MP4 (video)" },
  { value: "gif", label: "GIF (video)" },
  { value: "pngseq", label: "PNG sequence (.zip)" },
];

function ExportBar({ lab }: { lab: Lab }) {
  const { aspect, longEdge } = lab.output;
  const dims = outputDims(aspect, longEdge);
  const isClip = lab.format === "mp4" || lab.format === "gif";
  const isSeq = lab.format === "pngseq";
  const pct = Math.round((lab.exporting ?? 0) * 100);
  const verb = isSeq ? "Rendering" : isClip ? "Encoding" : "Exporting";
  const label =
    lab.exporting !== null ? `${verb}… ${pct}%` : isSeq ? "Export PNG sequence" : `Export ${lab.format.toUpperCase()}`;

  return (
    <div data-tour="export" className="border-t border-sl-border bg-sl-canvas p-3">
      <CollapsibleSection title="Export" defaultOpen={lab.exportOpen} reverse>
        <div className="flex flex-col gap-2.5">
          <div className="sl-export-row grid items-center gap-2">
            <span id="sl-export-aspect" className="text-sl-11 text-sl-text-2">
              Aspect
            </span>
            <SlSelect
              labelledBy="sl-export-aspect"
              value={aspect}
              onValueChange={(v) => lab.setOutput({ ...lab.output, aspect: v as AspectId })}
              options={ASPECTS.map((a) => ({ value: a.id, label: a.label }))}
            />
          </div>
          <div className="sl-export-row grid items-center gap-2">
            <label htmlFor="sl-export-size" className="text-sl-11 text-sl-text-2">
              Size
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <SlInput
                  id="sl-export-size"
                  type="number"
                  min={200}
                  max={6000}
                  step={100}
                  value={longEdge}
                  onChange={(e) => lab.setOutput({ ...lab.output, longEdge: Number(e.target.value) || 2000 })}
                  aria-label="Long edge (px)"
                  className="pr-7"
                />
                <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sl-11 text-sl-text-2">px</span>
              </div>
              <span className="shrink-0 font-mono text-sl-11 text-sl-text-2 tabular-nums">
                {dims.W} × {dims.H}
              </span>
            </div>
          </div>
          <div className="sl-export-row grid items-center gap-2">
            <span id="sl-export-format" className="text-sl-11 text-sl-text-2">
              Format
            </span>
            <SlSelect labelledBy="sl-export-format" value={lab.format} onValueChange={(v) => lab.actions.setFormat(v as Format)} options={FORMATS} />
          </div>
          <div className="sl-export-row grid items-center gap-2">
            <span id="sl-export-scale" className="text-sl-11 text-sl-text-2">
              Scale
            </span>
            <SlSelect
              labelledBy="sl-export-scale"
              value={String(lab.scale)}
              onValueChange={(v) => lab.setScale(Number(v))}
              options={[1, 2, 3, 4].map((s) => {
                const d = outputDims(aspect, longEdge * s);
                return { value: String(s), label: `${s}× · ${d.W}×${d.H}` };
              })}
            />
          </div>
          {(isClip || isSeq) && (
            <div className="sl-export-row grid items-center gap-2">
              <label htmlFor="sl-export-fps" className="text-sl-11 text-sl-text-2">
                FPS
              </label>
              <SlInput id="sl-export-fps" type="number" min={6} max={60} step={1} defaultValue={30} aria-label="Frames per second" />
            </div>
          )}
          {isClip && (
            <p className="text-sl-10 leading-snug text-sl-text-2">
              {lab.source.mode === "video"
                ? "Renders every frame of the clip (≤ 30s, ≤ 1080p)."
                : "Exports a 3s loop of the animated effects."}
            </p>
          )}
          {isSeq && (
            <p className="text-sl-10 leading-snug text-sl-text-2">
              A 3s PNG frame sequence (.zip) at full resolution — feed to the ffmpeg alpha pipeline for VP9/HEVC-alpha video (see
              docs/alpha-video.md).
            </p>
          )}
          <span className="mt-0.5 block">
            <SlButton variant="solid" size="cta" disabled={lab.exporting !== null} onClick={lab.actions.runExport}>
              {lab.exporting !== null && (
                <span aria-hidden className="sl-width-var absolute inset-y-0 left-0 bg-sl-canvas/15 transition-all duration-150 ease-out" style={{ "--sl-width": `${pct}%` } as CSSProperties} />
              )}
              <span className="relative z-10 inline-flex items-center">
                <Download className="mr-1.5 size-3.5" />
                {label}
              </span>
            </SlButton>
          </span>
        </div>
      </CollapsibleSection>
    </div>
  );
}

/**
 * The left panel: what goes in (Source), what's kept (Drafts), and the Export
 * drawer pinned at the bottom. The whole panel takes a dropped file too.
 */
export function LeftPanel({ lab, drawer }: { lab: Lab; drawer: boolean }) {
  const drop = useDrop(lab.actions.loadFile);
  return (
    <aside
      aria-label="Source"
      {...drop.handlers}
      className={cn(
        "relative flex w-82 shrink-0 flex-col overflow-hidden border-r border-sl-border bg-sl-canvas",
        drawer && "sl-drawer-max absolute inset-y-0 left-0 z-40 shadow-sl-5 motion-safe:animate-in motion-safe:duration-200 motion-safe:slide-in-from-left",
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-5 p-3">
          <CollapsibleSection title="Source">
            <SourcePanel lab={lab} />
          </CollapsibleSection>
          <div className="border-t border-sl-border pt-4">
            <CollapsibleSection title="Drafts" defaultOpen={false}>
              <DraftsPanel lab={lab} />
            </CollapsibleSection>
          </div>
        </div>
      </div>
      <ExportBar lab={lab} />
      {drop.dragOver && (
        <div className="pointer-events-none absolute inset-1.5 z-20 flex flex-col items-center justify-center gap-2 rounded-sl-card border-2 border-dashed border-sl-text bg-sl-canvas/90 backdrop-blur-sm">
          <ImageDown aria-hidden className="size-6 text-sl-text" />
          <span className="text-sl-13 font-medium text-sl-text">Drop to set as source</span>
        </div>
      )}
    </aside>
  );
}
