"use client";

import { membersManifest } from "@/sample-app/manifest";
import { MembersScreen } from "@/sample-app/members-screen";
import { parseMembersState } from "@/sample-app/state";
import { CommentLayer } from "@/stateview/comment-layer";
import { FocusView } from "@/stateview/focus-view";

export function MembersReview() {
  return (
    <FocusView
      manifest={membersManifest}
      render={(inputs) => <MembersScreen state={parseMembersState(inputs)} />}
      annotationLayer={CommentLayer}
    />
  );
}
