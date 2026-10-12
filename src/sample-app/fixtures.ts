import type { MembersState } from "./state";

/**
 * Canned API responses for the Team members screen. Values a production
 * account could have: no lorem ipsum, no $0, no impossible counts.
 */

export type Role = "owner" | "member" | "viewer";

export type Member = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  /** Provisioned by the identity provider; only meaningful when the SSO beta is on. */
  sso: boolean;
  isYou: boolean;
};

export type Invite = {
  id: string;
  email: string;
  role: Role;
  sentAgo: string;
};

export const TEAM_NAME = "Halcyon";
export const FREE_SEAT_LIMIT = 5;
export const PRO_PRICE_PER_SEAT = 20;

const you = (role: Role): Member => ({
  id: "m-you",
  name: "Sam Okafor",
  email: "sam@halcyon.dev",
  role,
  sso: false,
  isYou: true,
});

const team: Omit<Member, "isYou">[] = [
  { id: "m-priya", name: "Priya Raman", email: "priya@halcyon.dev", role: "owner", sso: false },
  { id: "m-daniel", name: "Daniel Kim", email: "daniel.kim@halcyon.dev", role: "member", sso: true },
  { id: "m-lucia", name: "Lucía Fernández", email: "lucia@halcyon.dev", role: "member", sso: true },
  { id: "m-tomas", name: "Tomás Novak", email: "tomas@halcyon.dev", role: "viewer", sso: false },
  { id: "m-aisha", name: "Aisha Bello", email: "aisha.bello@halcyon.dev", role: "member", sso: true },
];

const longNames: [string | null, string][] = [
  ["Maximiliana Alejandra Fernández-Castellanos de la Vega", "maximiliana.fernandez-castellanos@halcyon.dev"],
  ["Wolfgang Bartholomew Oppenheimer-Schwarzenberg", "wolfgang.oppenheimer-schwarzenberg@halcyon.dev"],
  [null, "christopher.alexander.montgomery-worthington@halcyon-research-laboratories.dev"],
  ["Nguyễn Thị Phương Thảo", "phuong.thao.nguyen@halcyon.dev"],
  ["Oluwaseun Adebayo-Ogunleye", "oluwaseun.adebayo-ogunleye@halcyon.dev"],
  [null, "ops-oncall-rotation-primary@halcyon.dev"],
  ["Anastasia Konstantinovna Vasilyeva-Romanova", "a.vasilyeva-romanova@halcyon.dev"],
];

const firstNames = ["Mei", "Jonas", "Amara", "Rafael", "Ingrid", "Kofi", "Leila", "Mateo", "Hana", "Ravi", "Zoe", "Emeka", "Sofia", "Arjun", "Noor", "Felix"];
const lastNames = ["Tanaka", "Lindqvist", "Okonkwo", "Silva", "Berg", "Mensah", "Haddad", "Rossi", "Sato", "Iyer", "Laurent", "Eze", "Moreau", "Kapoor", "Aziz", "Weber"];
const roles: Role[] = ["member", "member", "viewer", "member", "owner", "member", "viewer"];

function manyMembers(): Omit<Member, "isYou">[] {
  const long = longNames.map(([name, email], i) => ({ id: `m-long-${i}`, name, email, role: roles[i % roles.length], sso: i % 3 === 0 }));
  const regular = Array.from({ length: 39 - long.length }, (_, i) => {
    const first = firstNames[i % firstNames.length];
    const last = lastNames[(i * 5) % lastNames.length];
    return {
      id: `m-reg-${i}`,
      name: `${first} ${last}`,
      email: `${first}.${last}@halcyon.dev`.toLowerCase(),
      role: roles[(i + 3) % roles.length],
      sso: i % 4 === 1,
    };
  });
  return [...long, ...regular];
}

export function membersFor(state: Pick<MembersState, "members" | "role">): Member[] {
  const others = {
    one: [],
    typical: team,
    "at-limit": team.slice(0, FREE_SEAT_LIMIT - 1),
    "many-long": manyMembers(),
  }[state.members];
  return [you(state.role), ...others.map((member) => ({ ...member, isYou: false }))];
}

export function invitesFor(state: Pick<MembersState, "invites">): Invite[] {
  if (state.invites === "none") return [];
  return [
    { id: "i-marcus", email: "marcus.chen@halcyon.dev", role: "member", sentAgo: "2 days ago" },
    { id: "i-elena", email: "elena.rossi@halcyon.dev", role: "viewer", sentAgo: "5 days ago" },
  ];
}

/** What the invite form holds when a state starts with it filled in. */
export const DRAFT_INVITE = { email: "hana.sato@halcyon.dev", role: "member" as Role };
/** An address the API rejects because it already belongs to a member. */
export const DUPLICATE_INVITE = { email: "daniel.kim@halcyon.dev", role: "member" as Role };
/** The member whose removal failed in the remove-error state. */
export const FAILED_REMOVAL_ID = "m-daniel";
