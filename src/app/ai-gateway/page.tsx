import { GATEWAY_STATUS_PATH, gatewayManifest, gatewayStatus } from "@/examples/ai-gateway/manifest";
import { AiGatewayScreen } from "@/examples/ai-gateway/screen";
import { parseGatewayState } from "@/examples/ai-gateway/state";
import { REVIEWS } from "@/examples/reviews";
import { Hub } from "@/stateview/hub";
import { listFrames } from "@/stateview/manifest";

export default function AiGatewayHubPage() {
  const thumbnails: Record<string, React.ReactNode> = {};
  for (const frame of listFrames(gatewayManifest)) {
    thumbnails[frame.item.id] ??= <AiGatewayScreen state={parseGatewayState(frame.inputs)} />;
  }
  return (
    <>
      {/* A React <title>, like the viewer's, so the tab changes in the same render as the page (see app/app/ai-gateway/page.tsx). */}
      <title>Stateview</title>
      <Hub manifest={gatewayManifest} thumbnails={thumbnails} reviews={REVIEWS} agentStatus={gatewayStatus} statusPath={GATEWAY_STATUS_PATH} />
    </>
  );
}
