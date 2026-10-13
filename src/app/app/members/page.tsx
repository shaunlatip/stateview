import { Suspense } from "react";
import { MembersReview } from "./members-review";

/*
 * The state comes from `?sv=`, which is only known per request. While the
 * viewer loads, the fallback keeps the tab on "Stateview", the hub's title,
 * so arriving from the hub never leaves it blank; once mounted, FocusView
 * renders the state's title and keeps it current as the reviewer steps.
 * Titles are React <title>s rather than Next metadata, which Next re-applies
 * on each navigation over the viewer's own.
 */
export default function MembersPage() {
  return (
    <Suspense fallback={<title>Stateview</title>}>
      <MembersReview />
    </Suspense>
  );
}
