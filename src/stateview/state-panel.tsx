"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { DeviceMobileIcon, MonitorIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { valueLabel, type Input, type InputClass, type Inputs, type Manifest } from "./manifest";
import { SegmentedControl, Select, Switch, ThemeScope, type ControlOption } from "./ui";

const GROUPS: { id: InputClass; title: string }[] = [
  { id: "who", title: "Who" },
  { id: "config", title: "Configuration" },
  { id: "data", title: "Data" },
  { id: "system", title: "System" },
  { id: "moment", title: "Moment" },
  { id: "environment", title: "Environment" },
];

const VIEWPORT_ICONS: Record<string, ReactNode> = {
  desktop: <MonitorIcon aria-hidden />,
  mobile: <DeviceMobileIcon aria-hidden />,
};

/**
 * Which control an input gets. A flag is a switch. Up to three short values
 * are a segmented control, so every option is visible. Anything more is a
 * select: the control column is about 190px, and four segments in it, or
 * long ones, leave no room around each option.
 */
function controlFor(values: readonly string[], labels: string[]) {
  if (values.length === 2 && values.includes("off") && values.includes("on")) return "switch";
  const longest = Math.max(...labels.map((label) => label.length));
  return values.length <= 3 && longest * values.length <= 24 ? "segmented" : "select";
}

/**
 * How each input's label sits against its control. Columns and inline share
 * the same rows (gui-panel-grid), so they're equally dense.
 * - columns: each control fills the column after the labels.
 * - inline: a flyout's rows, each control as wide as it needs at the end of
 *   the row (Linear's and OpenAI's settings popovers).
 * - pills: every input a select that hugs "Label Value", wrapping across the
 *   panel (Geist's Select with a prefix, like Vercel's dashboard filters).
 */
export type PanelLayout = "columns" | "inline" | "pills";

type StatePanelProps<T extends Inputs> = {
  id: string;
  ref: Ref<HTMLElement>;
  manifest: Manifest<T>;
  /** The inputs the screen is rendering now: the state's own, plus any the reviewer changed. */
  inputs: T;
  onChange: (id: keyof T & string, value: string) => void;
  onClose: () => void;
  /** Opened from the keyboard: take focus so the next Tab lands on the first control. */
  focusOnOpen: boolean;
  layout?: PanelLayout;
};

/**
 * Every input the screen reads, grouped by class, each one editable. Hangs
 * from the viewer bar over the top right of the app, light like the bar.
 */
export function StatePanel<T extends Inputs>({ id, ref, manifest, inputs, onChange, onClose, focusOnOpen, layout = "columns" }: StatePanelProps<T>) {
  const localRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (focusOnOpen) localRef.current?.focus();
  }, [focusOnOpen]);

  const setRefs = (node: HTMLElement | null) => {
    localRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    // Escape inside the panel closes it; the review bar's Esc (back to all states) applies everywhere else.
    event.preventDefault();
    onClose();
  };

  return (
    <ThemeScope
      as="aside"
      id={id}
      ref={setRefs}
      tabIndex={-1}
      aria-label="State"
      data-state-panel=""
      onKeyDown={onKeyDown}
      className={cn(
        // 336px: the longest label (Members request), M between, and the widest control (three segments) fit side by side.
        "fixed top-(--viewer-bar) right-gui-s z-40 mt-gui-xs flex w-84 gui-panel-height flex-col rounded-gui-s bg-gui-toolbar shadow-gui-m ring-1 ring-gui-border outline-none max-sm:left-gui-s max-sm:w-auto motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-gui-large motion-safe:ease-gui-large",
        layout === "pills" && "w-80",
      )}
    >
      <div className="@container min-h-0 overflow-y-auto overscroll-contain p-gui-m">
        <div className={layout === "pills" ? "flex flex-col gap-gui-m" : "gui-panel-grid gap-y-gui-s"}>
          {GROUPS.map((group) => {
            const groupInputs = manifest.inputs.filter((input) => input.class === group.id);
            if (groupInputs.length === 0) return null;
            return (
              <InputGroup key={group.id} title={group.title} layout={layout}>
                {groupInputs.map((input) => {
                  const props = { input, value: inputs[input.id], onChange: (value: string) => onChange(input.id, value) };
                  return layout === "pills" ? <PillInput key={input.id} {...props} /> : <InputRow key={input.id} {...props} layout={layout} />;
                })}
              </InputGroup>
            );
          })}
        </div>
      </div>
    </ThemeScope>
  );
}

/**
 * A class of inputs under its title. The title is the labels' size but
 * heavy and in Neutral 10 against their regular Neutral 7, so the two read
 * apart by weight without taking more room. Groups are divided from each
 * other, as a menu's are. In columns and inline the group is a subgrid of
 * the panel's two columns.
 */
function InputGroup({ title, layout, children }: { title: string; layout: PanelLayout; children: ReactNode }) {
  const headingId = useId();
  const heading = (
    <h3 id={headingId} className="col-span-full text-gui-s font-gui-heavy text-gui-neutral-10">
      {title}
    </h3>
  );
  if (layout === "pills") {
    return (
      <section aria-labelledby={headingId} className="flex flex-col gap-gui-xs">
        {heading}
        <div className="flex flex-wrap gap-gui-xs">{children}</div>
      </section>
    );
  }
  return (
    <section aria-labelledby={headingId} className="col-span-full grid grid-cols-subgrid gap-y-gui-xxs not-first:pt-gui-s not-first:gui-divider-top">
      {heading}
      {children}
    </section>
  );
}

type InputProps = { input: Input; value: string; onChange: (value: string) => void };

function optionsFor(input: Input) {
  const values = input.values as readonly string[];
  const options: ControlOption[] = values.map((option) => ({
    value: option,
    label: valueLabel(input, option),
    icon: input.source === "viewport" ? VIEWPORT_ICONS[option] : undefined,
  }));
  return {
    options,
    control: controlFor(
      values,
      options.map((option) => option.label),
    ),
  };
}

// A pill's label, muted before its value inside the trigger.
const PILL_LABEL = "shrink-0 text-gui-s text-gui-neutral-7";

/** Pills: every input a select as wide as "Label Value", so a group's inputs wrap onto as few lines as fit. */
function PillInput({ input, value, onChange }: InputProps) {
  const labelId = useId();
  const { options } = optionsFor(input);
  return (
    <Select
      aria-labelledby={labelId}
      value={value}
      onValueChange={onChange}
      options={options}
      scheme="light"
      prefix={
        <span id={labelId} className={PILL_LABEL}>
          {input.label}
        </span>
      }
      className="h-7 px-gui-xs"
    />
  );
}

/**
 * One input as a row of the panel's grid: its label in the first column, its
 * control in the second, so no control reaches left past any label.
 *
 * Columns: the control fills the second column; a switch shows its value
 * beside it. Inline: a flyout row, as in Linear's and OpenAI's settings
 * popovers. The label is plain text, never filled or framed, so only the
 * control reads as something to click, and the control sits at the end: a
 * switch, a segmented control as wide as its options, or a ghost select
 * whose caret lines up with the other controls' right edge.
 */
function InputRow({ input, value, onChange, layout }: InputProps & { layout: "columns" | "inline" }) {
  const labelId = useId();
  const { options, control } = optionsFor(input);
  const inline = layout === "inline";

  return (
    <div className="col-span-full grid min-h-8 grid-cols-subgrid items-center">
      <span id={labelId} className="text-gui-s text-gui-neutral-7">
        {input.label}
      </span>
      {control === "switch" ? (
        <div className={cn("flex items-center gap-gui-s", inline && "justify-self-end")}>
          <Switch aria-labelledby={labelId} checked={value === "on"} onCheckedChange={(checked) => onChange(checked ? "on" : "off")} />
          {inline ? null : (
            <span aria-hidden className="text-gui-s text-gui-neutral-10">
              {valueLabel(input, value)}
            </span>
          )}
        </div>
      ) : control === "segmented" ? (
        <SegmentedControl aria-labelledby={labelId} value={value} onValueChange={onChange} options={options} fit={inline} className={cn(inline && "justify-self-end")} />
      ) : (
        <Select
          aria-labelledby={labelId}
          value={value}
          onValueChange={onChange}
          options={options}
          scheme="light"
          variant={inline ? "ghost" : "filled"}
          className={cn(inline && "-mr-gui-xs justify-self-end")}
        />
      )}
    </div>
  );
}
