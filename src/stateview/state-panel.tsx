"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { ArrowsDownUpIcon, CursorClickIcon, DatabaseIcon, DeviceMobileIcon, DevicesIcon, MonitorIcon, ToggleLeftIcon, UserIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { valueLabel, type Input, type InputClass, type Inputs, type Manifest } from "./manifest";
import { SegmentedControl, Select, Switch, ThemeScope, type ControlOption } from "./ui";

// Each class's icon names what its inputs describe: the user, flags, data, requests, an interaction, the device.
const GROUPS: { id: InputClass; title: string; icon: ReactNode }[] = [
  { id: "who", title: "Who", icon: <UserIcon aria-hidden /> },
  { id: "config", title: "Configuration", icon: <ToggleLeftIcon aria-hidden /> },
  { id: "data", title: "Data", icon: <DatabaseIcon aria-hidden /> },
  { id: "system", title: "System", icon: <ArrowsDownUpIcon aria-hidden /> },
  { id: "moment", title: "Moment", icon: <CursorClickIcon aria-hidden /> },
  { id: "environment", title: "Environment", icon: <DevicesIcon aria-hidden /> },
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
};

/**
 * Every input the screen reads, grouped by class, each one editable. Hangs
 * from the viewer bar over the top right of the app, light like the bar.
 */
export function StatePanel<T extends Inputs>({ id, ref, manifest, inputs, onChange, onClose, focusOnOpen }: StatePanelProps<T>) {
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
        "fixed top-(--viewer-bar) right-gui-s z-40 mt-gui-xs flex w-84 gui-panel-height flex-col rounded-gui-s bg-gui-toolbar shadow-gui-m ring-1 ring-gui-border outline-none max-sm:left-gui-s max-sm:w-auto",
        // Opened with a click, it drops from the button. Opened from the keyboard (S, or Enter on the button), it's there at once: a key pressed over and over shouldn't wait on an entrance.
        !focusOnOpen && "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-gui-large motion-safe:ease-gui-large",
      )}
    >
      <div className="@container min-h-0 overflow-y-auto overscroll-contain p-gui-m">
        <div className="gui-panel-grid gap-y-gui-s">
          {GROUPS.map((group) => {
            const groupInputs = manifest.inputs.filter((input) => input.class === group.id);
            if (groupInputs.length === 0) return null;
            return (
              <InputGroup key={group.id} title={group.title} icon={group.icon}>
                {groupInputs.map((input) => (
                  <InputRow key={input.id} input={input} value={inputs[input.id]} onChange={(value) => onChange(input.id, value)} />
                ))}
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
 * other, as a menu's are. The group is a subgrid of the panel's two columns.
 */
function InputGroup({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="col-span-full grid grid-cols-subgrid gap-y-gui-xxs not-first:pt-gui-s not-first:gui-divider-top">
      <h3 id={headingId} className="col-span-full flex items-center gap-gui-xs text-gui-s font-gui-heavy text-gui-neutral-10">
        {/* M, a step up from the title's S, so the icon reads at the weight of the heavy text beside it. */}
        <span className="flex text-gui-m">{icon}</span>
        {title}
      </h3>
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

/**
 * One input as a flyout row of the panel's grid, as in Linear's and OpenAI's
 * settings popovers: its label in the first column, its control at the end
 * of the second, so no control reaches left past any label. The label is
 * plain text, never filled or framed, so only the control reads as something
 * to click: a switch, a segmented control as wide as its options, or a ghost
 * select whose caret lines up with the other controls' right edge.
 */
function InputRow({ input, value, onChange }: InputProps) {
  const labelId = useId();
  const { options, control } = optionsFor(input);

  return (
    <div className="col-span-full grid min-h-8 grid-cols-subgrid items-center">
      <span id={labelId} className="text-gui-s text-gui-neutral-7">
        {input.label}
      </span>
      {control === "switch" ? (
        <Switch
          aria-labelledby={labelId}
          checked={value === "on"}
          onCheckedChange={(checked) => onChange(checked ? "on" : "off")}
          className="justify-self-end"
        />
      ) : control === "segmented" ? (
        <SegmentedControl aria-labelledby={labelId} value={value} onValueChange={onChange} options={options} className="justify-self-end" />
      ) : (
        <Select aria-labelledby={labelId} value={value} onValueChange={onChange} options={options} scheme="light" className="-mr-gui-xs justify-self-end" />
      )}
    </div>
  );
}
