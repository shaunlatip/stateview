import { Suspense } from "react";
import { membersManifest } from "@/sample-app/manifest";
import { findFrameIndex, listFrames } from "@/stateview/manifest";
import { MembersReview } from "./members-review";

// Build fix for the deployed snapshot: the page awaits searchParams outside Suspense.
export const instant = false;

/*
 * The state comes from `?sv=`, which is only known per request. While the
 * viewer loads, the fallback carries the state's title, so arriving from the
 * hub never leaves the tab blank; once mounted, FocusView renders the same
 * title and keeps it current as the reviewer steps. Titles are React <title>s
 * rather than Next metadata, which Next re-applies on each navigation over
 * the viewer's own.
 */
export default async function MembersPage({ searchParams }: PageProps<"/app/members">) {
  const { sv, step } = await searchParams;
  const frames = listFrames(membersManifest);
  const frame = frames[findFrameIndex(frames, typeof sv === "string" ? sv : null, typeof step === "string" ? Number(step) : null)];
  return (
    <Suspense fallback={<title>{frame ? `${frame.item.title} · Stateview` : "Stateview"}</title>}>
      <MembersReview />
    </Suspense>
  );
}
