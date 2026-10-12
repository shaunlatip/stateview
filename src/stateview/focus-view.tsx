"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, type ReactNode } from "react";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { toast } from "sonner";
import { CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react";
import { FeedbackToolbar } from "@/components/dev/feedback-toolbar";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import type { AnnotationLayer } from "./annotations";
import { FocusBar } from "./focus-bar";
import { changedInputs, findFrameIndex, frameHref, listFrames, viewportOf, type Frame, type Inputs, type Manifest } from "./manifest";
import { useReview } from "./store";
import { ThemeScope, buttonVariants } from "./ui";

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
  "[data-agentation-portal]",
].join(",");

type FocusViewProps<T extends Inputs> = {
  manifest: Manifest<T>;
  /** Renders the real screen from a state's inputs. */
  render: (inputs: T) => ReactNode;
  annotationLayer: AnnotationLayer;
};

/** The real screen in one state, with Stateview's review bar on top. */
export function FocusView<T extends Inputs>({ manifest, render, annotationLayer: Layer }: FocusViewProps<T>) {
  const router = useRouter();
  const [{ sv, step }, setQuery] = useQueryStates({ sv: parseAsString, step: parseAsInteger }, { history: "push" });
  const review = useReview(manifest);
  const frames = listFrames(manifest);
  const index = findFrameIndex(frames, sv, step);
  const frame = index === -1 ? null : frames[index];

  const goTo = (target: number) => {
    const next = frames[target];
    if (!next) return;
    void setQuery({ sv: next.item.id, step: next.step && next.step > 1 ? next.step : null });
  };

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
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
        router.push(HUB_HREF);
        break;
    }
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  if (!frame) return <UnknownState id={sv} />;

  const copyWithState = (markdown: string) => {
    void navigator.clipboard
      .writeText(stateContext(manifest, frame) + markdown)
      .then(() => toast.success("Comments copied with this state’s URL and inputs"))
      .catch(() => toast.error("Couldn’t copy. Allow clipboard access for this site in your browser, then copy again."));
  };

  return (
    <>
      <title>{`${frame.item.title} · Stateview`}</title>
      <ThemeScope className={cn("grid min-h-dvh", viewportOf(manifest, frame.inputs) === "mobile" && "mx-auto w-full max-w-93.75 ring-1 ring-gui-border")}>
        {/*
         * Keyed by state so the screen starts fresh from its inputs every time.
         * Bottom padding on the app's root keeps the end of the page clear of
         * the review bar, painted in the app's own background.
         */}
        <div key={frame.key} className="host-frame grid *:pb-24">
          {render(frame.inputs)}
        </div>
      </ThemeScope>
      <FocusBar
        frame={frame}
        position={index + 1}
        total={frames.length}
        hubHref={HUB_HREF}
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

function UnknownState({ id }: { id: string | null }) {
  return (
    <ThemeScope as="main" className="flex flex-1 bg-gui-neutral-1">
      <div className="mx-auto flex max-w-prose flex-col justify-center gap-gui-s px-gui-l">
        <h1 className="font-gui-brand text-gui-l font-gui-brand-heavy text-balance">
          {id ? `There’s no state called “${id}” in this review` : "Choose a state to review"}
        </h1>
        <p className="text-gui-neutral-7">The review may have changed since this link was made.</p>
        <Link href={HUB_HREF} className={buttonVariants({ className: "w-fit" })}>
          See all states
        </Link>
      </div>
      {/* TEMPORARY: feedback while building; remove before the final build. */}
      <FeedbackToolbar />
    </ThemeScope>
  );
}
