"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "./cn";
import { SlToaster } from "./components/ui/toast";
import { Header } from "./header";
import { LeftPanel } from "./left-panel";
import { RightPanel } from "./right-panel";
import { Stage } from "./stage";
import type { ShaderLabState } from "./state";
import { stillKey } from "./stills";
import { Tour } from "./tour";
import { useLab } from "./use-lab";

/** BgLab.tsx: below these widths a panel stops docking and becomes a drawer. */
const DOCK_LEFT = 1200;
const DOCK_RIGHT = 900;

/**
 * Shader Lab's editor (BgLab), a pure function of `state` at mount: header,
 * the source panel, the stage with its live WebGL canvas and examples rail,
 * the effects panel, the first-visit tour and toasts. Breakpoints follow the
 * frame's own width, so a phone frame and a scaled thumbnail lay out like the
 * window they stand for.
 */
export function ShaderLabScreen({ state }: { state: ShaderLabState }) {
  const lab = useLab(state);
  const rootRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(state.breakpoint === "mobile" ? 375 : 1280);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dockLeft = width >= DOCK_LEFT;
  const dockRight = width >= DOCK_RIGHT;
  const leftDrawer = !dockLeft && lab.drawer === "left";
  const rightDrawer = !dockRight && lab.drawer === "right";
  const { setDrawer } = lab;

  // Esc closes an open drawer.
  useEffect(() => {
    if (!leftDrawer && !rightDrawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [leftDrawer, rightDrawer, setDrawer]);

  const toggle = (side: "left" | "right") => {
    const docked = side === "left" ? dockLeft : dockRight;
    if (docked) lab.setCollapsed({ ...lab.collapsed, [side]: !lab.collapsed[side] });
    else setDrawer(lab.drawer === side ? null : side);
  };

  return (
    <div
      ref={rootRef}
      data-theme={lab.theme}
      className="shader-lab @container relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-sl-canvas font-sl-lab text-sl-text antialiased"
    >
      <Header
        lab={lab}
        widths={{ compact: width < 768, hideName: width < 640, wide: width >= 1024, md: width >= 768, sm: width >= 640 }}
        leftOpen={dockLeft ? !lab.collapsed.left : leftDrawer}
        rightOpen={dockRight ? !lab.collapsed.right : rightDrawer}
        onToggleLeft={() => toggle("left")}
        onToggleRight={() => toggle("right")}
      />
      <div className="relative flex min-h-0 flex-1">
        {dockLeft && !lab.collapsed.left && <LeftPanel lab={lab} drawer={false} />}
        <main className="flex min-w-0 flex-1 flex-col">
          <Stage lab={lab} simulate={state.renderer} still={stillKey(state)} />
        </main>
        {dockRight && !lab.collapsed.right && <RightPanel lab={lab} drawer={false} />}
        {(leftDrawer || rightDrawer) && (
          // The scrim: tap it (or press Esc) to close. Kept light so preset changes stay visible behind.
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close panel"
            onClick={() => setDrawer(null)}
            className={cn("absolute inset-0 z-30 cursor-default bg-sl-scrim")}
          />
        )}
        {leftDrawer && <LeftPanel lab={lab} drawer />}
        {rightDrawer && <RightPanel lab={lab} drawer />}
      </div>
      <Tour rootRef={rootRef} step={lab.tourStep} setStep={lab.setTourStep} end={lab.endTour} focusOnShow={lab.tourFocus} />
      <SlToaster toast={lab.toast} />
    </div>
  );
}
