"use client";

import { Toaster as Sonner, toast } from "sonner";
import { IconCheckCircle } from "../../icons";

const ID = "ai-gateway";

/*
 * The screen's own toaster, inside its root so toasts take the dashboard's
 * tokens and theme (the host's toaster, in the layout, keeps Stateview's).
 * Surfaces use the Geist menu material, as in the prototype.
 */
export function Toaster({ theme }: { theme: "light" | "dark" }) {
  return (
    <Sonner
      id={ID}
      theme={theme}
      position="bottom-right"
      icons={{ success: <IconCheckCircle size={16} className="text-gw-gray-1000" /> }}
      toastOptions={{ classNames: { toast: "gw-toast", description: "gw-toast-description" } }}
    />
  );
}

export function notify(message: string, description?: string) {
  toast.success(message, { toasterId: ID, description });
}
