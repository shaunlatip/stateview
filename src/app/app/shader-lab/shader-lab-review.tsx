"use client";

import { SHADER_LAB_STATUS_PATH, shaderLabManifest, shaderLabStatus } from "@/examples/shader-lab/manifest";
import { ShaderLabScreen } from "@/examples/shader-lab/shader-lab-screen";
import { parseShaderLabState } from "@/examples/shader-lab/state";
import { CommentLayer } from "@/stateview/comment-layer";
import { FocusView } from "@/stateview/focus-view";

export function ShaderLabReview() {
  return (
    <FocusView
      manifest={shaderLabManifest}
      render={(inputs) => <ShaderLabScreen state={parseShaderLabState(inputs)} />}
      annotationLayer={CommentLayer}
      agentStatus={shaderLabStatus}
      statusPath={SHADER_LAB_STATUS_PATH}
    />
  );
}
