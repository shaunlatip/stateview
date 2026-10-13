import { Suspense } from "react";
import { ShaderLabReview } from "./shader-lab-review";

/*
 * The state comes from `?sv=`, which is only known per request. While the
 * viewer loads, the fallback keeps the tab on "Stateview", the hub's title;
 * once mounted, FocusView renders the state's title (see app/app/members).
 */
export default function ShaderLabPage() {
  return (
    <Suspense fallback={<title>Stateview</title>}>
      <ShaderLabReview />
    </Suspense>
  );
}
