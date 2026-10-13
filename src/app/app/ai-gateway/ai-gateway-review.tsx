"use client";

import { GATEWAY_STATUS_PATH, gatewayManifest, gatewayStatus } from "@/examples/ai-gateway/manifest";
import { AiGatewayScreen } from "@/examples/ai-gateway/screen";
import { parseGatewayState } from "@/examples/ai-gateway/state";
import { CommentLayer } from "@/stateview/comment-layer";
import { FocusView } from "@/stateview/focus-view";

export function AiGatewayReview() {
  return (
    <FocusView
      manifest={gatewayManifest}
      render={(inputs) => <AiGatewayScreen state={parseGatewayState(inputs)} />}
      annotationLayer={CommentLayer}
      agentStatus={gatewayStatus}
      statusPath={GATEWAY_STATUS_PATH}
    />
  );
}
