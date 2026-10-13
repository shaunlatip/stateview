"use client";

import { PortfolioScreen } from "@/examples/portfolio/home-screen";
import { portfolioManifest } from "@/examples/portfolio/manifest";
import { parsePortfolioState } from "@/examples/portfolio/state";
import { CommentLayer } from "@/stateview/comment-layer";
import { FocusView } from "@/stateview/focus-view";

export function PortfolioReview() {
  return (
    <FocusView
      manifest={portfolioManifest}
      render={(inputs) => <PortfolioScreen state={parsePortfolioState(inputs)} />}
      annotationLayer={CommentLayer}
    />
  );
}
