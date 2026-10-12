"use client";

import { useId, useState, type ComponentType, type FormEvent } from "react";
import {
  Activity,
  Bell,
  ChartLine,
  ChevronRight,
  ChevronsUpDown,
  CircleAlert,
  CircleCheck,
  CreditCard,
  FolderKanban,
  House,
  Inbox,
  LifeBuoy,
  Loader2,
  Lock,
  Mail,
  Search,
  Settings,
  Shield,
  TriangleAlert,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DRAFT_INVITE,
  DUPLICATE_INVITE,
  FAILED_REMOVAL_ID,
  FREE_SEAT_LIMIT,
  PRO_PRICE_PER_SEAT,
  TEAM_NAME,
  invitesFor,
  membersFor,
  type Invite,
  type Member,
  type Role,
} from "./fixtures";
import type { MembersState } from "./state";

/**
 * A "Team members" settings page, laid out after the Team Settings page in
 * Vercel's Next.js SaaS Starter (MIT), inside the shell of a fictional product
 * called Halcyon (brand tokens in `halcyon.css`). It renders entirely from
 * `state`; actions answer from canned responses after a short delay, so every
 * state is still the live, clickable app. Layout uses container queries so it
 * reflows inside a narrow frame as well as a narrow window.
 */
export function MembersScreen({ state }: { state: MembersState }) {
  return (
    <div className="halcyon @container flex min-h-full flex-col bg-background text-foreground">
      <div className="flex flex-1 flex-col @3xl:pl-60">
        <MobileHeader />
        <Sidebar plan={state.plan} />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileSettingsNav />
          <main className="flex-1 px-4 py-6 @3xl:px-10 @3xl:py-10">
            <div className="mx-auto flex max-w-3xl flex-col gap-6">
              <div className="flex flex-col gap-1">
                <nav aria-label="Breadcrumb" className="hidden @3xl:block">
                  <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <li>Settings</li>
                    <li aria-hidden>
                      <ChevronRight className="size-3.5" />
                    </li>
                    <li aria-current="page" className="text-foreground">
                      Team
                    </li>
                  </ol>
                </nav>
                <h1 className="text-xl font-semibold tracking-tight @3xl:mt-2 @3xl:text-2xl">Team settings</h1>
                <p className="text-sm text-muted-foreground">Manage who can open the {TEAM_NAME} workspace and what each person can do.</p>
              </div>
              <TeamSettings state={state} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

/** Halcyon's mark: a low sun over calm water. */
function HalcyonMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-6 shrink-0">
      <rect width="24" height="24" rx="6" className="fill-primary" />
      <path d="M7 14.5a5 5 0 0 1 10 0Z" className="fill-brand-accent" />
      <path
        d="M5 17.5c1.2 0 1.8-.8 3.5-.8s2.3.8 3.5.8 1.8-.8 3.5-.8 2.3.8 3.5.8"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="stroke-primary-foreground"
      />
    </svg>
  );
}

const YOU_INITIALS = "SO";

type NavEntry = { label: string; icon: ComponentType<{ className?: string }>; current?: boolean; count?: number };

const mainNav: NavEntry[] = [
  { label: "Home", icon: House },
  { label: "Inbox", icon: Inbox, count: 3 },
  { label: "Projects", icon: FolderKanban },
  { label: "Insights", icon: ChartLine },
];

const settingsNav: NavEntry[] = [
  { label: "General", icon: Settings },
  { label: "Team", icon: Users, current: true },
  { label: "Billing", icon: CreditCard },
  { label: "Security", icon: Shield },
  { label: "Activity", icon: Activity },
];

function NavItem({ label, icon: Icon, current = false, count }: NavEntry) {
  return (
    <button
      type="button"
      aria-current={current ? "page" : undefined}
      className={cn(
        "flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
        current ? "bg-card font-medium text-foreground shadow-xs ring-1 ring-border" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
      )}
    >
      <Icon className={cn("size-4 shrink-0", current && "text-primary")} />
      <span className="flex-1 truncate text-left">{label}</span>
      {count ? <span className="text-xs text-muted-foreground tabular-nums">{count}</span> : null}
    </button>
  );
}

function Sidebar({ plan }: { plan: MembersState["plan"] }) {
  return (
    // Fixed to the viewport in the app, and to the thumbnail when scaled down on the hub.
    <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-sidebar-border bg-sidebar @3xl:block">
      <div className="flex h-full flex-col gap-4 overflow-y-auto p-3">
        <button
          type="button"
          className="flex items-center gap-2.5 rounded-lg p-1.5 text-left outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <HalcyonMark />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold">{TEAM_NAME}</span>
            <span className="text-xs text-muted-foreground">{plan === "pro" ? "Pro" : "Free"} plan</span>
          </span>
          <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
        </button>
        <button
          type="button"
          className="flex h-8 items-center gap-2 rounded-md bg-card px-2 text-sm text-muted-foreground ring-1 ring-border outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Search className="size-4" aria-hidden />
          <span className="flex-1 text-left">Search</span>
          <Kbd>⌘K</Kbd>
        </button>
        <nav aria-label="Workspace" className="flex flex-col gap-5">
          <ul className="flex flex-col gap-0.5">
            {mainNav.map((item) => (
              <li key={item.label}>
                <NavItem {...item} />
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-1">
            <p className="px-2 text-xs font-medium text-muted-foreground">Settings</p>
            <ul className="flex flex-col gap-0.5">
              {settingsNav.map((item) => (
                <li key={item.label}>
                  <NavItem {...item} />
                </li>
              ))}
            </ul>
          </div>
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          <NavItem label="Help & docs" icon={LifeBuoy} />
          <div className="flex items-center gap-2.5 border-t border-sidebar-border px-1 pt-3">
            <Avatar size="sm">
              <AvatarFallback data-avatar-tone={toneFor("m-you")}>{YOU_INITIALS}</AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">Sam Okafor</span>
              <span className="truncate text-xs text-muted-foreground">sam@halcyon.dev</span>
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function MobileHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4 @3xl:hidden">
      <span className="flex items-center gap-2 font-semibold">
        <HalcyonMark />
        {TEAM_NAME}
      </span>
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon" aria-label="Notifications">
          <Bell aria-hidden />
        </Button>
        <Avatar size="sm">
          <AvatarFallback data-avatar-tone={toneFor("m-you")}>{YOU_INITIALS}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

function MobileSettingsNav() {
  return (
    <nav aria-label="Settings" className="border-b bg-card @3xl:hidden">
      <ul className="flex gap-1 overflow-x-auto px-3 py-2">
        {settingsNav.map(({ label, icon: Icon, current }) => (
          <li key={label} className="shrink-0">
            <button
              type="button"
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex h-8 items-center gap-2 rounded-md px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                current ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function TeamSettings({ state }: { state: MembersState }) {
  const [members, setMembers] = useState(() => membersFor(state));
  const [invites, setInvites] = useState<Invite[]>(() => [
    ...invitesFor(state),
    ...(state.inviteRequest === "success" ? [{ id: "i-draft", ...DRAFT_INVITE, sentAgo: "just now" }] : []),
  ]);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [failedRemovalId, setFailedRemovalId] = useState(state.removeRequest === "error" ? FAILED_REMOVAL_ID : null);

  const isOwner = state.role === "owner";
  // PLANTED BUG (see README): written when the only roles were owner and member,
  // so it lets viewers remove people too. Stateview's "Viewer" state catches it.
  const canManage = state.role !== "member";
  const ssoOn = state.ssoBeta === "on";
  const seatsUsed = members.length + invites.length;
  const atSeatLimit = state.plan === "free" && seatsUsed >= FREE_SEAT_LIMIT;
  const loading = state.membersRequest === "loading";

  async function remove(member: Member) {
    setFailedRemovalId(null);
    setRemovingId(member.id);
    await wait(600);
    setRemovingId(null);
    setMembers((current) => current.filter((m) => m.id !== member.id));
  }

  async function revoke(invite: Invite) {
    setInvites((current) => current.filter((i) => i.id !== invite.id));
  }

  return (
    <div className="flex flex-col gap-6">
      <SubscriptionCard state={state} seatsUsed={seatsUsed} memberCount={members.length} inviteCount={invites.length} atSeatLimit={atSeatLimit} loading={loading} />
      <MembersCard
        members={members}
        invites={invites}
        loading={loading}
        ssoOn={ssoOn}
        removingId={removingId}
        failedRemoval={members.find((m) => m.id === failedRemovalId) ?? null}
        canRemove={(member) => canManage && !member.isYou && !(ssoOn && member.sso)}
        canRevoke={canManage}
        onRemove={remove}
        onRevoke={revoke}
      />
      <InviteCard
        state={state}
        disabledReason={
          !isOwner
            ? "Only owners can invite people to the team."
            : atSeatLimit
              ? `All ${FREE_SEAT_LIMIT} seats on the Free plan are in use. Upgrade to Pro to invite more people.`
              : null
        }
        isTaken={(email) => members.some((m) => m.email === email) || invites.some((i) => i.email === email)}
        onInvited={(email, role) => setInvites((current) => [...current, { id: `i-${email}`, email, role, sentAgo: "just now" }])}
      />
    </div>
  );
}

/** Seat meter fill for 0 to FREE_SEAT_LIMIT (5) seats, as static classes. */
const seatFill = ["w-0", "w-1/5", "w-2/5", "w-3/5", "w-4/5", "w-full"];

function Stat({ label, children, detail }: { label: string; children: React.ReactNode; detail: React.ReactNode }) {
  return (
    // On narrow screens the label and value share a line; from @lg they stack in a tile.
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-muted p-3 @lg:flex-col @lg:flex-nowrap @lg:items-stretch @lg:justify-start">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="flex min-h-7 items-center text-lg font-semibold tabular-nums">{children}</dd>
      <dd className="flex min-h-5 basis-full items-center text-muted-foreground tabular-nums">{detail}</dd>
    </div>
  );
}

function SubscriptionCard({
  state,
  seatsUsed,
  memberCount,
  inviteCount,
  atSeatLimit,
  loading,
}: {
  state: MembersState;
  seatsUsed: number;
  memberCount: number;
  inviteCount: number;
  atSeatLimit: boolean;
  loading: boolean;
}) {
  const pro = state.plan === "pro";
  const seatsDetail = loading ? <Skeleton className="h-4 w-36" /> : `${memberCount} members · ${inviteCount} pending`;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Plan and seats</h2>
        </CardTitle>
        <CardDescription>Every member and pending invite takes a seat.</CardDescription>
        {state.role === "owner" ? (
          <CardAction>
            <Button type="button" variant={pro ? "outline" : "default"}>
              {pro ? "Manage subscription" : "Upgrade to Pro"}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <dl className={cn("grid gap-3", pro ? "@lg:grid-cols-3" : "@lg:grid-cols-2")}>
            <Stat label="Plan" detail={pro ? `$${PRO_PRICE_PER_SEAT} per seat, billed monthly` : `Up to ${FREE_SEAT_LIMIT} seats`}>
              {pro ? "Pro" : "Free"}
            </Stat>
            <Stat label="Seats" detail={seatsDetail}>
              {loading ? (
                <Skeleton className="h-5 w-12" />
              ) : pro ? (
                seatsUsed
              ) : (
                <span className="flex w-full items-center gap-3">
                  <span>
                    {seatsUsed} <span className="font-normal text-muted-foreground">of {FREE_SEAT_LIMIT}</span>
                  </span>
                  <span aria-hidden className="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-border">
                    <span className={cn("block h-full rounded-full", atSeatLimit ? "bg-brand-accent" : "bg-primary", seatFill[Math.min(seatsUsed, FREE_SEAT_LIMIT)])} />
                  </span>
                </span>
              )}
            </Stat>
            {pro ? (
              <Stat label="Next invoice" detail="Due Nov 1, 2026">
                {loading ? <Skeleton className="h-5 w-20" /> : `$${(seatsUsed * PRO_PRICE_PER_SEAT).toFixed(2)}`}
              </Stat>
            ) : null}
          </dl>
          {atSeatLimit ? (
            <p className="flex items-start gap-2.5 rounded-lg border border-warning-border bg-warning px-3 py-2.5 text-warning-foreground">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              Your team is using all {FREE_SEAT_LIMIT} seats on the Free plan. Upgrade to Pro to add more people.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function initials(member: Pick<Member, "name" | "email">) {
  if (!member.name) return member.email[0].toUpperCase();
  return member.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

/** One of six avatar tints (see halcyon.css), stable per member. */
function toneFor(id: string) {
  let sum = 0;
  for (const char of id) sum += char.charCodeAt(0);
  return String(sum % 6);
}

const roleLabels: Record<Role, string> = { owner: "Owner", member: "Member", viewer: "Viewer" };

function RoleBadge({ role }: { role: Role }) {
  return (
    <span className="flex w-16 shrink-0">
      <Badge variant="outline" data-role={role}>
        {roleLabels[role]}
      </Badge>
    </span>
  );
}

function MembersCard({
  members,
  invites,
  loading,
  ssoOn,
  removingId,
  failedRemoval,
  canRemove,
  canRevoke,
  onRemove,
  onRevoke,
}: {
  members: Member[];
  invites: Invite[];
  loading: boolean;
  ssoOn: boolean;
  removingId: string | null;
  failedRemoval: Member | null;
  canRemove: (member: Member) => boolean;
  canRevoke: boolean;
  onRemove: (member: Member) => void;
  onRevoke: (invite: Invite) => void;
}) {
  const invitesHeadingId = useId();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = needle ? members.filter((m) => `${m.name ?? ""} ${m.email}`.toLowerCase().includes(needle)) : members;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Members</h2>
        </CardTitle>
        <CardDescription>
          <span className="tabular-nums">
            {loading ? "Loading members…" : `${members.length} ${members.length === 1 ? "person" : "people"}`}
          </span>
        </CardDescription>
        {!loading && members.length > 1 ? (
          <CardAction>
            <Input type="search" aria-label="Filter members" placeholder="Filter members" value={query} onChange={(event) => setQuery(event.target.value)} className="w-40 @md:w-56" />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {ssoOn && !loading ? (
            <p className="flex items-start gap-2.5 rounded-lg border border-info-border bg-info-surface px-3 py-2.5 text-accent-foreground">
              <Shield className="mt-0.5 size-4 shrink-0" aria-hidden />
              Members marked SSO are managed by your identity provider and can’t be removed here.
            </p>
          ) : null}
          {loading ? (
            <ul aria-busy="true" aria-label="Members" className="flex flex-col divide-y">
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex items-center gap-3 py-3 first:pt-0">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col">
              <div aria-hidden className="hidden gap-4 border-b pb-2 text-xs font-medium text-muted-foreground @2xl:flex">
                <span className="flex-1">Name</span>
                <span className="w-28">Last active</span>
                <span className="w-16">Role</span>
                <span className="w-20" />
              </div>
              <ul aria-label="Members" className="flex flex-col divide-y">
                {shown.map((member) => (
                  <li key={member.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 last:pb-0 @2xl:first:pt-3">
                    <div className="flex min-w-0 flex-1 basis-full items-center gap-3 @md:basis-0">
                      <Avatar>
                        <AvatarFallback data-avatar-tone={toneFor(member.id)}>{initials(member)}</AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium wrap-anywhere">
                          {member.name ?? member.email}
                          {member.isYou ? <Badge variant="secondary">You</Badge> : null}
                          {ssoOn && member.sso ? (
                            <Badge variant="outline">
                              <Lock aria-hidden />
                              SSO
                            </Badge>
                          ) : null}
                        </p>
                        {member.name ? <p className="text-muted-foreground wrap-anywhere">{member.email}</p> : null}
                      </div>
                    </div>
                    <span className="hidden w-28 shrink-0 text-muted-foreground @2xl:block">
                      <span className="sr-only">Last active: </span>
                      {member.lastActive}
                    </span>
                    <div className="ml-11 flex items-center gap-4 @md:ml-0">
                      <RoleBadge role={member.role} />
                      <span className="flex w-20 justify-end">
                        {canRemove(member) ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={removingId === member.id}
                            aria-label={`Remove ${member.name ?? member.email}`}
                            onClick={() => onRemove(member)}
                          >
                            {removingId === member.id ? "Removing…" : "Remove"}
                          </Button>
                        ) : null}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              {shown.length === 0 ? (
                <p className="py-6 text-center text-muted-foreground wrap-anywhere">No one on the team matches “{query.trim()}”.</p>
              ) : null}
            </div>
          )}
          {!loading && members.length === 1 ? (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-input px-3 py-4 text-muted-foreground">
              <UserPlus className="size-4 shrink-0" aria-hidden />
              <p>You’re the only one on this team. Invite people below.</p>
            </div>
          ) : null}
          {failedRemoval ? (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-danger-border bg-danger-surface px-3 py-2">
              <p className="flex items-start gap-2.5">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                <span>Couldn’t remove {failedRemoval.name ?? failedRemoval.email}. The request timed out.</span>
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => onRemove(failedRemoval)}>
                Try again
              </Button>
            </div>
          ) : null}
          {invites.length > 0 && !loading ? (
            <section aria-labelledby={invitesHeadingId} className="flex flex-col gap-1 border-t pt-4">
              <h3 id={invitesHeadingId} className="flex items-center gap-2 font-medium">
                Pending invites
                <Badge variant="secondary">{invites.length}</Badge>
              </h3>
              <ul className="flex flex-col divide-y">
                {invites.map((invite) => (
                  <li key={invite.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 last:pb-0">
                    <div className="flex min-w-0 flex-1 basis-full items-center gap-3 @md:basis-0">
                      <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed border-input text-muted-foreground">
                        <Mail className="size-4" />
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <p className="wrap-anywhere">{invite.email}</p>
                        <p className="text-muted-foreground">Invited {invite.sentAgo}</p>
                      </div>
                    </div>
                    <span aria-hidden className="hidden w-28 shrink-0 @2xl:block" />
                    <div className="ml-11 flex items-center gap-4 @md:ml-0">
                      <RoleBadge role={invite.role} />
                      <span className="flex w-20 justify-end">
                        {canRevoke ? (
                          <Button type="button" variant="ghost" size="sm" aria-label={`Revoke invite for ${invite.email}`} onClick={() => onRevoke(invite)}>
                            Revoke
                          </Button>
                        ) : null}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

type InviteStatus = MembersState["inviteRequest"];

const roleOptions: { value: Role; label: string; description: string }[] = [
  { value: "member", label: "Member", description: "Creates and edits projects." },
  { value: "viewer", label: "Viewer", description: "Views projects and leaves comments." },
  { value: "owner", label: "Owner", description: "Everything, plus billing and the team." },
];

function InviteCard({
  state,
  disabledReason,
  isTaken,
  onInvited,
}: {
  state: MembersState;
  disabledReason: string | null;
  isTaken: (email: string) => boolean;
  onInvited: (email: string, role: Role) => void;
}) {
  const id = useId();
  const startEmail =
    state.inviteRequest === "duplicate-error"
      ? DUPLICATE_INVITE.email
      : state.inviteDraft === "filled" && state.inviteRequest !== "success"
        ? DRAFT_INVITE.email
        : "";
  const [email, setEmail] = useState(startEmail);
  const [role, setRole] = useState<Role>("member");
  const [status, setStatus] = useState<InviteStatus>(state.inviteRequest);
  const [lastEmail, setLastEmail] = useState(state.inviteRequest === "success" ? DRAFT_INVITE.email : startEmail);

  const disabled = disabledReason !== null;
  const submitting = status === "submitting";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    setLastEmail(address);
    setStatus("submitting");
    await wait(800);
    if (isTaken(address)) {
      setStatus("duplicate-error");
      return;
    }
    onInvited(address, role);
    setStatus("success");
    setEmail("");
    setRole("member");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Invite a teammate</h2>
        </CardTitle>
        <CardDescription>They’ll get an email with a link to join {TEAM_NAME}.</CardDescription>
      </CardHeader>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <CardContent>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-email`}>Email</Label>
              <Input
                id={`${id}-email`}
                name="email"
                type="email"
                autoComplete="off"
                placeholder="name@company.com"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (status === "duplicate-error") setStatus("idle");
                }}
                disabled={disabled}
                readOnly={submitting}
                aria-invalid={status === "duplicate-error" || undefined}
                aria-describedby={status === "duplicate-error" ? `${id}-error` : undefined}
              />
              {status === "duplicate-error" ? (
                <p id={`${id}-error`} className="flex items-center gap-1.5 text-destructive">
                  <CircleAlert className="size-4 shrink-0" aria-hidden />
                  {lastEmail} is already on the team or has a pending invite.
                </p>
              ) : null}
            </div>
            <fieldset className="flex flex-col gap-2" disabled={disabled || submitting}>
              <legend className="mb-2 text-sm font-medium">Role</legend>
              <RadioGroup
                name="role"
                value={role}
                onValueChange={(value) => setRole(value as Role)}
                className="@lg:grid-cols-3"
                disabled={disabled || submitting}
              >
                {roleOptions.map(({ value, label, description }) => (
                  <label
                    key={value}
                    htmlFor={`${id}-${value}`}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 transition-colors has-data-checked:border-primary has-data-checked:bg-accent",
                      disabled || submitting ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-muted",
                    )}
                  >
                    <span className="flex pt-0.5">
                      <RadioGroupItem value={value} id={`${id}-${value}`} />
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="font-medium">{label}</span>
                      <span className="text-muted-foreground">{description}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </fieldset>
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col">
              {disabledReason ? (
                <p className="flex items-start gap-2 text-muted-foreground">
                  <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {disabledReason}
                </p>
              ) : null}
              <p role="status" className="flex items-center gap-1.5 text-muted-foreground">
                {status === "success" ? (
                  <>
                    <CircleCheck className="size-4 shrink-0 text-primary" aria-hidden />
                    Invitation sent to {lastEmail}.
                  </>
                ) : null}
              </p>
            </div>
            <Button type="submit" disabled={disabled || submitting}>
              {submitting ? <Loader2 className="motion-safe:animate-spin" aria-hidden /> : <UserPlus aria-hidden />}
              {submitting ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
