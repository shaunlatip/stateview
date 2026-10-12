import type { Manifest } from "@/stateview/manifest";
import { membersInputValues as v, type MembersState } from "./state";

/**
 * The review for `feat/member-management`, written by hand by applying the
 * composition rules in the README: a realistic baseline first, one question
 * per state, one or two inputs changed from the baseline, only combinations a
 * real account can be in, and an honest list of what isn't covered.
 */
export const membersManifest: Manifest<MembersState> = {
  id: "team-members",
  version: 1,
  route: "/app/members",
  screen: "Team settings › Members",
  scope: { branch: "feat/member-management", base: "main", files: 6 },
  baseline: {
    role: "owner",
    plan: "pro",
    ssoBeta: "off",
    members: "typical",
    invites: "some",
    membersRequest: "ready",
    removeRequest: "idle",
    inviteDraft: "empty",
    inviteRequest: "idle",
    breakpoint: "desktop",
  },
  inputs: [
    { id: "role", label: "Role", class: "who", source: "api", values: v.role },
    { id: "plan", label: "Plan", class: "who", source: "entitlement", values: v.plan },
    { id: "ssoBeta", label: "SSO beta", class: "config", source: "flag", values: v.ssoBeta },
    { id: "members", label: "Members", class: "data", source: "api", values: v.members, labels: { "many-long": "Many" } },
    { id: "invites", label: "Pending invites", class: "data", source: "api", values: v.invites },
    { id: "membersRequest", label: "Members request", class: "system", source: "api", values: v.membersRequest },
    { id: "removeRequest", label: "Remove request", class: "system", source: "api", values: v.removeRequest },
    { id: "inviteDraft", label: "Invite form", class: "moment", source: "prop", values: v.inviteDraft },
    { id: "inviteRequest", label: "Invite request", class: "system", source: "api", values: v.inviteRequest },
    { id: "breakpoint", label: "Breakpoint", class: "environment", source: "viewport", values: v.breakpoint },
  ],
  sections: [
    {
      id: "happy-path",
      title: "Happy path",
      why: "The screen most people see most of the time.",
      tone: "base",
      items: [
        {
          kind: "state",
          id: "typical-team",
          title: "Owner managing a typical team",
          why: "An owner on the Pro plan checking who's on the team and who's still invited.",
          set: {},
          origin: "design",
        },
      ],
    },
    {
      id: "first-use",
      title: "First use",
      why: "What a brand-new team looks like before anyone joins.",
      tone: "base",
      items: [
        {
          kind: "state",
          id: "new-team",
          title: "Owner who just created a team",
          why: "An owner who just signed up, alone on the team with nothing pending.",
          set: { members: "one", invites: "none" },
          origin: "design",
        },
      ],
    },
    {
      id: "main-flows",
      title: "Main flows",
      why: "The change adds inviting with a role; each step is a moment someone is really in.",
      tone: "base",
      items: [
        {
          kind: "sequence",
          id: "invite-flow",
          title: "Invite a teammate",
          why: "An owner adding a new designer to the team as a member.",
          origin: "design",
          steps: [
            { title: "Empty form", set: {} },
            { title: "Filled in", set: { inviteDraft: "filled" } },
            { title: "Submitting", set: { inviteDraft: "filled", inviteRequest: "submitting" } },
            { title: "New pending invite", set: { inviteRequest: "success" } },
          ],
        },
      ],
    },
    {
      id: "roles",
      title: "Roles",
      why: "Who can do what. The change added a viewer role.",
      tone: "who",
      items: [
        {
          kind: "state",
          id: "member-view",
          title: "Member viewing the team",
          why: "A member looking up a colleague's email.",
          set: { role: "member" },
          checks: ["No Remove or Revoke actions", "Invite form is disabled and says why"],
          origin: "design",
        },
        {
          kind: "state",
          id: "viewer-view",
          title: "Viewer checking who's on the team",
          why: "A read-only viewer checking who has access before a client call.",
          set: { role: "viewer" },
          checks: ["No Remove or Revoke actions", "Invite form is disabled and says why"],
          origin: "design",
        },
      ],
    },
    {
      id: "plan-flags",
      title: "Plan & flags",
      why: "Entitlements and flags change what the screen offers, and a missing feature doesn't look missing.",
      tone: "who",
      items: [
        {
          kind: "state",
          id: "free-at-limit",
          title: "Free team at its seat limit",
          why: "An owner on the Free plan trying to add a sixth person.",
          set: { plan: "free", members: "at-limit", invites: "none" },
          checks: ["Invite is disabled and says why", "Upgrade path is visible"],
          origin: "design",
        },
        {
          kind: "state",
          id: "sso-beta",
          title: "Pro team with the SSO beta on",
          why: "An owner whose members are provisioned by their identity provider.",
          set: { ssoBeta: "on" },
          checks: ["SSO-managed members can't be removed", "It's clear why"],
          origin: "code-only",
        },
      ],
    },
    {
      id: "loading-errors",
      title: "Loading & errors",
      why: "Async states inside the page that designs rarely draw.",
      tone: "system",
      items: [
        {
          kind: "state",
          id: "members-loading",
          title: "Members list loading",
          why: "An owner on a slow connection opening the page.",
          set: { membersRequest: "loading" },
          checks: ["No layout shift when the list arrives", "Seat count doesn't show a wrong number"],
          origin: "code-only",
        },
        {
          kind: "state",
          id: "invite-duplicate",
          title: "Invite rejected: already on the team",
          why: "An owner inviting someone who's already a member.",
          set: { inviteDraft: "filled", inviteRequest: "duplicate-error" },
          checks: ["Error is tied to the email field", "Typing clears it"],
          origin: "design",
        },
        {
          kind: "state",
          id: "remove-failed",
          title: "Remove failed",
          why: "An owner removing someone when the request times out.",
          set: { removeRequest: "error" },
          checks: ["The error names who wasn't removed", "Try again works"],
          origin: "code-only",
        },
      ],
    },
    {
      id: "long-content",
      title: "Long content",
      why: "Real data at its largest.",
      tone: "data",
      items: [
        {
          kind: "state",
          id: "many-long",
          title: "40 members with long names",
          why: "An owner of a large team scanning the list, including people with long names, long emails and no name at all.",
          set: { members: "many-long" },
          checks: ["Long emails wrap instead of overflowing", "Rows stay aligned"],
          origin: "design",
        },
      ],
    },
    {
      id: "breakpoints",
      title: "Breakpoints",
      why: "Where the layout reflows.",
      tone: "data",
      items: [
        {
          kind: "state",
          id: "mobile",
          title: "Typical team on a phone",
          why: "An owner checking pending invites from their phone, at 375 px.",
          set: { breakpoint: "mobile" },
          origin: "design",
        },
      ],
    },
    {
      id: "nearby",
      title: "Nearby features",
      why: "Unchanged parts of the page the change could break.",
      tone: "nearby",
      items: [
        {
          kind: "state",
          id: "seat-count-after-invite",
          title: "Seat count after an invite",
          why: "An owner checking the bill right after inviting someone.",
          set: { inviteRequest: "success" },
          checks: ["Subscription card counts the new pending invite"],
          origin: "design",
        },
      ],
    },
  ],
  uncovered: ["Viewer on a Free team at its seat limit", "Member with the SSO beta on", "Phone while the members list loads"],
  excluded: ["Free plan with the SSO beta on (SSO is Pro-only)"],
};
