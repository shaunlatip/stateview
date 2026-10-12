import { FeedbackToolbar } from "@/components/dev/feedback-toolbar";
import { membersManifest } from "@/sample-app/manifest";
import { MembersScreen } from "@/sample-app/members-screen";
import { parseMembersState } from "@/sample-app/state";
import { Hub } from "@/stateview/hub";
import { listFrames } from "@/stateview/manifest";

export default function HubPage() {
  const thumbnails: Record<string, React.ReactNode> = {};
  for (const frame of listFrames(membersManifest)) {
    thumbnails[frame.item.id] ??= <MembersScreen state={parseMembersState(frame.inputs)} />;
  }
  return (
    <>
      <Hub manifest={membersManifest} thumbnails={thumbnails} />
      {/* TEMPORARY: feedback on the hub while building; remove before the final build. */}
      <FeedbackToolbar />
    </>
  );
}
