"use client";

import { membersManifest } from "@/sample-app/manifest";
import { MembersScreen } from "@/sample-app/members-screen";
import { parseMembersState } from "@/sample-app/state";
import { CommentLayer } from "@/stateview/comment-layer";
import { ViewerVariants } from "@/variants/viewer-variants";

export function MembersReview() {
  return (
    <ViewerVariants
      manifest={membersManifest}
      render={(inputs) => <MembersScreen state={parseMembersState(inputs)} />}
      annotationLayer={CommentLayer}
    />
  );
}
