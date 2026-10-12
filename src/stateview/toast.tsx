"use client";

import { Toaster, toast, type ExternalToast } from "sonner";
import { CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react";
import { ThemeScope } from "./ui";

/*
 * Stateview's own toasts, kept apart from the app under review: they go to a
 * Toaster with its own id, so an app that renders a Toaster of its own shows
 * neither twice nor the other's.
 */

const TOASTER_ID = "stateview";

// Graphical Toast: sonner's default look is replaced, not layered over.
const classNames = {
  toast:
    "flex w-full items-center gap-gui-xs rounded-gui-m bg-gui-neutral-1 p-gui-m font-gui-ui text-gui-m text-gui-neutral-10 shadow-gui-m ring-1 ring-gui-neutral-4-transparent dark:bg-gui-neutral-2",
  title: "font-gui-medium",
  description: "text-gui-neutral-7",
  icon: "text-gui-neutral-10",
  actionButton: "ml-auto rounded-gui-s px-gui-xs py-gui-xxs font-gui-medium text-gui-neutral-10 hover:bg-gui-neutral-4",
};

const icons = {
  success: <CheckCircleIcon aria-hidden />,
  error: <XCircleIcon aria-hidden />,
};

export const notify = {
  success: (message: string, options?: ExternalToast) => toast.success(message, { ...options, toasterId: TOASTER_ID }),
  error: (message: string, options?: ExternalToast) => toast.error(message, { ...options, toasterId: TOASTER_ID }),
};

/** Render once per Stateview page. */
export function StateviewToaster() {
  return (
    <ThemeScope>
      <Toaster id={TOASTER_ID} position="top-center" icons={icons} toastOptions={{ unstyled: true, classNames }} />
    </ThemeScope>
  );
}
