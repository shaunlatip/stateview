"use client";

import { useState, type ComponentType } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "./cn";
import { Anchor } from "./components/ui/anchor";
import { usePortalContainer } from "./components/ui/portal";
import { useGateway } from "./context";
import { TEAMS } from "./fixtures";
import {
  IconAgent,
  IconBell,
  IconBudgets,
  IconByok,
  IconChat,
  IconChevronLeft,
  IconChevronUpDown,
  IconClose,
  IconDocs,
  IconExternal,
  IconKey,
  IconLeaderboards,
  IconLogs,
  IconMenu,
  IconModelList,
  IconMore,
  IconOverview,
  IconPlus,
  IconQuickStart,
  IconSearch,
  IconSettings,
  IconSlash,
  IconVirtualModels,
} from "./icons";
import type { GatewayState } from "./state";

type NavItem = { label: string; icon: ComponentType<{ size?: number }>; page?: GatewayState["page"]; href?: string; external?: boolean };

const NAV: NavItem[] = [
  { label: "Overview", icon: IconOverview, page: "overview" },
  { label: "Quick Start", icon: IconQuickStart, page: "quick-start" },
  { label: "Logs", icon: IconLogs },
  { label: "Budgets & Spend", icon: IconBudgets },
  { label: "API Keys", icon: IconKey },
  { label: "Bring Your Own Key", icon: IconByok },
  { label: "Virtual Models", icon: IconVirtualModels },
  { label: "Settings", icon: IconSettings },
  { label: "Model List", icon: IconModelList, href: "https://vercel.com/ai-gateway/models" },
  { label: "Leaderboards", icon: IconLeaderboards, href: "https://vercel.com/ai-gateway/leaderboards" },
  { label: "Documentation", icon: IconDocs, href: "https://vercel.com/docs/ai-gateway" },
  { label: "Playground", icon: IconChat, href: "https://ai-sdk.dev/playground", external: true },
];

const iconButton =
  "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-gw-md outline-none hover:bg-gw-gray-alpha-200 focus-visible:shadow-gw-focus-ring";

const navRow = "group flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-gw-md px-3 text-left transition-colors outline-none focus-visible:shadow-gw-focus-ring";

/*
 * Measured: 256px rail, 36px rows with 6px radius, active row on gray-200,
 * 14/20 medium labels with -0.28px tracking, gray-1000 active, gray-900 idle.
 * A new team has nothing to overview, so Quick Start is its only entry.
 */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { team, page, goTo } = useGateway();
  const fresh = team === "new";
  const nav = fresh ? NAV.filter((item) => item.page !== "overview") : NAV;
  const info = TEAMS[team];

  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-2 pr-2 pl-4">
        <span className={cn("size-4 shrink-0 rounded-full", fresh ? "gw-team-new" : "gw-team-pro")} />
        <span className="truncate text-gw-heading-14 font-medium text-gw-gray-1000">{info.name}</span>
        <span className={cn("gw-plan-pill rounded-full px-1.5", fresh ? "bg-gw-gray-200 text-gw-gray-900" : "bg-gw-blue-300 text-gw-blue-900")}>
          {info.plan}
        </span>
        <button type="button" aria-label="Switch team" className={cn(iconButton, "ml-auto size-8 text-gw-gray-900")}>
          <IconChevronUpDown />
        </button>
      </div>

      <div className="px-2">
        <button
          type="button"
          className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-gw-md bg-gw-background-100 px-3 text-left text-gw-gray-800 shadow-gw-hairline outline-none hover:bg-gw-gray-100 focus-visible:shadow-gw-focus-ring"
        >
          <IconSearch />
          <span className="flex-1 text-gw-copy-14">Find</span>
          <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-gw-sm bg-gw-background-100 px-1 font-sans text-gw-label-12 text-gw-gray-1000 shadow-gw-hairline">
            F
          </kbd>
        </button>
      </div>

      <nav aria-label="AI Gateway" className="mt-2.5 flex flex-1 flex-col gap-px overflow-y-auto px-2">
        <div className="relative mb-1 flex h-9 shrink-0 items-center justify-center">
          <button type="button" aria-label="Back to team navigation" className={cn(iconButton, "absolute left-0 size-9 text-gw-gray-900 hover:text-gw-gray-1000")}>
            <IconChevronLeft />
          </button>
          <span className="text-gw-heading-14 font-normal tracking-normal text-gw-gray-1000">AI Gateway</span>
        </div>
        <ul className="flex flex-col gap-px">
          {nav.map((item) => {
            const active = item.page === page;
            const Icon = item.icon;
            const classes = cn(navRow, active ? "bg-gw-gray-200 text-gw-gray-1000" : "text-gw-gray-900 hover:bg-gw-gray-alpha-100 hover:text-gw-gray-1000");
            const label = (
              <>
                <Icon size={16} />
                <span className="flex items-center gap-1.5 text-gw-heading-14 font-medium">
                  {item.label}
                  {item.external ? <IconExternal size={16} /> : null}
                </span>
              </>
            );
            return (
              <li key={item.label}>
                {item.page ? (
                  <Anchor
                    href={`#${item.page}`}
                    aria-current={active ? "page" : undefined}
                    className={classes}
                    onClick={(event) => {
                      event.preventDefault();
                      if (item.page) goTo(item.page);
                      onNavigate?.();
                    }}
                  >
                    {label}
                  </Anchor>
                ) : item.href ? (
                  <Anchor href={item.href} target="_blank" rel="noreferrer" className={classes}>
                    {label}
                  </Anchor>
                ) : (
                  <button type="button" className={classes}>
                    {label}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex h-14 shrink-0 items-center gap-2 px-4">
        <span className="gw-user-avatar size-5 shrink-0 rounded-full" />
        <span className="flex-1 truncate text-gw-heading-14 font-medium text-gw-gray-1000">Shaun Latip</span>
        <button
          type="button"
          aria-label="More"
          className="inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-gw-gray-900 shadow-gw-hairline outline-none hover:text-gw-gray-1000 focus-visible:shadow-gw-focus-ring"
        >
          <IconMore size={12} />
        </button>
        <button
          type="button"
          aria-label="Notifications, 1 unread"
          className="relative inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-gw-gray-900 shadow-gw-hairline outline-none hover:text-gw-gray-1000 focus-visible:shadow-gw-focus-ring"
        >
          <IconBell size={14} />
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-gw-blue-700 ring-2 ring-gw-background-200" />
        </button>
      </div>
    </>
  );
}

const rail = "flex w-64 flex-col border-r border-gw-gray-alpha-400 bg-gw-background-200";

/** The fixed 256px rail at 1024px and up. Fixed to the frame in the app, to the thumbnail when scaled down on the hub. */
export function Sidebar() {
  return (
    <aside className={cn(rail, "fixed inset-y-0 left-0 z-30 hidden @5xl:flex")}>
      <SidebarContent />
    </aside>
  );
}

/** Below 1024px the rail is a drawer over a scrim, opened from the header, like the dashboard's collapsed nav. */
function NavDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const container = usePortalContainer();
  if (!container) return null;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal container={container}>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <DialogPrimitive.Popup
          aria-label="Navigation"
          className={cn(
            rail,
            "fixed inset-y-0 left-0 z-50 shadow-gw-modal outline-none transition-transform duration-200 data-ending-style:-translate-x-full data-starting-style:-translate-x-full motion-reduce:transition-none",
          )}
        >
          <SidebarContent onNavigate={() => onOpenChange(false)} />
          <DialogPrimitive.Close aria-label="Close navigation" className={cn(iconButton, "absolute top-3 -right-11 size-8 bg-gw-background-100 text-gw-gray-1000 shadow-gw-hairline")}>
            <IconClose />
          </DialogPrimitive.Close>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Measured: 56px bar, scope switcher left, breadcrumb centred, "Create New" and "Agent" as 14/20 medium ghost buttons. */
export function Header() {
  const { page, agent, openAgent, closeAgent, projects, team } = useGateway();
  const [drawer, setDrawer] = useState(false);
  const target = projects.find((p) => p.state === "recommended") ?? projects.find((p) => p.state === "none");
  const headerButton = "flex h-8 cursor-pointer items-center gap-1.5 rounded-gw-md px-2.5 text-gw-button-14 text-gw-gray-1000 outline-none hover:bg-gw-gray-alpha-200 focus-visible:shadow-gw-focus-ring";

  return (
    <header className="gw-header-grid sticky top-0 z-20 grid h-14 items-center gap-2 border-b border-gw-gray-alpha-400 bg-gw-background-200 px-4">
      <div className="flex min-w-0 items-center gap-1">
        <button
          type="button"
          aria-label="Open navigation"
          aria-expanded={drawer}
          onClick={() => setDrawer(true)}
          className={cn(iconButton, "size-8 text-gw-gray-1000 @5xl:hidden")}
        >
          <IconMenu />
        </button>
        <button type="button" className={cn(headerButton, "w-fit gap-1 px-2 whitespace-nowrap")}>
          All Projects
          <IconChevronUpDown size={16} className="text-gw-gray-900" />
        </button>
      </div>
      <nav aria-label="Breadcrumb" className="text-gw-copy-14 @max-gw-sm:hidden">
        <ol className="flex items-center gap-2">
          {page === "quick-start" ? (
            <>
              <li className="text-gw-gray-900">AI Gateway</li>
              <li aria-hidden className="flex text-gw-gray-500">
                <IconSlash size={16} />
              </li>
              <li aria-current="page" className="text-gw-gray-1000">
                Quick Start
              </li>
            </>
          ) : (
            <li aria-current="page" className="text-gw-gray-1000">
              AI Gateway
            </li>
          )}
        </ol>
      </nav>
      <div className="flex items-center justify-end gap-1">
        <button type="button" className={headerButton}>
          <IconPlus />
          <span className="@max-3xl:sr-only">Create New</span>
        </button>
        <button
          type="button"
          aria-pressed={agent !== null}
          disabled={!agent && !target}
          onClick={() => (agent ? closeAgent() : target && openAgent({ project: target, fromGitHub: team === "new" }))}
          className={cn(headerButton, "disabled:cursor-default disabled:opacity-50", agent && "bg-gw-gray-alpha-200")}
        >
          <IconAgent />
          <span className="@max-3xl:sr-only">Agent</span>
        </button>
      </div>
      <NavDrawer open={drawer} onOpenChange={setDrawer} />
    </header>
  );
}
