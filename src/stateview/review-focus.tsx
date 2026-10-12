"use client";

import { CommentLayer } from "./comment-layer";
import { FocusView } from "./focus-view";
import type { Review } from "./review";

/**
 * One review's focus view with Stateview's comment engine. A client
 * component, because the review's render function can't cross from the
 * server; the generated route imports the review registry on the client.
 */
export function ReviewFocus({ review, hubHref }: { review: Review; hubHref: string }) {
  return <FocusView manifest={review.manifest} render={review.render} annotationLayer={CommentLayer} hubHref={hubHref} thumbnails={review.thumbnails} />;
}
