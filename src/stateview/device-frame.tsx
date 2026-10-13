"use client";

import { useEffect, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { cn } from "./cn";
import { DEVICE_SIZE, setDeviceSize, useDeviceSize, type DeviceSize } from "./device-size";
import { Badge } from "./ui";

type Side = -1 | 0 | 1;

type Handle = {
  /** Which way the handle moves each axis: 1 grows it towards right/bottom, -1 towards left/top, 0 leaves it. */
  x: Side;
  y: Side;
  cursor: string;
  className: string;
};

// Each handle straddles its edge or corner, M wide, so it's easy to grab. Corners sit above the edges.
const EDGE_LINE = "after:absolute after:transition-colors after:duration-gui after:ease-gui hover:after:bg-gui-neutral-6 focus-visible:after:bg-gui-neutral-10 data-dragging:after:bg-gui-neutral-10 motion-reduce:after:transition-none";
const RIGHT: Handle = { x: 1, y: 0, cursor: "cursor-ew-resize", className: cn("focus-visible:gui-focus-ring inset-y-0 -right-gui-xs w-gui-m after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2", EDGE_LINE) };
const BOTTOM: Handle = { x: 0, y: 1, cursor: "cursor-ns-resize", className: cn("focus-visible:gui-focus-ring inset-x-0 -bottom-gui-xs h-gui-m after:inset-x-0 after:top-1/2 after:h-0.5 after:-translate-y-1/2", EDGE_LINE) };
const POINTER_ONLY: Handle[] = [
  { x: -1, y: 0, cursor: "cursor-ew-resize", className: cn("inset-y-0 -left-gui-xs w-gui-m after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2", EDGE_LINE) },
  { x: 0, y: -1, cursor: "cursor-ns-resize", className: cn("inset-x-0 -top-gui-xs h-gui-m after:inset-x-0 after:top-1/2 after:h-0.5 after:-translate-y-1/2", EDGE_LINE) },
  { x: -1, y: -1, cursor: "cursor-nwse-resize", className: "-top-gui-xs -left-gui-xs z-10 size-gui-m" },
  { x: 1, y: -1, cursor: "cursor-nesw-resize", className: "-top-gui-xs -right-gui-xs z-10 size-gui-m" },
  { x: -1, y: 1, cursor: "cursor-nesw-resize", className: "-bottom-gui-xs -left-gui-xs z-10 size-gui-m" },
  { x: 1, y: 1, cursor: "cursor-nwse-resize", className: "-right-gui-xs -bottom-gui-xs z-10 size-gui-m" },
];

function clamp(value: number, min: number, max: number) {
  return Math.round(Math.min(max, Math.max(min, value)));
}

/**
 * The app's window. For a phone state on a wide screen, a phone-sized frame
 * (393 × 852 to start) centred on a cutting mat, resized from any edge or
 * corner. The frame stays centred, so dragging one edge moves the opposite
 * one too, as in a browser's device mode. Keyboard: the right and bottom
 * edges are separators, resized with the arrow keys (Shift for bigger
 * steps), Home and End. Double-clicking any handle restores the default size.
 * On phones, and for desktop states, the app fills the window as before.
 *
 * The children (the iframe) always sit at the same place in the tree, so
 * switching between phone and desktop states never reloads the app.
 */
export function DeviceFrame({ mobile, controls, children }: { mobile: boolean; controls: string; children: ReactNode }) {
  const size = useDeviceSize();
  const area = useRef<HTMLDivElement>(null);
  // The mat's room inside its padding: the largest the frame can be.
  const [room, setRoom] = useState<DeviceSize | null>(null);
  const drag = useRef<{ handle: Handle; x: number; y: number; width: number; height: number } | null>(null);
  const [dragging, setDragging] = useState<Handle | null>(null);
  const [keyboardFocus, setKeyboardFocus] = useState(false);

  useEffect(() => {
    const node = area.current;
    if (!mobile || !node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setRoom({ width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [mobile]);

  // What's on screen: the chosen size, drawn smaller when the window can't fit it.
  const shown = room ? { width: Math.min(size.width, room.width), height: Math.min(size.height, room.height) } : size;
  const fit = (width: number, height: number): DeviceSize => ({
    width: clamp(width, DEVICE_SIZE.min.width, room?.width ?? DEVICE_SIZE.max.width),
    height: clamp(height, DEVICE_SIZE.min.height, room?.height ?? DEVICE_SIZE.max.height),
  });

  const resizeTo = (event: PointerEvent<HTMLDivElement>): DeviceSize | null => {
    const start = drag.current;
    if (!start) return null;
    // Both sides move, so the frame grows twice as far as the pointer.
    return fit(start.width + start.handle.x * 2 * (event.clientX - start.x), start.height + start.handle.y * 2 * (event.clientY - start.y));
  };

  const end = (event: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const start = drag.current;
    const next = resizeTo(event);
    if (!start || !next) return;
    drag.current = null;
    setDragging(null);
    setDeviceSize(cancelled ? { width: start.width, height: start.height } : next, true);
  };

  const pointerProps = (handle: Handle) => ({
    "data-dragging": dragging === handle ? "" : undefined,
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { handle, x: event.clientX, y: event.clientY, ...shown };
      setDragging(handle);
      setDeviceSize(shown, false);
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      const next = resizeTo(event);
      if (next) setDeviceSize(next, false);
    },
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => end(event, false),
    onPointerCancel: (event: PointerEvent<HTMLDivElement>) => end(event, true),
    onDoubleClick: () => setDeviceSize(DEVICE_SIZE.initial, true),
    className: cn("absolute touch-none outline-none select-none max-md:hidden", handle.cursor, handle.className),
  });

  const onKeyDown = (axis: "width" | "height", event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? DEVICE_SIZE.bigStep : DEVICE_SIZE.step;
    const value = shown[axis];
    const next = {
      [axis === "width" ? "ArrowRight" : "ArrowDown"]: value + step,
      [axis === "width" ? "ArrowLeft" : "ArrowUp"]: value - step,
      Home: DEVICE_SIZE.min[axis],
      End: room?.[axis] ?? value,
    }[event.key];
    if (next === undefined) return;
    // Arrows here resize the frame rather than step between states.
    event.preventDefault();
    setKeyboardFocus(true);
    setDeviceSize(axis === "width" ? fit(next, shown.height) : fit(shown.width, next), true);
  };

  const separatorProps = (axis: "width" | "height") => ({
    role: "separator",
    tabIndex: 0,
    "aria-orientation": axis === "width" ? ("vertical" as const) : ("horizontal" as const),
    "aria-label": axis === "width" ? "Resize phone width" : "Resize phone height",
    "aria-controls": controls,
    "aria-valuenow": shown[axis],
    "aria-valuetext": `${shown[axis]} pixels`,
    "aria-valuemin": DEVICE_SIZE.min[axis],
    "aria-valuemax": room?.[axis] ?? DEVICE_SIZE.max[axis],
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => onKeyDown(axis, event),
    onFocus: (event: FocusEvent<HTMLDivElement>) => setKeyboardFocus(event.currentTarget.matches(":focus-visible")),
    onBlur: () => setKeyboardFocus(false),
  });

  const frameStyle = { "--device-width": size.width, "--device-height": size.height } as CSSProperties;

  return (
    <div ref={area} className={cn("relative flex size-full justify-center", mobile && "md:items-center md:gui-cutting-mat md:p-gui-xl")}>
      <div style={frameStyle} className={cn("relative flex size-full", mobile && "max-w-93.75 md:gui-device-size")}>
        <div className={cn("flex size-full", mobile && "ring-1 ring-gui-border md:overflow-hidden md:rounded-gui-m md:shadow-gui-m")}>{children}</div>
        {mobile ? (
          <>
            {POINTER_ONLY.map((handle) => (
              <div key={`${handle.x},${handle.y}`} aria-hidden {...pointerProps(handle)} />
            ))}
            <div {...separatorProps("width")} {...pointerProps(RIGHT)} />
            <div {...separatorProps("height")} {...pointerProps(BOTTOM)} />
            {dragging || keyboardFocus ? (
              <Badge variant="strong" aria-hidden className="absolute top-full left-1/2 mt-gui-xs -translate-x-1/2 font-gui-data tabular-nums max-md:hidden">
                {`${shown.width} × ${shown.height}`}
              </Badge>
            ) : null}
          </>
        ) : null}
      </div>
      {/* While a handle is dragged the app can't take the pointer, and the cursor holds wherever it goes. */}
      {dragging ? <div aria-hidden className={cn("absolute inset-0 z-20", dragging.cursor)} /> : null}
    </div>
  );
}
