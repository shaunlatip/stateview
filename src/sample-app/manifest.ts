import { parseAgentStatus } from "@/stateview/agent-status";
import type { Manifest } from "@/stateview/manifest";
import type { MembersState } from "./state";
import review from "./review.json";
import status from "./status.json";

/**
 * The review for `feat/member-management`, written by applying the
 * composition rules in `skills/stateview/references/composition.md`: a
 * realistic baseline first, one question per state, one or two inputs changed
 * from the baseline, and only combinations a real account can be in. It is
 * the same JSON the `/stateview` skill writes, and `npm run check:states`
 * validates it.
 */
export const membersManifest = review as Manifest<MembersState>;

/**
 * What a coding agent reported doing with the review's comments. The copied
 * prompt tells the agent to write this file; importing it here means an edit
 * hot-reloads into the open viewer and its frame.
 */
export const membersStatus = parseAgentStatus(status);
export const MEMBERS_STATUS_PATH = "src/sample-app/status.json";
