import type { Manifest } from "@/stateview/manifest";
import type { MembersState } from "./state";
import review from "./review.json";

/**
 * The review for `feat/member-management`, written by applying the
 * composition rules in `skills/stateview/references/composition.md`: a
 * realistic baseline first, one question per state, one or two inputs changed
 * from the baseline, only combinations a real account can be in, and an honest
 * list of what isn't covered. It is the same JSON the `/stateview` skill
 * writes, and `npm run check:states` validates it.
 */
export const membersManifest = review as Manifest<MembersState>;
