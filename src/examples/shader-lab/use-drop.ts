"use client";

import { useState, type DragEvent } from "react";

/**
 * useSourceDrop: drop an image or video file from the OS onto the stage or the
 * left panel to set it as the source. Only real file drags light the overlay.
 */
export function useDrop(onFile: (file: File) => void, seeded = false) {
  const [dragOver, setDragOver] = useState(seeded);
  const handlers = {
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (e.dataTransfer.types.includes("Files")) {
        e.preventDefault();
        setDragOver(true);
      }
    },
    onDragLeave: (e: DragEvent<HTMLElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false);
    },
    onDrop: (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
  };
  return { dragOver, handlers };
}
