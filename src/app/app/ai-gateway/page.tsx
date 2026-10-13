import { Suspense } from "react";
import { AiGatewayReview } from "./ai-gateway-review";

/*
 * The state comes from `?sv=`, which is only known per request. While the
 * viewer loads, the fallback keeps the tab on "Stateview", the hub's title;
 * once mounted, FocusView renders the state's title and keeps it current.
 */
export default function AiGatewayPage() {
  return (
    <Suspense fallback={<title>Stateview</title>}>
      <AiGatewayReview />
    </Suspense>
  );
}
