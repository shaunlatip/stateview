"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { stateContext } from "./agent-export";
import { DeviceFrame } from "./device-frame";
import { formatAnnotations, type AnnotationLayer } from "./annotations";
import { EmbeddedScreen } from "./embedded-screen";
import { Filmstrip } from "./filmstrip";
import { FocusBar } from "./focus-bar";
import { EMBED_PARAM, post, receive, type FrameEvent, type FrameState } from "./frame-protocol";
import { findFrameIndex, listFrames, viewportOf, type Inputs, type Item, type Manifest } from "./manifest";
import { inputParsers, withOverrides } from "./overrides";
import { StatePanel } from "./state-panel";
import { useReview } from "./store";
import { setStripWidth, useStripWidth } from "./strip-width";
import { ThemeScope, buttonVariants } from "./ui";

// Links back to the hub pass scroll={false}: the hub restores the reviewer's own position.
const HUB_HREF = "/";

// The app's frame, and where the skip link sends focus.
const APP_FRAME_ID = "app";

/*
 * Keys typed into Stateview's own controls that belong to those controls.
 * Keys typed in the app never reach these shortcuts: the app is in its own
 * document, so its keys, including Escape and the arrows, stay with it.
 */
const OWNS_KEYS = [
  "input",
  "textarea",
  "select",
  "[contenteditable='true']",
  "[role='listbox']",
  "[role='menu']",
  "[role='radiogroup']",
  "[role='dialog']",
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

/**
 * A review route. In the browser tab it's the viewer; loaded with `?embed`
 * inside the viewer's iframe, it's the screen alone.
 */
export function FocusView<T extends Inputs>(props: FocusViewProps<T>) {
  const embedded = useSearchParams().has(EMBED_PARAM);
  return embedded ? <EmbeddedScreen {...props} /> : <Viewer {...props} />;
}

/** The real screen in one state, framed by Stateview's bar along the top and the filmstrip down the left. */
function Viewer<T extends Inputs>({ manifest, render }: FocusViewProps<T>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [{ sv, step }, setQuery] = useQueryStates({ sv: parseAsString, step: parseAsInteger }, { history: "push" });
  // Inputs the reviewer changed in the state panel, one URL param each, so a copied link opens the same combination.
  const [overrides, setOverrides] = useQueryStates(inputParsers(manifest), { history: "replace" });
  const review = useReview(manifest);
  const [commenting, setCommenting] = useState(false);
  const [pinsVisible, setPinsVisible] = useState(true);
  const appFrame = useRef<HTMLIFrameElement>(null);
  // The frame loads once, at the state in the URL; after that, states arrive by message, without a reload.
  const [frameSrc] = useState(() => {
    const params = new URLSearchParams(searchParams);
    params.set(EMBED_PARAM, "1");
    return `${manifest.route}?${params}`;
  });
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
  const stripTriggerRef = useRef<HTMLButtonElement>(null);
  // A closed strip is inert, so focus inside it would drop to the page: hand it back to the button that opens it.
  const closeStrip = () => {
    if (document.getElementById(stripId)?.contains(document.activeElement)) stripTriggerRef.current?.focus();
    setStripChoice(false);
  };
  const stripWidth = useStripWidth();
  // The app's edge eases only when the strip opens or closes; any resize (drag or arrow keys) and the first paint snap.
  const [stripSnap, setStripSnap] = useState(true);
  // The button and F. Dropping the snap in the same render as the new edge still animates: a transition starts from the after-change style.
  const toggleStrip = () => {
    setStripSnap(false);
    if (stripOpen) closeStrip();
    else setStripChoice(true);
  };
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
      case "f":
      case "F":
        event.preventDefault();
        toggleStrip();
        break;
      case "Escape":
        // Escape first ends comment mode, then closes what covers the app (the state panel, the strip on a phone); only after that does it leave the state.
        if (commenting) setCommenting(false);
        else if (panel !== "closed") closePanel();
        else if (!wide && stripOpen) closeStrip();
        else router.push(HUB_HREF, { scroll: false });
        break;
    }
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  // --- The app's frame: told the state and review tools by message ------------------------

  // Serialized, so the frame is told only when something in it changes (postMessage copies it anyway).
  const frameState = frame && inputs ? JSON.stringify({ type: "state", stateId: frame.key, inputs, commenting, pinsVisible } satisfies FrameState) : null;

  useEffect(() => {
    if (frameState) post(appFrame.current?.contentWindow, JSON.parse(frameState) as FrameState);
  }, [frameState]);

  const sendState = useEffectEvent(() => {
    if (frameState) post(appFrame.current?.contentWindow, JSON.parse(frameState) as FrameState);
  });

  // The frame has loaded and both sides are listening (also what tests wait for).
  const [frameReady, setFrameReady] = useState(false);

  const onFrameMessage = useEffectEvent((event: MessageEvent) => {
    const message = receive<FrameEvent>(event, appFrame.current?.contentWindow);
    if (message?.type === "ready") {
      setFrameReady(true);
      sendState();
    } else if (message?.type === "commenting") setCommenting(message.value);
  });

  useEffect(() => {
    const listener = (event: MessageEvent) => onFrameMessage(event);
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  // The skip link puts focus in the app's document, so the next Tab is the app's first stop, as on a fresh load.
  const skipToApp = (event: MouseEvent) => {
    event.preventDefault();
    appFrame.current?.contentWindow?.focus();
  };

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
      <ThemeScope className="dark">
        <a
          href={`#${APP_FRAME_ID}`}
          onClick={skipToApp}
          className={cn(buttonVariants({ size: "toolbar" }), "fixed top-gui-xxs left-gui-xxs z-50 not-focus-visible:sr-only")}
        >
          Skip to app
        </a>
      </ThemeScope>
      <FocusBar
        frame={frame}
        position={index + 1}
        total={frames.length}
        hubHref={HUB_HREF}
        onPrevious={index > 0 ? () => goTo(index - 1) : null}
        onNext={index < frames.length - 1 ? () => goTo(index + 1) : null}
        strip={{ id: stripId, open: stripOpen, onToggle: toggleStrip }}
        stripTriggerRef={stripTriggerRef}
        commenting={commenting}
        onToggleCommenting={toggleCommenting}
        commentCount={openCount}
        pinsVisible={pinsVisible}
        onTogglePins={() => setPinsVisible(!pinsVisible)}
        onCopyComments={openCount > 0 ? copyComments : null}
        onCopyLink={copyLink}
        onDeleteComments={annotations.length > 0 ? deleteComments : null}
        panel={{
          id: panelId,
          open: panel !== "closed",
          onToggle: (fromKeyboard) => (panel === "closed" ? setPanel(fromKeyboard ? "keyboard" : "pointer") : closePanel()),
        }}
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
          setStripSnap(true);
          setStripWidth(width, settled);
        }}
        viewed={review.viewed}
        commentsOn={commentsOn}
        render={render}
        // On a phone the strip covers the app, so picking a state puts it away.
        onPick={() => {
          if (!wide) closeStrip();
        }}
      />
      {/*
       * The app's window: below the bar and, on wide screens, beside the open
       * filmstrip. An iframe, so the app gets a window of its own: media
       * queries, viewport units and `innerWidth` measure the frame, fixed
       * elements stay inside it, and its focus and keys are its own. The
       * comment engine runs inside it (EmbeddedScreen).
       */}
      <ThemeScope
        style={stripWidthStyle}
        className={cn(
          "fixed top-(--viewer-bar) right-0 bottom-0 left-0 flex justify-center",
          stripOpen && "md:left-(--viewer-strip)",
          stripSnap ? "transition-none" : "gui-transition-left duration-gui-large ease-gui-large motion-reduce:transition-none",
        )}
      >
        {/* Phone states sit in a resizable phone-sized frame on wide screens. */}
        <DeviceFrame mobile={viewportOf(manifest, inputs) === "mobile"} controls={APP_FRAME_ID}>
          {/* oxlint-disable-next-line react/iframe-missing-sandbox -- the frame is this app's own route and needs scripts, storage and same-origin access, which a sandbox can't restrict. */}
          <iframe
            ref={appFrame}
            id={APP_FRAME_ID}
            data-stateview-frame=""
            data-ready={frameReady ? "" : undefined}
            title={manifest.screen}
            src={frameSrc}
            className="size-full"
          />
        </DeviceFrame>
      </ThemeScope>
      <StatePanel
        id={panelId}
        ref={panelRef}
        open={panel !== "closed"}
        manifest={manifest}
        inputs={inputs}
        onChange={setInput}
        onClose={closePanel}
        focusOnOpen={panel === "keyboard"}
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

function UnknownState({ id }: { id: string | null }) {
  return (
    <ThemeScope as="main" className="flex flex-1 bg-gui-neutral-1">
      {/* Pages set their own titles (app/layout.tsx), so this one needs its own too. */}
      <title>Stateview</title>
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
