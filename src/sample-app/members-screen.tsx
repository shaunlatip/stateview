"use client";

import { useId, useState, type FormEvent } from "react";
import { Activity, CircleIcon, Loader2, Settings, Shield, UserPlus, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
 * Vercel's Next.js SaaS Starter (MIT). It renders entirely from `state`;
 * actions answer from canned responses after a short delay, so every state is
 * still the live, clickable app. Layout uses container queries so it reflows
 * inside a narrow frame as well as a narrow window.
 */
export function MembersScreen({ state }: { state: MembersState }) {
  return (
    <div className="@container flex min-h-full flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 @3xl:px-6">
        <span className="flex items-center gap-2 font-semibold">
          <CircleIcon className="size-5" aria-hidden />
          {TEAM_NAME}
        </span>
        <Avatar size="sm">
          <AvatarFallback>SO</AvatarFallback>
        </Avatar>
      </header>
      <div className="flex flex-1 flex-col @3xl:flex-row">
        <SettingsNav />
        <main className="min-w-0 flex-1 p-4 @3xl:p-8">
          <h1 className="mb-6 text-lg font-medium @3xl:text-2xl">Team settings</h1>
          <TeamSettings state={state} />
        </main>
      </div>
    </div>
  );
}

const navItems = [
  { label: "Team", icon: Users, current: true },
  { label: "General", icon: Settings, current: false },
  { label: "Activity", icon: Activity, current: false },
  { label: "Security", icon: Shield, current: false },
];

function SettingsNav() {
  return (
    <nav aria-label="Settings" className="border-b @3xl:w-56 @3xl:border-r @3xl:border-b-0">
      <ul className="flex gap-1 overflow-x-auto p-2 @3xl:flex-col @3xl:p-4">
        {navItems.map(({ label, icon: Icon, current }) => (
          <li key={label}>
            <Button
              type="button"
              variant={current ? "secondary" : "ghost"}
              aria-current={current ? "page" : undefined}
              className="w-full justify-start"
            >
              <Icon aria-hidden />
              {label}
            </Button>
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
    <div className="flex max-w-3xl flex-col gap-6">
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team subscription</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-start justify-between gap-4 @lg:flex-row @lg:items-center">
            <div className="flex flex-col gap-1">
              <p className="font-medium">{pro ? "Pro plan" : "Free plan"}</p>
              {loading ? (
                <Skeleton className="h-4 w-48" />
              ) : (
                <p className="text-muted-foreground tabular-nums">
                  {pro
                    ? `$${PRO_PRICE_PER_SEAT} per seat, billed monthly · ${seatsUsed} seats (${memberCount} members, ${inviteCount} pending)`
                    : `${seatsUsed} of ${FREE_SEAT_LIMIT} seats in use`}
                </p>
              )}
            </div>
            {state.role === "owner" ? (
              <Button type="button" variant="outline">
                {pro ? "Manage subscription" : "Upgrade to Pro"}
              </Button>
            ) : null}
          </div>
          {atSeatLimit ? (
            <p className="rounded-lg border bg-muted px-3 py-2">
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
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {ssoOn && !loading ? (
            <p className="text-muted-foreground">Members marked SSO are managed by your identity provider and can’t be removed here.</p>
          ) : null}
          {loading ? (
            <ul aria-busy="true" aria-label="Members" className="flex flex-col gap-4">
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ul aria-label="Members" className="flex flex-col divide-y">
              {members.map((member) => (
                <li key={member.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 flex-1 basis-full items-center gap-3 @md:basis-0">
                    <Avatar>
                      <AvatarFallback>{initials(member)}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <p className="flex flex-wrap items-center gap-2 font-medium wrap-anywhere">
                        {member.name ?? member.email}
                        {member.isYou ? <Badge variant="secondary">You</Badge> : null}
                        {ssoOn && member.sso ? <Badge variant="outline">SSO</Badge> : null}
                      </p>
                      {member.name ? <p className="text-muted-foreground wrap-anywhere">{member.email}</p> : null}
                    </div>
                  </div>
                  <span className="ml-11 text-muted-foreground capitalize @md:ml-0">{member.role}</span>
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
                </li>
              ))}
            </ul>
          )}
          {!loading && members.length === 1 ? (
            <p className="text-muted-foreground">You’re the only one on this team. Invite people below.</p>
          ) : null}
          {failedRemoval ? (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
              <p>
                Couldn’t remove {failedRemoval.name ?? failedRemoval.email}. The request timed out.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => onRemove(failedRemoval)}>
                Try again
              </Button>
            </div>
          ) : null}
          {invites.length > 0 && !loading ? (
            <section aria-labelledby={invitesHeadingId} className="flex flex-col gap-2 border-t pt-4">
              <h3 id={invitesHeadingId} className="font-medium">
                Pending invites
              </h3>
              <ul className="flex flex-col gap-2">
                {invites.map((invite) => (
                  <li key={invite.id} className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="min-w-0 flex-1 basis-full wrap-anywhere @md:basis-0">{invite.email}</span>
                    <span className="text-muted-foreground">
                      <span className="capitalize">{invite.role}</span> · sent {invite.sentAgo}
                    </span>
                    {canRevoke ? (
                      <Button type="button" variant="ghost" size="sm" aria-label={`Revoke invite for ${invite.email}`} onClick={() => onRevoke(invite)}>
                        Revoke
                      </Button>
                    ) : null}
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

const roleOptions: { value: Role; label: string }[] = [
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
  { value: "owner", label: "Owner" },
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
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
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
              <p id={`${id}-error`} className="text-destructive">
                {lastEmail} is already on the team or has a pending invite.
              </p>
            ) : null}
          </div>
          <fieldset className="flex flex-col gap-2" disabled={disabled || submitting}>
            <legend className="mb-2 text-sm font-medium">Role</legend>
            <RadioGroup name="role" value={role} onValueChange={(value) => setRole(value as Role)} className="flex flex-wrap" disabled={disabled || submitting}>
              {roleOptions.map(({ value, label }) => (
                <div key={value} className="flex items-center gap-2 pr-2">
                  <RadioGroupItem value={value} id={`${id}-${value}`} />
                  <Label htmlFor={`${id}-${value}`}>{label}</Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={disabled || submitting}>
              {submitting ? <Loader2 className="motion-safe:animate-spin" aria-hidden /> : <UserPlus aria-hidden />}
              {submitting ? "Inviting…" : "Invite"}
            </Button>
            <p role="status" className="text-muted-foreground">
              {status === "success" ? `Invitation sent to ${lastEmail}.` : ""}
            </p>
          </div>
        </form>
      </CardContent>
      {disabledReason ? (
        <CardFooter>
          <p className="text-muted-foreground">{disabledReason}</p>
        </CardFooter>
      ) : null}
    </Card>
  );
}
