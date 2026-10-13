import { useSyncExternalStore, type ReactNode } from "react";
import { cn } from "./cn";

/**
 * Card structure used across AI Gateway settings: title and one line inside
 * the card, action on the right, body, and an optional footer bar.
 */
export function Panel({
  title,
  description,
  action,
  footer,
  children,
  className,
}: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("gw-material-base overflow-hidden", className)}>
      {title || action ? (
        <header className={cn("flex items-center justify-between gap-6 px-6 pt-6", !children && !footer && "pb-6")}>
          <div className="flex min-w-0 flex-col gap-1">
            {title ? <h2 className="text-gw-heading-16 text-gw-gray-1000">{title}</h2> : null}
            {description ? <p className="text-gw-copy-14 text-gw-gray-900">{description}</p> : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </header>
      ) : null}
      {children ? <div className="p-6">{children}</div> : null}
      {footer ? <footer className="flex items-center gap-3 border-t border-gw-gray-alpha-400 px-6 py-3">{footer}</footer> : null}
    </section>
  );
}

const reducedQuery = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** The OS asks for reduced motion (in the frame, the frame's own media query). */
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(reducedQuery).matches,
    () => false,
  );
}
