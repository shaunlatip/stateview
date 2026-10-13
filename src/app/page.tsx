import { REVIEWS } from "@/examples/reviews";
import { MEMBERS_STATUS_PATH, membersManifest, membersStatus } from "@/sample-app/manifest";
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
      {/* A React <title>, like the viewer's, so the tab changes in the same render as the page (see app/app/members/page.tsx). */}
      <title>Stateview</title>
      <Hub manifest={membersManifest} thumbnails={thumbnails} reviews={REVIEWS} agentStatus={membersStatus} statusPath={MEMBERS_STATUS_PATH} />
    </>
  );
}
