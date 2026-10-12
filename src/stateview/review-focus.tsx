"use client";

import { AgentationLayer } from "./agentation-layer";
import { FocusView } from "./focus-view";
import type { Review } from "./review";

/**
 * One review's focus view with the default comment engine. A client
 * component, because the review's render function can't cross from the
 * server; the generated route imports the review registry on the client.
 */
export function ReviewFocus({ review, hubHref }: { review: Review; hubHref: string }) {
  return <FocusView manifest={review.manifest} render={review.render} annotationLayer={AgentationLayer} hubHref={hubHref} />;
}
