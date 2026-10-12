/**
 * Every input the Team members screen reads, in one place. The screen is a
 * pure function of this object: the boundary where Stateview injects state.
 * The first value of each list is the default.
 */
export const membersInputValues = {
  role: ["owner", "member", "viewer"],
  plan: ["pro", "free"],
  ssoBeta: ["off", "on"],
  members: ["typical", "one", "at-limit", "many-long"],
  invites: ["some", "none"],
  membersRequest: ["ready", "loading"],
  removeRequest: ["idle", "error"],
  inviteDraft: ["empty", "filled"],
  inviteRequest: ["idle", "submitting", "duplicate-error", "success"],
  breakpoint: ["desktop", "mobile"],
} as const;

type Values = typeof membersInputValues;

export type MembersState = { [K in keyof Values]: Values[K][number] };

export function parseMembersState(inputs: Record<string, string>): MembersState {
  const entries = Object.entries(membersInputValues).map(([key, values]) => {
    const value = inputs[key];
    return [key, (values as readonly string[]).includes(value) ? value : values[0]];
  });
  return Object.fromEntries(entries) as MembersState;
}
