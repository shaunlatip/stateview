import { CircleCheck, OctagonX } from "lucide-react";

export type ToastData = { id: number; kind: "success" | "error"; title: string; description?: string };

/**
 * The lab's sonner Toaster (bottom-right, `--normal-*` mapped to the elevated
 * canvas, text and border), drawn in place so it stays inside the frame:
 * sonner's 356px card, 16px padding, 8px radius, 13px text and its 16px
 * lucide status icon. The newest toast shows; a live region announces it.
 */
export function SlToaster({ toast }: { toast: ToastData | null }) {
  return (
    <section
      aria-label="Notifications"
      aria-live="polite"
      className="pointer-events-none absolute right-6 bottom-6 z-60 flex flex-col items-end max-sm:right-4 max-sm:bottom-4 max-sm:left-4"
    >
      {toast && (
        <div
          key={toast.id}
          role="status"
          className="sl-toast-width sl-toast-in pointer-events-auto flex items-center gap-1.5 rounded-sl-toast border border-sl-border bg-sl-elevated p-4 font-sl-lab text-[13px] text-sl-text shadow-sl-toast max-sm:w-full max-sm:max-w-none"
        >
          <span aria-hidden className="flex size-4 shrink-0 items-center justify-start">
            {toast.kind === "success" ? <CircleCheck className="size-4" /> : <OctagonX className="size-4" />}
          </span>
          <div className="flex flex-col gap-0.5">
            <div className="leading-normal font-medium">{toast.title}</div>
            {toast.description && <div className="leading-[1.4] font-normal text-sl-toast-text-2">{toast.description}</div>}
          </div>
        </div>
      )}
    </section>
  );
}
