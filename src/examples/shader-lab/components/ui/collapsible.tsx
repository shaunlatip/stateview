import { useId, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../../cn";

/**
 * panel.tsx's CollapsibleSection: a Title-Case label and chevron that toggle
 * the body (height animated with the 0fr ↔ 1fr grid trick); `action` stays
 * clickable without toggling. `reverse` puts the body above the header, for
 * the bottom-anchored Export drawer. A closed body is inert, so keyboard
 * focus never lands inside it.
 */
export function CollapsibleSection({
  title,
  defaultOpen = true,
  action,
  children,
  reverse = false,
}: {
  title: ReactNode;
  defaultOpen?: boolean;
  action?: ReactNode;
  children: ReactNode;
  reverse?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const header = (
    <div className="flex h-6 items-center justify-between">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="group -ml-1 flex flex-1 cursor-pointer items-center gap-1 rounded py-0.5 pl-1 text-left"
      >
        <ChevronRight
          aria-hidden
          className={cn(
            "size-3.5 shrink-0 text-sl-text-2 transition-transform duration-200 ease-out",
            open && (reverse ? "-rotate-90" : "rotate-90"),
          )}
        />
        <span className="text-[13px] leading-none font-medium text-sl-text">{title}</span>
      </button>
      {action}
    </div>
  );
  const body = (
    <div
      id={bodyId}
      inert={!open}
      className={cn("grid transition-[grid-template-rows] duration-200 ease-out", open ? "sl-expand" : "sl-collapse")}
    >
      <div className="overflow-hidden">
        <div className={reverse ? "pb-2.5" : "pt-2.5"}>{children}</div>
      </div>
    </div>
  );
  return (
    <section className="flex flex-col">
      {reverse ? (
        <>
          {body}
          {header}
        </>
      ) : (
        <>
          {header}
          {body}
        </>
      )}
    </section>
  );
}
