import { Suspense } from "react";
import { membersManifest } from "@/sample-app/manifest";
import { MembersScreen } from "@/sample-app/members-screen";
import { parseMembersState } from "@/sample-app/state";
import { Hub } from "@/stateview/hub";
import { listFrames } from "@/stateview/manifest";
import { HubVariants } from "@/variants/hub-variants";

export default function HubPage() {
  const thumbnails: Record<string, React.ReactNode> = {};
  for (const frame of listFrames(membersManifest)) {
    thumbnails[frame.item.id] ??= <MembersScreen state={parseMembersState(frame.inputs)} />;
  }
  // The variant comes from the URL, which is only known per request.
  return (
    <>
      {/* A React <title>, like the viewer's, so the tab changes in the same render as the page (see app/app/members/page.tsx). */}
      <title>Stateview</title>
      <Suspense fallback={<Hub manifest={membersManifest} thumbnails={thumbnails} />}>
        <HubVariants manifest={membersManifest} thumbnails={thumbnails} />
      </Suspense>
    </>
  );
}
