"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { DeviceMobileIcon, MonitorIcon } from "@phosphor-icons/react";
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
 * Which control an input gets. A flag is a switch. A few short values are a
 * segmented control, so every option is visible. Anything longer is a select:
 * segments split the row evenly, and about 32 characters of S text fit across it.
 */
function controlFor(values: readonly string[], labels: string[]) {
  if (values.length === 2 && values.includes("off") && values.includes("on")) return "switch";
  const longest = Math.max(...labels.map((label) => label.length));
  return values.length <= 4 && longest * values.length <= 32 ? "segmented" : "select";
}

type StatePanelProps<T extends Inputs> = {
  id: string;
  /** The panel's element, for returning focus. A callback rather than `ref`, which React 18 doesn't pass to a function component. */
  onElement: (node: HTMLElement | null) => void;
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
 * from the viewer bar over the top right of the app, dark like the bar.
 */
export function StatePanel<T extends Inputs>({ id, onElement, manifest, inputs, onChange, onClose, focusOnOpen }: StatePanelProps<T>) {
  const localRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (focusOnOpen) localRef.current?.focus();
  }, [focusOnOpen]);

  const setRefs = (node: HTMLElement | null) => {
    localRef.current = node;
    onElement(node);
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
      className="dark fixed top-(--viewer-bar) right-gui-s z-40 mt-gui-xs flex w-92 gui-panel-height flex-col rounded-gui-s bg-gui-toolbar shadow-gui-m ring-1 ring-gui-neutral-4-transparent outline-none scheme-dark max-sm:left-gui-s max-sm:w-auto motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-gui-large motion-safe:ease-gui-large"
    >
      <div className="@container flex min-h-0 flex-col gap-gui-l overflow-y-auto overscroll-contain px-gui-l pt-gui-m pb-gui-l">
        {GROUPS.map((group) => {
          const groupInputs = manifest.inputs.filter((input) => input.class === group.id);
          if (groupInputs.length === 0) return null;
          return (
            <InputGroup key={group.id} title={group.title}>
              {groupInputs.map((input) => (
                <InputRow key={input.id} input={input} value={inputs[input.id]} scheme="dark" onChange={(value) => onChange(input.id, value)} />
              ))}
            </InputGroup>
          );
        })}
      </div>
    </ThemeScope>
  );
}

function InputGroup({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-gui-s">
      <h3 id={headingId} className="text-gui-m text-gui-neutral-10">
        {title}
      </h3>
      {children}
    </section>
  );
}

function InputRow({
  input,
  value,
  scheme,
  onChange,
}: {
  input: Input;
  value: string;
  scheme: "light" | "dark";
  onChange: (value: string) => void;
}) {
  const labelId = useId();
  const values = input.values as readonly string[];
  const options: ControlOption[] = values.map((option) => ({
    value: option,
    label: valueLabel(input, option),
    icon: input.source === "viewport" ? VIEWPORT_ICONS[option] : undefined,
  }));
  const control = controlFor(
    values,
    options.map((option) => option.label),
  );

  return (
    // Below 320px of panel (phones), the label goes above its control so four segments still fit.
    <div className="flex min-h-8 items-center @max-xs:flex-col @max-xs:items-stretch @max-xs:gap-gui-xxs">
      <span id={labelId} className="w-29 shrink-0 text-gui-s text-gui-neutral-7 @max-xs:w-auto">
        {input.label}
      </span>
      {control === "switch" ? (
        <div className="flex items-center gap-gui-s">
          <Switch aria-labelledby={labelId} checked={value === "on"} onCheckedChange={(checked) => onChange(checked ? "on" : "off")} />
          <span aria-hidden className="text-gui-s text-gui-neutral-10">
            {valueLabel(input, value)}
          </span>
        </div>
      ) : control === "segmented" ? (
        <SegmentedControl aria-labelledby={labelId} value={value} onValueChange={onChange} options={options} className="flex-1" />
      ) : (
        <Select aria-labelledby={labelId} value={value} onValueChange={onChange} options={options} scheme={scheme} className="flex-1" />
      )}
    </div>
  );
}
