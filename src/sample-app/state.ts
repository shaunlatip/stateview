/**
 * Every input the Team members screen reads, in one place. The screen is a
 * pure function of this object: the boundary where Stateview injects state.
 * Values are listed in the order a reviewer reads them (smallest to largest,
 * off before on); the manifest's baseline says which one is the default.
 */
export const membersInputValues = {
  role: ["owner", "member", "viewer"],
  plan: ["free", "pro"],
  ssoBeta: ["off", "on"],
  members: ["one", "typical", "at-limit", "many-long"],
  invites: ["none", "some"],
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
