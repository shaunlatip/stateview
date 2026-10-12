"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Toaster, toast } from "sonner";
import { CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react";
import { cn } from "./cn";
import type { AnnotationLayer } from "./annotations";
import { FocusBar } from "./focus-bar";
import { changedInputs, findFrameIndex, frameHref, listFrames, viewportOf, type Frame, type Inputs, type Manifest } from "./manifest";
import { useReview } from "./store";
import { ThemeScope, buttonVariants } from "./ui";
import { pushFrame, useFrameQuery } from "./use-frame-query";

// Graphical Toast: the shared Toaster's default look is replaced, not layered over.
const toastClassNames = {
  toast:
    "flex w-full items-center gap-gui-xs rounded-gui-m bg-gui-neutral-1 p-gui-m font-gui-ui text-gui-m text-gui-neutral-10 shadow-gui-m ring-1 ring-gui-neutral-4-transparent dark:bg-gui-neutral-2",
  title: "font-gui-medium",
  description: "text-gui-neutral-7",
  icon: "text-gui-neutral-10",
};

const toastIcons = {
  success: <CheckCircleIcon aria-hidden />,
  error: <XCircleIcon aria-hidden />,
};

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
  "[data-agentation-portal]",
].join(",");

type FocusViewProps<T extends Inputs> = {
  manifest: Manifest<T>;
  /** Renders the real screen from a state's inputs. */
  render: (inputs: T) => ReactNode;
  annotationLayer: AnnotationLayer;
  /** Where Escape and "back to hub" go. */
  hubHref?: string;
};

/** The real screen in one state, with Stateview's review bar on top. */
export function FocusView<T extends Inputs>({ manifest, render, annotationLayer: Layer, hubHref = "/" }: FocusViewProps<T>) {
  const router = useRouter();
  const query = useFrameQuery();
  const review = useReview(manifest);
  const frames = listFrames(manifest);
  const index = query ? findFrameIndex(frames, query.sv, query.step) : -1;
  const frame = index === -1 ? null : frames[index];

  const goTo = (target: number) => {
    const next = frames[target];
    if (next) pushFrame(frameHref(manifest, next));
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!frame || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return;
    if (event.target instanceof Element && event.target.closest(OWNS_KEYS)) return;
    switch (event.key) {
      case "j":
      case "J":
      case "ArrowRight":
        event.preventDefault();
        goTo(index + 1);
        break;
      case "k":
      case "K":
      case "ArrowLeft":
        event.preventDefault();
        goTo(index - 1);
        break;
      case "Escape":
        router.push(hubHref);
        break;
    }
  };

  // One listener for the page's lifetime that always calls this render's handler (useEffectEvent, but React 18 has none).
  const keyHandler = useRef(onKeyDown);
  useEffect(() => {
    keyHandler.current = onKeyDown;
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => keyHandler.current(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  // Set in an effect rather than with <title>, which React 18 doesn't hoist into <head>.
  const title = frame ? `${frame.item.title} · Stateview` : null;
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);

  // The URL is only known once the page is in the browser.
  if (!query) return null;
  if (!frame) return <UnknownState id={query.sv} hubHref={hubHref} />;

  const copyWithState = (markdown: string) => {
    void navigator.clipboard
      .writeText(stateContext(manifest, frame) + markdown)
      .then(() => toast.success("Comments copied with this state’s URL and inputs"))
      .catch(() => toast.error("Couldn’t copy. Allow clipboard access for this site in your browser, then copy again."));
  };

  return (
    <>
      {/* Bottom padding keeps the end of the page clear of the review bar. */}
      <ThemeScope className={cn("grid min-h-dvh pb-24", viewportOf(manifest, frame.inputs) === "mobile" && "mx-auto w-full max-w-93.75 ring-1 ring-gui-border")}>
        {/* Keyed by state so the screen starts fresh from its inputs every time. */}
        <div key={frame.key} className="host-frame grid">
          {render(frame.inputs)}
        </div>
      </ThemeScope>
      <FocusBar
        frame={frame}
        position={index + 1}
        total={frames.length}
        hubHref={hubHref}
        onPrevious={index > 0 ? () => goTo(index - 1) : null}
        onNext={index < frames.length - 1 ? () => goTo(index + 1) : null}
      />
      <Layer
        stateId={frame.key}
        inputs={frame.inputs}
        annotations={review.annotations.filter((a) => a.stateId === frame.key)}
        onAdd={review.addAnnotation}
        onUpdate={review.updateAnnotation}
        onDelete={review.deleteAnnotation}
        onCopy={copyWithState}
      />
      <ThemeScope>
        <Toaster position="top-center" icons={toastIcons} toastOptions={{ unstyled: true, classNames: toastClassNames }} />
      </ThemeScope>
    </>
  );
}

/** A header for copied comments, so an agent can open exactly the state the reviewer saw. */
function stateContext<T extends Inputs>(manifest: Manifest<T>, frame: Frame<T>) {
  const changed = new Set<string>(changedInputs(manifest, frame.inputs));
  const inputs = manifest.inputs
    .map((input) => `${input.id}=${frame.inputs[input.id]}${changed.has(input.id) ? " (changed)" : ""}`)
    .join(", ");
  const step = frame.step ? ` · step ${frame.step} of ${frame.stepCount}: ${frame.stepTitle}` : "";
  return [
    `## State: ${frame.section.title} › ${frame.item.title}${step}`,
    `URL: ${window.location.origin}${frameHref(manifest, frame)}`,
    `Inputs: ${inputs}`,
    "",
    "",
  ].join("\n");
}

function UnknownState({ id, hubHref }: { id: string | null; hubHref: string }) {
  return (
    <ThemeScope as="main" className="flex flex-1 bg-gui-neutral-1">
      <div className="mx-auto flex max-w-prose flex-col justify-center gap-gui-s px-gui-l">
        <h1 className="font-gui-brand text-gui-l font-gui-brand-heavy text-balance">
          {id ? `There’s no state called “${id}” in this review` : "Choose a state to review"}
        </h1>
        <p className="text-gui-neutral-7">The review may have changed since this link was made.</p>
        <Link href={hubHref} className={buttonVariants({ className: "w-fit" })}>
          See all states
        </Link>
      </div>
    </ThemeScope>
  );
}
