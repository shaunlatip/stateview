"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToastData } from "./components/ui/toast";
import {
  CATALOG,
  EXAMPLES,
  PRESETS,
  SAVED_DRAFT_NAME,
  STARTERS,
  UPLOAD,
  applyTweak,
  makeEffect,
  outputDims,
  presetBySlug,
  sourceFor,
  sourceLabel,
  sourceUrl,
  stackFor,
  suggestDraftName,
  type AspectId,
  type Effect,
  type EffectType,
  type ParamValue,
  type Source,
} from "./fixtures";
import { buildSpec } from "./spec";
import type { ShaderLabState } from "./state";

/**
 * The editor's session: everything the screen shows, seeded from the state
 * Stateview injects and then changed by the reviewer's own clicks. Requests
 * answer from canned responses (an example "loads" in a moment, an export
 * ramps to done), so the flows can be walked end to end.
 */

export type Look = { source: Source; stack: Effect[] };
type Draft = Look & { id: string; name: string };

export type StillFormat = "png" | "jpg";
export type ClipFormat = "mp4" | "gif";
export type Format = StillFormat | ClipFormat | "pngseq";

const EXAMPLE_LOAD_MS = 700;
const TOAST_MS = 4000;
/** The seeded export's progress: mid-encode. */
const SEEDED_PROGRESS = 0.42;

const keyOf = (look: Look) => JSON.stringify(look);
const exampleLook = (slug: string): Look => {
  const ex = EXAMPLES.find((e) => e.slug === slug) ?? EXAMPLES[0];
  return { source: { mode: "video", kind: "example", slug: ex.slug }, stack: presetBySlug(ex.preset)?.build() ?? [] };
};
/** "Reset to default" lands on the lead example. */
const DEFAULT_LOOK = exampleLook(EXAMPLES[0].slug);

/** What the stage keeps showing while a picked example loads: the look before it (nothing, on a first pick of the lead example). */
function heldFor(state: ShaderLabState): Look | null {
  if (state.sourceRequest !== "loading") return null;
  if (state.source === "koi" || state.source === "none") return { source: { mode: "image", kind: "none" }, stack: [] };
  return DEFAULT_LOOK;
}

function initialToast(state: ShaderLabState): ToastData | null {
  if (state.copySpec === "copied")
    return { id: 1, kind: "success", title: "Spec copied", description: "Paste it to an agent to reproduce this look exactly." };
  if (state.copySpec === "failed") return { id: 1, kind: "error", title: "Couldn't copy to clipboard" };
  if (state.exportRequest === "done") {
    const { W, H } = outputDims("16:9", 2000);
    const format = sourceFor(state.source).mode === "video" ? "mp4" : "png";
    return { id: 1, kind: "success", title: "Exported", description: `background-${W}x${H}.${format}` };
  }
  return null;
}

let nextId = 100;

/** Only ever called from click handlers (shuffle, random image). */
function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function useLab(state: ShaderLabState) {
  const baseStack = stackFor(state.preset);
  const seededSource = sourceFor(state.source);
  const seededStack = state.draft === "changed" ? applyTweak(baseStack) : baseStack;
  const seededDrafts: Draft[] =
    state.draft === "new" ? [] : [{ id: "draft-1", name: SAVED_DRAFT_NAME, source: seededSource, stack: baseStack }];

  const [source, setSource] = useState<Source>(seededSource);
  const [stack, setStack] = useState<Effect[]>(seededStack);
  const [uploadUrl, setUploadUrl] = useState<string>(UPLOAD.url);
  const [uploadName, setUploadName] = useState<string>(UPLOAD.name);
  const [drafts, setDrafts] = useState<Draft[]>(seededDrafts);
  const [activeId, setActiveId] = useState<string | null>(seededDrafts[0]?.id ?? null);
  const [draftName, setDraftName] = useState(state.draft === "new" ? "" : SAVED_DRAFT_NAME);
  const [savedSets, setSavedSets] = useState<{ id: string; name: string; stack: Effect[] }[]>([]);
  const [examplesOpen, setExamplesOpen] = useState(state.examples === "open");
  const [tourStep, setTourStep] = useState<number | null>(state.tour === "off" ? null : Number(state.tour) - 1);
  const [tourFocus, setTourFocus] = useState(false);
  const [menuOpen, setMenuOpen] = useState(state.copySpec === "menu-open");
  const [menuFocus, setMenuFocus] = useState(false);
  const [held, setHeld] = useState<Look | null>(heldFor(state));
  const [pending, setPending] = useState(state.sourceRequest === "loading");
  const [error, setError] = useState<string | null>(
    state.sourceRequest === "failed" ? (seededSource.mode === "video" ? "Couldn't load that video." : "Couldn't load that image.") : null,
  );
  const [output, setOutput] = useState<{ aspect: AspectId; longEdge: number }>({ aspect: "16:9", longEdge: 2000 });
  const [formatChoice, setFormatChoice] = useState<{ mode: Source["mode"]; format: Format } | null>(null);
  const [scale, setScale] = useState(1);
  const [exporting, setExporting] = useState<number | null>(state.exportRequest === "exporting" ? SEEDED_PROGRESS : null);
  const [exportOpen] = useState(state.exportRequest !== "idle");
  const [drawer, setDrawer] = useState<"left" | "right" | null>(
    state.drawer === "source" ? "left" : state.drawer === "effects" ? "right" : null,
  );
  const [collapsed, setCollapsed] = useState({ left: false, right: false });
  const [theme, setTheme] = useState(state.theme);
  const [toast, setToast] = useState<(ToastData & { auto?: boolean }) | null>(initialToast(state));

  const pendingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const exportTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Interaction toasts leave after sonner's 4s; seeded ones stay for the reviewer.
  useEffect(() => {
    if (!toast?.auto) return;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(
    () => () => {
      clearTimeout(pendingTimer.current);
      clearInterval(exportTimer.current);
    },
    [],
  );

  const endTour = useCallback(() => setTourStep(null), []);

  const notify = (kind: ToastData["kind"], title: string, description?: string) =>
    setToast({ id: (nextId += 1), kind, title, description, auto: true });

  const look: Look = { source, stack };
  const active = drafts.find((d) => d.id === activeId) ?? null;
  const dirty = !active || keyOf({ source: active.source, stack: active.stack }) !== keyOf(look);
  const suggested = suggestDraftName(stack, source);
  const format: Format =
    formatChoice && formatChoice.mode === source.mode ? formatChoice.format : source.mode === "video" ? "mp4" : "png";
  const imageUrl = source.kind === "upload" ? uploadUrl : sourceUrl(source);

  /** Swap source and stack together, holding the old look on stage while the new source "loads". */
  function load(next: Look, delay = EXAMPLE_LOAD_MS) {
    clearTimeout(pendingTimer.current);
    setHeld(pending ? held : look);
    setError(null);
    setSource(next.source);
    setStack(next.stack);
    setPending(true);
    pendingTimer.current = setTimeout(() => {
      setPending(false);
      setHeld(null);
    }, delay);
  }

  const actions = {
    pickExample(slug: string) {
      load(exampleLook(slug));
    },
    pickStarter(id: string) {
      load({ source: { mode: "image", kind: "starter", id }, stack }, 250);
    },
    randomImage() {
      const options = STARTERS.filter((s) => !(source.kind === "starter" && source.id === s.id));
      const pick = pickRandom(options);
      actions.pickStarter(pick.id);
    },
    randomVideo() {
      // No Pexels key in this build: the app's own answer.
      notify("error", "Couldn't fetch a random video", "Pexels search isn't available right now.");
    },
    setTab(mode: "image" | "video") {
      if (mode === source.mode) return;
      if (mode === "image" && source.kind === "example") return load({ source: { mode: "image", kind: "starter", id: STARTERS[0].id }, stack }, 250);
      if (mode === "video" && (source.kind === "starter" || source.kind === "upload"))
        return load({ source: { mode: "video", kind: "example", slug: EXAMPLES[0].slug }, stack });
      setSource({ ...source, mode } as Source);
    },
    loadFile(file: File) {
      const url = URL.createObjectURL(file);
      if (file.type.startsWith("image/")) {
        setUploadUrl(url);
        setUploadName(file.name);
        load({ source: { mode: "image", kind: "upload" }, stack }, 150);
        return;
      }
      if (!file.type.startsWith("video/")) {
        notify("error", "Unsupported file", "Drop an image or video file.");
        return;
      }
      // The rebuild renders stills: a dropped clip contributes its first frame.
      const video = document.createElement("video");
      video.muted = true;
      video.preload = "auto";
      video.addEventListener(
        "loadeddata",
        () => {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext("2d")?.drawImage(video, 0, 0);
          setUploadUrl(canvas.toDataURL("image/jpeg", 0.9));
          setUploadName(file.name);
          load({ source: { mode: "video", kind: "upload" }, stack }, 150);
        },
        { once: true },
      );
      video.addEventListener("error", () => setError("Couldn't load that video."), { once: true });
      video.src = url;
    },
    applyStack(next: Effect[]) {
      setStack(next.map((e) => ({ ...e, params: { ...e.params } })));
    },
    applyPreset(slug: string) {
      const preset = presetBySlug(slug);
      if (!preset) return;
      actions.applyStack(preset.build());
      notify("success", preset.name);
    },
    shufflePreset() {
      actions.applyPreset(pickRandom(PRESETS).slug);
    },
    addEffect(type: EffectType) {
      setStack((s) => [...s, makeEffect(type)]);
    },
    toggleEffect(id: string) {
      setStack((s) => s.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e)));
    },
    removeEffect(id: string) {
      setStack((s) => s.filter((e) => e.id !== id));
    },
    setParam(id: string, key: string, value: ParamValue) {
      setStack((s) => s.map((e) => (e.id === id ? { ...e, params: { ...e.params, [key]: value } } : e)));
    },
    moveEffect(from: number, to: number) {
      setStack((s) => {
        const next = [...s];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    },
    saveDraft(fromPanel = false) {
      const name = draftName.trim() || suggested;
      if (active) {
        setDrafts((ds) => ds.map((d) => (d.id === active.id ? { ...d, name, ...look } : d)));
        notify("success", fromPanel ? "Draft updated" : "Updated", name);
      } else {
        const id = `draft-${(nextId += 1)}`;
        setDrafts((ds) => [{ id, name, ...look }, ...ds]);
        setActiveId(id);
        notify("success", fromPanel ? "Draft saved" : "Saved", name);
      }
    },
    saveAsNewDraft() {
      const name = draftName.trim() || suggested;
      const id = `draft-${(nextId += 1)}`;
      setDrafts((ds) => [{ id, name, ...look }, ...ds]);
      setActiveId(id);
      notify("success", "Saved as new draft", name);
    },
    loadDraft(id: string) {
      const d = drafts.find((x) => x.id === id);
      if (!d) return;
      setActiveId(id);
      setDraftName(d.name);
      load({ source: d.source, stack: d.stack }, 150);
    },
    removeDraft(id: string) {
      setDrafts((ds) => ds.filter((d) => d.id !== id));
    },
    revert() {
      if (active) {
        setSource(active.source);
        setStack(active.stack);
        notify("success", "Reverted to last save");
      } else {
        setSource(DEFAULT_LOOK.source);
        setStack(exampleLook(EXAMPLES[0].slug).stack);
        setDraftName("");
        notify("success", "Reset to default");
      }
      setError(null);
    },
    saveSet(name: string) {
      setSavedSets((s) => [...s, { id: `set-${(nextId += 1)}`, name: name.trim() || "Untitled set", stack }]);
      notify("success", "Effect set saved", name.trim() || "Untitled set");
    },
    removeSet(id: string) {
      setSavedSets((s) => s.filter((x) => x.id !== id));
    },
    async copySpec() {
      setMenuOpen(false);
      const spec = buildSpec({ name: draftName.trim() || suggested, source, stack, output });
      try {
        await navigator.clipboard.writeText(spec);
        notify("success", "Spec copied", "Paste it to an agent to reproduce this look exactly.");
      } catch {
        notify("error", "Couldn't copy to clipboard");
      }
    },
    runExport() {
      if (exporting !== null) return;
      const { W, H } = outputDims(output.aspect, output.longEdge * scale);
      const ext = format === "pngseq" ? "zip" : format;
      setExporting(0);
      clearInterval(exportTimer.current);
      exportTimer.current = setInterval(() => {
        setExporting((p) => {
          const next = (p ?? 0) + 0.05;
          if (next < 1) return next;
          clearInterval(exportTimer.current);
          notify("success", "Exported", `background-${W}x${H}.${ext}`);
          return null;
        });
      }, 60);
    },
    setFormat(next: Format) {
      setFormatChoice({ mode: source.mode, format: next });
    },
    startTour() {
      setExamplesOpen(true);
      setTourFocus(true);
      setTourStep(0);
    },
    openMenu(open: boolean) {
      setMenuFocus(true);
      setMenuOpen(open);
    },
    toggleTheme() {
      setTheme((t) => (t === "dark" ? "light" : "dark"));
    },
  };

  return {
    look,
    source,
    stack,
    imageUrl,
    uploadName,
    drafts: drafts.filter((d) => d.id !== activeId),
    hasActiveDraft: !!active,
    dirty,
    draftName,
    setDraftName,
    suggested,
    savedSets,
    examplesOpen,
    setExamplesOpen,
    tourStep,
    setTourStep,
    tourFocus,
    endTour,
    menuOpen,
    menuFocus,
    held,
    pending,
    error,
    output,
    setOutput,
    format,
    scale,
    setScale,
    exporting,
    exportOpen,
    /** A file held over the stage, mid-drag. */
    seededDrag: state.dragOver === "on",
    drawer,
    setDrawer,
    collapsed,
    setCollapsed,
    theme,
    toast,
    tweakedId: state.draft === "changed" ? seededStack.find((e) => e.type === "halftone")?.id ?? seededStack[0]?.id : undefined,
    sourceName: sourceLabel(source),
    actions,
  };
}

export type Lab = ReturnType<typeof useLab>;

/** Labels the reviewer reads for an effect stack ("Halftone, Grain"). */
export function describeStack(stack: Effect[]) {
  return stack
    .filter((e) => e.enabled)
    .map((e) => CATALOG[e.type].label)
    .join(", ");
}
