"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Minus } from "@phosphor-icons/react";
import { ChevronRight, ClipboardCopy, LayoutGrid, Plus, Search, Shuffle, X } from "lucide-react";
import { cn } from "./cn";
import { SlButton } from "./components/ui/button";
import { CollapsibleSection } from "./components/ui/collapsible";
import { SlColorField, SlInput, SlSelect } from "./components/ui/fields";
import { SlSlider } from "./components/ui/slider";
import { SlSwitch } from "./components/ui/switch";
import { IconTip } from "./components/ui/tooltip";
import {
  CATALOG,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  EFFECT_ORDER,
  PRESETS,
  PRESET_CATEGORY_ORDER,
  type ControlSpec,
  type Effect,
  type EffectType,
  type GradientStop,
  type ParamValue,
} from "./fixtures";
import type { Lab } from "./use-lab";

const NOT_HERE = "Not part of this rebuild";

/**
 * AddEffectSearch: a search field that opens the catalog on focus, filters as
 * you type and appends the chosen effect. Arrow keys move, Enter adds, Escape
 * closes; the list is a listbox the field controls.
 */
function AddEffectSearch({ onAdd }: { onAdd: (type: EffectType) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EFFECT_ORDER.filter((t) => !q || `${CATALOG[t].label} ${CATALOG[t].blurb}`.toLowerCase().includes(q));
  }, [query]);
  const active = Math.min(activeIndex, Math.max(0, matches.length - 1));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const choose = (t: EffectType) => {
    onAdd(t);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex(Math.min(active + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(Math.max(active - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const t = matches[active];
      if (t) choose(t);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <div
        className={cn(
          "flex h-9 items-center gap-2 rounded-sl-control border bg-sl-canvas px-2.5 transition-colors",
          open ? "border-sl-text-2" : "border-sl-border hover:border-sl-border-strong",
        )}
      >
        <Search aria-hidden className="size-3.5 shrink-0 text-sl-text-2" />
        <input
          ref={inputRef}
          role="combobox"
          aria-label="Add an effect"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && matches[active] ? `${listId}-${matches[active]}` : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Add an effect…"
          className="h-full min-w-0 flex-1 bg-transparent text-sl-13 text-sl-text placeholder:text-sl-text-2 focus:outline-none"
        />
        <Plus aria-hidden className="size-3.5 shrink-0 text-sl-text-2" />
      </div>
      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label="Effects"
          className="sl-dropdown absolute right-0 left-0 z-50 max-h-80 origin-top animate-in overflow-y-auto rounded-sl-card border border-sl-border bg-sl-canvas p-1 shadow-sl-5 duration-150 ease-out fade-in-0 zoom-in-95"
        >
          {matches.length === 0 ? (
            <p className="px-2.5 py-2 text-sl-12 text-sl-text-2">No effect matches “{query}”.</p>
          ) : (
            CATEGORY_ORDER.map((cat) => {
              const items = matches.filter((t) => CATALOG[t].category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat} role="group" aria-label={CATEGORY_LABEL[cat]}>
                  <p aria-hidden className="px-2.5 pt-2 pb-1 text-sl-11 font-medium text-sl-text-2">
                    {CATEGORY_LABEL[cat]}
                  </p>
                  {items.map((t) => {
                    const m = CATALOG[t];
                    const i = matches.indexOf(t);
                    return (
                      <div
                        key={t}
                        id={`${listId}-${t}`}
                        role="option"
                        aria-selected={i === active}
                        tabIndex={-1}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          choose(t);
                        }}
                        onPointerEnter={() => setActiveIndex(i)}
                        className={cn(
                          "flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-sl-item px-2.5 py-1.5 text-left transition-colors duration-100",
                          i === active ? "bg-sl-inverted/10" : "hover:bg-sl-inverted/6",
                        )}
                      >
                        <div className="flex w-full items-baseline justify-between gap-2">
                          <span className="text-sl-13 font-medium text-sl-text">{m.label}</span>
                          {m.heavy && <span className="shrink-0 text-sl-11 text-sl-text-2">Heavy</span>}
                        </div>
                        <span className="text-sl-11 leading-snug text-sl-text-2">{m.blurb}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

function GradientStops({ stops, onChange }: { stops: GradientStop[]; onChange: (s: GradientStop[]) => void }) {
  const sorted = stops.toSorted((a, b) => a.t - b.t);
  const css = `linear-gradient(90deg, ${sorted.map((s) => `${s.color} ${Math.round(s.t * 100)}%`).join(", ")})`;
  const update = (i: number, patch: Partial<GradientStop>) => onChange(stops.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sl-xs leading-none font-medium text-sl-text-2">Ramp</span>
        <SlButton
          variant="ghost"
          size="icon-xs"
          onClick={() => stops.length < 5 && onChange([...stops, { t: 0.5, color: "#888888" }])}
          disabled={stops.length >= 5}
          aria-label="Add stop"
        >
          <Plus className="size-3.5" />
        </SlButton>
      </div>
      <div className="sl-bg-var h-4 w-full rounded border border-sl-border" style={{ "--sl-bg": css } as CSSProperties} />
      <div className="flex flex-col gap-1.5">
        {stops.map((s, i) => (
          // Stops have no ids in the config; their order is their identity.
          // oxlint-disable-next-line react/no-array-index-key
          <div key={i} className="sl-stop-row grid items-center gap-2">
            <SlColorField compact value={s.color} onChange={(hex) => update(i, { color: hex })} label={`Stop ${i + 1} color`} />
            <SlSlider value={s.t} min={0} max={1} step={0.01} onValueChange={(t) => update(i, { t })} label={`Stop ${i + 1} position`} />
            <SlButton
              variant="ghost"
              size="icon-xs"
              onClick={() => stops.length > 2 && onChange(stops.filter((_, idx) => idx !== i))}
              disabled={stops.length <= 2}
              aria-label="Remove stop"
            >
              <X className="size-3.5" />
            </SlButton>
          </div>
        ))}
      </div>
    </div>
  );
}

function ControlRow({ spec, value, onChange }: { spec: ControlSpec; value: ParamValue | undefined; onChange: (v: ParamValue) => void }) {
  const labelId = useId();
  const label = (
    <span id={labelId} className="text-sl-xs leading-none font-medium text-sl-text-2">
      {spec.label}
    </span>
  );
  if (spec.kind === "slider") {
    const v = typeof value === "number" ? value : spec.default;
    return (
      <div className="sl-control-row grid items-center gap-2">
        {label}
        <SlSlider value={v} min={spec.min} max={spec.max} step={spec.step} onValueChange={onChange} labelledBy={labelId} />
        <span className="text-right font-mono text-sl-11 text-sl-text tabular-nums">{fmt(v)}</span>
      </div>
    );
  }
  if (spec.kind === "switch") {
    return (
      <div className="flex items-center justify-between">
        {label}
        <SlSwitch checked={typeof value === "boolean" ? value : spec.default} onCheckedChange={onChange} labelledBy={labelId} />
      </div>
    );
  }
  if (spec.kind === "select") {
    return (
      <div className="sl-label-row grid items-center gap-2">
        {label}
        <SlSelect value={typeof value === "string" ? value : spec.default} onValueChange={onChange} options={spec.options} labelledBy={labelId} />
      </div>
    );
  }
  if (spec.kind === "color") {
    return (
      <div className="sl-label-row grid items-center gap-2">
        {label}
        <SlColorField value={typeof value === "string" ? value : spec.default} onChange={onChange} label={spec.label} />
      </div>
    );
  }
  return <GradientStops stops={Array.isArray(value) ? value : spec.default} onChange={onChange} />;
}

/**
 * EffectCard: the label opens the controls; the switch toggles the effect and
 * the minus removes it. The header row is the drag handle (Alt + arrow keys
 * move it from the keyboard).
 */
function EffectCard({
  effect,
  index,
  count,
  lab,
  defaultOpen,
  dragFrom,
  setDragFrom,
}: {
  effect: Effect;
  index: number;
  count: number;
  lab: Lab;
  defaultOpen: boolean;
  dragFrom: number | null;
  setDragFrom: (i: number | null) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = CATALOG[effect.type];
  const visible = meta.controls.filter((c) => !c.showIf || c.showIf.in.includes(effect.params[c.showIf.key] as ParamValue));

  const onLabelKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!e.altKey) return;
    if (e.key === "ArrowUp" && index > 0) {
      e.preventDefault();
      lab.actions.moveEffect(index, index - 1);
    } else if (e.key === "ArrowDown" && index < count - 1) {
      e.preventDefault();
      lab.actions.moveEffect(index, index + 1);
    }
  };

  return (
    <li
      className={cn(
        "group/card rounded-sl-card border border-sl-border bg-sl-canvas transition duration-150 ease-out",
        dragFrom === index ? "z-10 opacity-90 shadow-sl-3" : "hover:border-sl-border-strong",
        !effect.enabled && "opacity-55",
      )}
    >
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          setDragFrom(index);
        }}
        onDragEnd={() => setDragFrom(null)}
        onDragOver={(e) => {
          if (dragFrom !== null) e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (dragFrom !== null && dragFrom !== index) lab.actions.moveEffect(dragFrom, index);
          setDragFrom(null);
        }}
        className="flex items-center gap-1 px-1.5 py-1.5"
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          onKeyDown={onLabelKey}
          aria-expanded={open}
          aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
          className="group/label flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left"
        >
          <ChevronRight
            aria-hidden
            className={cn(
              "size-3.5 shrink-0 text-sl-text-2 transition-transform duration-200 ease-out group-hover/label:text-sl-text",
              open && "rotate-90",
            )}
          />
          <span className="truncate text-sl-15 leading-none font-medium text-sl-text">{meta.label}</span>
        </button>
        <SlSwitch checked={effect.enabled} onCheckedChange={() => lab.actions.toggleEffect(effect.id)} label={`Toggle ${meta.label}`} />
        <IconTip label="Remove effect" align="end">
          <SlButton variant="remove" size="icon-xs" onClick={() => lab.actions.removeEffect(effect.id)} aria-label={`Remove ${meta.label}`}>
            <Minus className="size-4" />
          </SlButton>
        </IconTip>
      </div>
      {open && (
        <div className="flex animate-in flex-col gap-3 border-t border-sl-border px-3 pt-2.5 pb-3 duration-150 ease-out fade-in-0 slide-in-from-top-1">
          <div className="flex flex-col gap-2.5">
            {visible.map((spec) => (
              <ControlRow
                key={spec.key}
                spec={spec}
                value={effect.params[spec.key]}
                onChange={(v) => lab.actions.setParam(effect.id, spec.key, v)}
              />
            ))}
          </div>
        </div>
      )}
    </li>
  );
}

function EffectStack({ lab }: { lab: Lab }) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  if (lab.stack.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-sl-border px-3 py-8 text-center text-sl-12 leading-relaxed text-sl-text-2">
        No effects yet.
        <br />
        Search above to stack your first one.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <ul aria-label="Effect stack" className="flex flex-col gap-1.5">
        {lab.stack.map((effect, i) => (
          <EffectCard
            key={effect.id}
            effect={effect}
            index={i}
            count={lab.stack.length}
            lab={lab}
            defaultOpen={effect.id === lab.tweakedId}
            dragFrom={dragFrom}
            setDragFrom={setDragFrom}
          />
        ))}
      </ul>
      <p className="px-0.5 text-sl-11 leading-snug text-sl-text-2">Applied top → bottom. Drag to reorder.</p>
    </div>
  );
}

function PresetGallery({ lab }: { lab: Lab }) {
  const [name, setName] = useState("");
  const byCategory = PRESET_CATEGORY_ORDER.map((cat) => ({ cat, presets: PRESETS.filter((p) => p.category === cat) }));
  return (
    <CollapsibleSection
      title="Presets"
      action={
        <div className="flex items-center gap-0.5">
          <IconTip label="Random preset">
            <SlButton variant="quiet" size="tiny" onClick={lab.actions.shufflePreset} aria-label="Apply a random preset">
              <Shuffle className="size-3.5" />
            </SlButton>
          </IconTip>
          <IconTip label="Browse all presets" align="end">
            <SlButton variant="quiet" size="tiny" disabled title={NOT_HERE} aria-label="Browse all presets">
              <LayoutGrid className="size-3.5" />
            </SlButton>
          </IconTip>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {byCategory.map(({ cat, presets }) => (
          <div key={cat} className="flex flex-col gap-1.5">
            <span className="text-sl-11 font-medium text-sl-text-2">{cat}</span>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  title={p.name}
                  onClick={() => lab.actions.applyPreset(p.slug)}
                  className="group flex cursor-pointer flex-col gap-1 text-left"
                >
                  <span className="overflow-hidden rounded-sl-card border border-sl-border transition duration-150 ease-out group-hover:border-sl-border-strong motion-safe:group-active:scale-97">
                    {/* eslint-disable-next-line @next/next/no-img-element -- a fixed local preset thumbnail */}
                    <img
                      src={`/examples/shader-lab/presets/${p.slug}.webp`}
                      alt={p.name}
                      loading="lazy"
                      className="aspect-3/2 w-full object-cover transition-transform duration-300 ease-out motion-safe:group-hover:scale-104"
                    />
                  </span>
                  <span className="truncate px-0.5 text-sl-11 leading-tight text-sl-text-2 transition-colors group-hover:text-sl-text">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
        <SlButton variant="lab" size="box" disabled title={NOT_HERE}>
          All presets ({PRESETS.length})
        </SlButton>
        <div className="flex flex-col gap-2 border-t border-sl-border pt-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              lab.actions.saveSet(name);
              setName("");
            }}
            className="flex gap-1.5"
          >
            <SlInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Save current effects…" aria-label="Effect set name" />
            <IconTip label="Save current effects" align="end">
              <SlButton type="submit" variant="lab" size="square" aria-label="Save current effects">
                <Plus className="size-4" />
              </SlButton>
            </IconTip>
          </form>
          {lab.savedSets.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {lab.savedSets.map((s) => (
                <div key={s.id} className="group/chip relative">
                  <button
                    type="button"
                    onClick={() => lab.actions.applyStack(s.stack)}
                    title={`${s.name} — ${s.stack.length} effect${s.stack.length === 1 ? "" : "s"}`}
                    className="max-w-full cursor-pointer truncate rounded-full border border-sl-border bg-sl-canvas py-1 pr-6 pl-3 text-sl-12 text-sl-text-2 transition duration-150 ease-out hover:border-sl-border-strong hover:bg-sl-hover hover:text-sl-text motion-safe:active:scale-96"
                  >
                    {s.name}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${s.name}`}
                    onClick={() => lab.actions.removeSet(s.id)}
                    className="absolute top-1/2 right-1 grid size-4 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-sl-text-2 opacity-0 transition-opacity group-hover/chip:opacity-100 hover:text-sl-text focus-visible:opacity-100"
                  >
                    <X aria-hidden className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CollapsibleSection>
  );
}

function AiConfigCard() {
  return (
    <CollapsibleSection title="Customize with AI" defaultOpen={false}>
      <div className="flex flex-col gap-2.5">
        <p className="text-sl-11 leading-snug text-sl-text-2">
          No agent needed — copy a prompt, tell any LLM what you want, paste its JSON back to save it as a new set.
        </p>
        <div className="flex gap-2">
          <SlButton variant="outline" size="sm" className="flex-1" disabled title={NOT_HERE}>
            <ClipboardCopy className="mr-1.5 size-3.5" /> Copy prompt
          </SlButton>
          <SlButton variant="outline" size="sm" className="flex-1" disabled title={NOT_HERE}>
            Paste &amp; save
          </SlButton>
        </div>
      </div>
    </CollapsibleSection>
  );
}

/** The right panel: the creative loop — add an effect, arrange the stack, reach for presets. */
export function RightPanel({ lab, drawer }: { lab: Lab; drawer: boolean }) {
  return (
    <aside
      aria-label="Effects"
      className={cn(
        "flex w-90 shrink-0 flex-col overflow-hidden border-l border-sl-border bg-sl-canvas",
        drawer && "sl-drawer-max absolute inset-y-0 right-0 z-40 shadow-sl-5 motion-safe:animate-in motion-safe:duration-200 motion-safe:slide-in-from-right",
      )}
    >
      <div className="shrink-0 border-b border-sl-border p-3">
        <AddEffectSearch onAdd={lab.actions.addEffect} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-5 p-3">
          <div data-tour="effects">
            <EffectStack lab={lab} />
          </div>
          <div className="border-t border-sl-border pt-4">
            <PresetGallery lab={lab} />
          </div>
          <div className="border-t border-sl-border pt-4">
            <AiConfigCard />
          </div>
        </div>
      </div>
    </aside>
  );
}
