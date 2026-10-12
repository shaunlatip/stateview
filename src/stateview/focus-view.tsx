"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { stateContext } from "./agent-export";
import { formatAnnotations, type AnnotationLayer } from "./annotations";
import { Filmstrip } from "./filmstrip";
import { FocusBar } from "./focus-bar";
import { findFrameIndex, listFrames, viewportOf, type Inputs, type Item, type Manifest } from "./manifest";
import { StatePanel } from "./state-panel";
import { useReview } from "./store";
import { setStripWidth, useStripWidth } from "./strip-width";
import { ThemeScope, buttonVariants } from "./ui";

// Links back to the hub pass scroll={false}: the hub restores the reviewer's own position.
const HUB_HREF = "/";

// Keys typed here belong to the page or to the comment engine, not to Stateview's shortcuts.
const OWNS_KEYS = [
  "input",
  "textarea",
  "select",
  "[contenteditable='true']",
  "[role='listbox']",
  "[role='menu']",
  "[role='radiogroup']",
  "[role='dialog']",
  "[data-feedback-toolbar]",
].join(",");

type FocusViewProps<T extends Inputs> = {
  manifest: Manifest<T>;
  /** Renders the real screen from a state's inputs. */
  render: (inputs: T) => ReactNode;
  annotationLayer: AnnotationLayer;
};

// From this width the filmstrip opens by default and takes its own column; below it, it overlays the app.
const WIDE = "(min-width: 768px)";

function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** The real screen in one state, framed by Stateview's bar along the top and the filmstrip down the left. */
export function FocusView<T extends Inputs>({ manifest, render, annotationLayer: Layer }: FocusViewProps<T>) {
  const router = useRouter();
  const [{ sv, step }, setQuery] = useQueryStates({ sv: parseAsString, step: parseAsInteger }, { history: "push" });
  // Inputs the reviewer changed in the state panel, one URL param each, so a copied link opens the same combination.
  const [overrides, setOverrides] = useQueryStates(inputParsers(manifest), { history: "replace" });
  const review = useReview(manifest);
  const [commenting, setCommenting] = useState(false);
  const [pinsVisible, setPinsVisible] = useState(true);
  const [screen, setScreen] = useState<HTMLDivElement | null>(null);
  const frames = listFrames(manifest);
  const index = findFrameIndex(frames, sv, step);
  const frame = index === -1 ? null : frames[index];
  const inputs = frame ? withOverrides(frame.inputs, overrides) : null;
  const annotations = frame ? review.annotations.filter((a) => a.stateId === frame.key) : [];
  const openCount = annotations.filter((a) => a.status === "open").length;

  const toggleCommenting = () => {
    setCommenting(!commenting);
    // A new comment's pin should be visible once it's saved.
    if (!commenting) setPinsVisible(true);
  };

  const wide = useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    () => true,
  );
  // Null until the reviewer toggles it: open on wide screens, closed on phones.
  const [stripChoice, setStripChoice] = useState<boolean | null>(null);
  const stripOpen = stripChoice ?? wide;
  const stripId = useId();
  const stripWidth = useStripWidth();
  // While the strip is dragged the app's edge follows the pointer instead of easing after it.
  const [stripResizing, setStripResizing] = useState(false);
  // Every surface that reads the strip's width re-declares the theme, so each one gets it.
  const stripWidthStyle = { "--thumb-strip-chosen": stripWidth } as CSSProperties;

  const markViewed = review.markViewed;
  const itemId = frame?.item.id;
  useEffect(() => {
    if (itemId) markViewed(itemId);
  }, [itemId, markViewed]);

  const commentsOn = (item: Item<T>) =>
    review.annotations.filter((a) => a.status === "open" && (a.stateId === item.id || a.stateId.startsWith(`${item.id}/`))).length;

  const panelId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const panelTriggerRef = useRef<HTMLButtonElement>(null);
  // How the panel was opened: from the keyboard it takes focus, from a click it leaves focus on the button.
  const [panel, setPanel] = useState<"closed" | "pointer" | "keyboard">("closed");

  const closePanel = () => {
    if (panelRef.current?.contains(document.activeElement)) panelTriggerRef.current?.focus();
    setPanel("closed");
  };

  const goTo = (target: number) => {
    const next = frames[target];
    if (!next) return;
    void setOverrides(null);
    void setQuery({ sv: next.item.id, step: next.step && next.step > 1 ? next.step : null });
  };

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!frame || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return;
    if (event.target instanceof Element && event.target.closest(OWNS_KEYS)) return;
    switch (event.key) {
      case "k":
      case "K":
      case "ArrowRight":
        event.preventDefault();
        goTo(index + 1);
        break;
      case "j":
      case "J":
      case "ArrowLeft":
        event.preventDefault();
        goTo(index - 1);
        break;
      case "c":
      case "C":
        event.preventDefault();
        toggleCommenting();
        break;
      case "s":
      case "S":
        event.preventDefault();
        if (panel === "closed") setPanel("keyboard");
        else closePanel();
        break;
      case "Escape":
        router.push(HUB_HREF, { scroll: false });
        break;
    }
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  if (!frame || !inputs) return <UnknownState id={sv} />;

  const copyComments = () => {
    void navigator.clipboard
      .writeText(stateContext(manifest, frame, inputs) + formatAnnotations(annotations))
      .then(() => toast.success("Comments copied with this state’s URL and inputs"))
      .catch(() => toast.error("Couldn’t copy. Allow clipboard access for this site in your browser, then copy again."));
  };

  const deleteComments = () => {
    const deleted = annotations;
    for (const annotation of deleted) review.deleteAnnotation(annotation.id);
    toast.success(`Deleted ${deleted.length} ${deleted.length === 1 ? "comment" : "comments"}`, {
      action: {
        label: "Undo",
        onClick: () => {
          for (const annotation of deleted) review.addAnnotation(annotation);
        },
      },
    });
  };

  const setInput = (id: keyof T & string, value: string) => {
    // Only differences from the state are kept in the URL; setting a value back to the state's own clears it.
    void setOverrides({ [id]: value === frame.inputs[id] ? null : value });
  };

  return (
    <>
      <title>{`${frame.item.title} · Stateview`}</title>
      <FocusBar
        frame={frame}
        position={index + 1}
        total={frames.length}
        hubHref={HUB_HREF}
        onPrevious={index > 0 ? () => goTo(index - 1) : null}
        onNext={index < frames.length - 1 ? () => goTo(index + 1) : null}
        strip={{ id: stripId, open: stripOpen, onToggle: () => setStripChoice(!stripOpen) }}
        commenting={commenting}
        onToggleCommenting={toggleCommenting}
        commentCount={openCount}
        pinsVisible={pinsVisible}
        onTogglePins={() => setPinsVisible(!pinsVisible)}
        onCopyComments={openCount > 0 ? copyComments : null}
        onCopyLink={copyLink}
        onDeleteComments={annotations.length > 0 ? deleteComments : null}
        panel={{ id: panelId, open: panel !== "closed", onToggle: () => (panel === "closed" ? setPanel("pointer") : closePanel()) }}
        panelTriggerRef={panelTriggerRef}
      />
      <Filmstrip
        id={stripId}
        manifest={manifest}
        currentId={frame.item.id}
        open={stripOpen}
        auto={stripChoice === null}
        width={stripWidth}
        onResize={(width, settled) => {
          setStripResizing(!settled);
          setStripWidth(width, settled);
        }}
        viewed={review.viewed}
        commentsOn={commentsOn}
        render={render}
        // On a phone the strip covers the app, so picking a state puts it away.
        onPick={() => {
          if (!wide) setStripChoice(false);
        }}
      />
      {/*
       * The app's window: below the bar and, on wide screens, beside the open
       * filmstrip. The transform makes this box the app's viewport for fixed
       * elements (a fixed sidebar stays beside the filmstrip, not under it),
       * and the app scrolls inside it rather than the page.
       */}
      <ThemeScope
        style={stripWidthStyle}
        className={cn(
          "fixed top-(--viewer-bar) right-0 bottom-0 left-0 flex justify-center transition-all duration-gui-large ease-gui-large motion-reduce:transition-none",
          stripOpen && "md:left-(--viewer-strip)",
          stripResizing && "transition-none",
        )}
      >
        <div className={cn("w-full transform-gpu overflow-hidden", viewportOf(manifest, inputs) === "mobile" && "max-w-93.75 ring-1 ring-gui-border")}>
          <div data-pin-layer="" className="relative grid h-full overflow-y-auto overscroll-contain">
            {/* Keyed by state and inputs so the screen starts fresh from its inputs every time. */}
            <div
              key={`${frame.key}:${manifest.inputs.map((input) => inputs[input.id]).join("|")}`}
              ref={setScreen}
              className={cn("host-frame grid", commenting && "cursor-crosshair **:cursor-crosshair")}
            >
              {render(inputs)}
            </div>
          </div>
        </div>
      </ThemeScope>
      {panel !== "closed" ? (
        <StatePanel id={panelId} ref={panelRef} manifest={manifest} inputs={inputs} onChange={setInput} onClose={closePanel} focusOnOpen={panel === "keyboard"} />
      ) : null}
      {/* Keyed by state so a half-written comment never carries over to another state. */}
      <Layer
        key={frame.key}
        stateId={frame.key}
        inputs={inputs}
        annotations={annotations}
        root={screen}
        active={commenting}
        onActiveChange={setCommenting}
        pinsVisible={pinsVisible}
        onAdd={review.addAnnotation}
        onUpdate={review.updateAnnotation}
        onDelete={review.deleteAnnotation}
      />
    </>
  );
}

/** The current URL carries the state and any inputs changed in the panel. */
function copyLink() {
  void navigator.clipboard
    .writeText(window.location.href)
    .then(() => toast.success("Link copied", { description: "It opens this state with the inputs set as they are now." }))
    .catch(() => toast.error("Couldn’t copy. Allow clipboard access for this site in your browser, then copy again."));
}

/** One URL parser per input, accepting only that input's values. */
function inputParsers<T extends Inputs>(manifest: Manifest<T>) {
  return Object.fromEntries(manifest.inputs.map((input) => [input.id, parseAsStringLiteral(input.values as readonly string[])]));
}

/** A state's inputs with the reviewer's changes on top. */
function withOverrides<T extends Inputs>(inputs: T, overrides: Record<string, string | null>): T {
  const set = Object.entries(overrides).filter(([id, value]) => value !== null && id in inputs);
  return { ...inputs, ...Object.fromEntries(set) };
}

function UnknownState({ id }: { id: string | null }) {
  return (
    <ThemeScope as="main" className="flex flex-1 bg-gui-neutral-1">
      <div className="mx-auto flex max-w-prose flex-col justify-center gap-gui-s px-gui-l">
        <h1 className="font-gui-brand text-gui-l font-gui-brand-heavy text-balance">
          {id ? `There’s no state called “${id}” in this review` : "Choose a state to review"}
        </h1>
        <p className="text-gui-neutral-7">The review may have changed since this link was made.</p>
        <Link href={HUB_HREF} scroll={false} className={buttonVariants({ className: "w-fit" })}>
          See all states
        </Link>
      </div>
    </ThemeScope>
  );
}
