"use client";

import { Toaster, toast, type ExternalToast } from "sonner";
import { CheckCircleIcon, InfoIcon, SpinnerGapIcon, WarningCircleIcon, WarningIcon } from "@phosphor-icons/react";
import { ThemeScope, buttonVariants } from "./ui";

/*
 * Stateview's own toasts, kept apart from the app under review: they go to a
 * Toaster with its own id, so an app that renders a Toaster of its own shows
 * neither twice nor the other's.
 */

const TOASTER_ID = "stateview";

export const notify = {
  success: (message: string, options?: ExternalToast) => toast.success(message, { ...options, toasterId: TOASTER_ID }),
  error: (message: string, options?: ExternalToast) => toast.error(message, { ...options, toasterId: TOASTER_ID }),
};

/**
 * Stateview's toasts, at the bottom right in the light scheme. Unstyled, so
 * Sonner's own colours don't apply: they follow the OS scheme, which in dark
 * mode set the description near-white on the white toast. Render once per
 * Stateview page; the theme scope carries the tokens and icon weight.
 */
export function StateviewToaster() {
  return (
    <ThemeScope>
      <Toaster
        id={TOASTER_ID}
        theme="light"
        position="bottom-right"
        icons={{
          success: <CheckCircleIcon aria-hidden />,
          info: <InfoIcon aria-hidden />,
          warning: <WarningIcon aria-hidden />,
          error: <WarningCircleIcon aria-hidden />,
          loading: <SpinnerGapIcon aria-hidden className="motion-safe:animate-spin" />,
        }}
        toastOptions={{
          unstyled: true,
          classNames: {
            toast:
              "flex w-full items-center gap-gui-s rounded-gui-m bg-gui-neutral-1 p-gui-s font-gui-ui text-gui-m text-gui-neutral-10 shadow-gui-m ring-1 ring-gui-border outline-none focus-visible:gui-focus-ring",
            icon: "flex shrink-0 self-start py-gui-xxs text-gui-m",
            content: "flex min-w-0 flex-1 flex-col",
            title: "font-gui-medium",
            description: "text-gui-s text-gui-neutral-7",
            actionButton: buttonVariants({ variant: "outline", size: "bar-text" }),
          },
        }}
      />
    </ThemeScope>
  );
}
