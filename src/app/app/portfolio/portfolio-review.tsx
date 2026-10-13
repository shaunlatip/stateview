"use client";

import { PortfolioScreen } from "@/examples/portfolio/home-screen";
import { PORTFOLIO_STATUS_PATH, portfolioManifest, portfolioStatus } from "@/examples/portfolio/manifest";
import { parsePortfolioState } from "@/examples/portfolio/state";
import { CommentLayer } from "@/stateview/comment-layer";
import { FocusView } from "@/stateview/focus-view";

export function PortfolioReview() {
  return (
    <FocusView
      manifest={portfolioManifest}
      render={(inputs) => <PortfolioScreen state={parsePortfolioState(inputs)} />}
      annotationLayer={CommentLayer}
      agentStatus={portfolioStatus}
      statusPath={PORTFOLIO_STATUS_PATH}
    />
  );
}
