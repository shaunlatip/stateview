import { Suspense } from "react";
import { MembersReview } from "./members-review";

// The state comes from `?sv=`, which is only known per request.
export default function MembersPage() {
  return (
    <Suspense>
      <MembersReview />
    </Suspense>
  );
}
