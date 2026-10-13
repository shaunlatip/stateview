import { REVIEWS } from "@/examples/reviews";
import { SHADER_LAB_STATUS_PATH, shaderLabManifest, shaderLabStatus } from "@/examples/shader-lab/manifest";
import { ShaderLabScreen } from "@/examples/shader-lab/shader-lab-screen";
import { parseShaderLabState } from "@/examples/shader-lab/state";
import { Hub } from "@/stateview/hub";
import { listFrames } from "@/stateview/manifest";

export default function ShaderLabHubPage() {
  const thumbnails: Record<string, React.ReactNode> = {};
  for (const frame of listFrames(shaderLabManifest)) {
    thumbnails[frame.item.id] ??= <ShaderLabScreen state={parseShaderLabState(frame.inputs)} />;
  }
  return (
    <>
      {/* A React <title>, like the viewer's, so the tab changes in the same render as the page (see app/app/shader-lab/page.tsx). */}
      <title>Stateview</title>
      <Hub manifest={shaderLabManifest} thumbnails={thumbnails} reviews={REVIEWS} agentStatus={shaderLabStatus} statusPath={SHADER_LAB_STATUS_PATH} />
    </>
  );
}
