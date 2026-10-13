"use client";

import type { ReactNode } from "react";
import { Check, ChevronDown, CircleHelp, ClipboardCopy, PanelLeft, PanelRight, RotateCcw, Save } from "lucide-react";
import { cn } from "./cn";
import { SlButton } from "./components/ui/button";
import { SlMenu, SlMenuItem } from "./components/ui/menu";
import { IconTip } from "./components/ui/tooltip";
import type { Lab } from "./use-lab";

export type Widths = { compact: boolean; hideName: boolean; wide: boolean; md: boolean; sm: boolean };

/** Labelled on wide screens; icon-only with the label as a tooltip when compact. */
function HeaderAction({ compact, label, align, children }: { compact: boolean; label: string; align?: "end"; children: ReactNode }) {
  if (!compact) return <>{children}</>;
  return (
    <IconTip label={label} side="bottom" align={align}>
      {children}
    </IconTip>
  );
}

function Divider({ md }: { md: boolean }) {
  return md ? <div aria-hidden className="mx-0.5 h-4 w-px bg-sl-border" /> : null;
}

/**
 * LabHeader: wordmark and the source-panel toggle on the left, the draft name
 * true-centred, then tour, theme, Reset and the Save split button (its menu
 * holds Copy spec), and the effects-panel toggle.
 */
export function Header({
  lab,
  widths,
  leftOpen,
  rightOpen,
  onToggleLeft,
  onToggleRight,
}: {
  lab: Lab;
  widths: Widths;
  leftOpen: boolean;
  rightOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
}) {
  const { compact, md } = widths;
  const saveLabel = lab.hasActiveDraft ? "Update" : "Save";
  const themeLabel = `Switch to ${lab.theme === "dark" ? "light" : "dark"} theme`;

  return (
    <header
      className={cn(
        "grid h-12 shrink-0 items-center border-b border-sl-border bg-sl-canvas px-3",
        widths.wide ? "sl-header-grid-wide gap-3" : "sl-header-grid gap-2",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <IconTip label={leftOpen ? "Hide source panel" : "Show source panel"} side="bottom" align="start">
          <SlButton
            variant="ghost"
            size="icon-sm"
            onClick={onToggleLeft}
            aria-expanded={leftOpen}
            aria-label={leftOpen ? "Hide source panel" : "Show source panel"}
          >
            <PanelLeft className="size-4" />
          </SlButton>
        </IconTip>
        <span className="font-sl-logo text-sl-15 text-sl-text">shaderlab</span>
      </div>
      <input
        value={lab.draftName}
        onChange={(e) => lab.setDraftName(e.target.value)}
        spellCheck={false}
        aria-label="Draft name"
        placeholder={lab.suggested}
        className={cn(
          "sl-draft-name justify-self-center truncate rounded-sl-control border border-transparent bg-transparent px-2 py-1 text-center text-sl-13 font-medium text-sl-text outline-none transition-colors placeholder:text-sl-text-2 hover:border-sl-border focus:border-sl-border-strong",
          widths.hideName && "invisible w-0 min-w-0 px-0",
        )}
      />
      <div className={cn("flex shrink-0 items-center justify-end", widths.sm ? "gap-2" : "gap-1")}>
        <IconTip label="Quick tour" side="bottom">
          <SlButton variant="ghost" size="icon-sm" onClick={lab.actions.startTour} aria-label="Start the quick tour">
            <CircleHelp className="size-4" />
          </SlButton>
        </IconTip>
        <IconTip label={themeLabel} side="bottom">
          <SlButton variant="ghost" size="icon-sm" onClick={lab.actions.toggleTheme} aria-label={themeLabel}>
            <span aria-hidden className="sl-half-disc block size-3.5 rounded-full border-current" />
          </SlButton>
        </IconTip>
        <Divider md={md} />
        <HeaderAction compact={compact} label={lab.hasActiveDraft ? "Revert to last save" : "Reset to default"}>
          <SlButton
            variant="outline"
            size={compact ? "smCompact" : "sm"}
            aria-label={compact ? "Reset" : undefined}
            onClick={lab.actions.revert}
          >
            <RotateCcw className={cn("size-3.5", md && "mr-1.5")} /> {!compact && "Reset"}
          </SlButton>
        </HeaderAction>
        <div className="flex items-center">
          {lab.dirty ? (
            <HeaderAction compact={compact} label={saveLabel}>
              <SlButton
                variant="solid"
                size={compact ? "smCompact" : "sm"}
                split="start"
                aria-label={compact ? saveLabel : undefined}
                onClick={() => lab.actions.saveDraft()}
              >
                <Save className={cn("size-3.5", md && "mr-1.5")} /> {!compact && saveLabel}
              </SlButton>
            </HeaderAction>
          ) : (
            <HeaderAction compact={compact} label="Saved">
              <SlButton variant="saved" size={compact ? "smCompact" : "sm"} split="start" disabled aria-label={compact ? "Saved" : undefined}>
                <Check className={cn("size-3.5", md && "mr-1.5")} /> {!compact && "Saved"}
              </SlButton>
            </HeaderAction>
          )}
          <SlMenu
            open={lab.menuOpen}
            onOpenChange={lab.actions.openMenu}
            focusOnOpen={lab.menuFocus}
            label="Save options"
            renderTrigger={(props) => (
              <IconTip label="More save options" side="bottom" align="end">
                <SlButton variant={lab.dirty ? "solid" : "lab"} size="sm" split="end" aria-label="More save options" {...props}>
                  <ChevronDown className="size-3.5" />
                </SlButton>
              </IconTip>
            )}
          >
            <SlMenuItem onSelect={lab.actions.copySpec}>
              <ClipboardCopy aria-hidden className="mt-0.5 size-3.5 shrink-0 self-start text-sl-text-2" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sl-13 font-medium">Copy spec</span>
                <span className="text-sl-11 leading-snug text-sl-text-2">
                  Source, crop, output size, and every effect setting as Markdown + JSON, for handing off to an agent.
                </span>
              </span>
            </SlMenuItem>
          </SlMenu>
        </div>
        <Divider md={md} />
        <IconTip label={rightOpen ? "Hide effects panel" : "Show effects panel"} side="bottom" align="end">
          <SlButton
            variant="ghost"
            size="icon-sm"
            onClick={onToggleRight}
            aria-expanded={rightOpen}
            aria-label={rightOpen ? "Hide effects panel" : "Show effects panel"}
          >
            <PanelRight className="size-4" />
          </SlButton>
        </IconTip>
      </div>
    </header>
  );
}
