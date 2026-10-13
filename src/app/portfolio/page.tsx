import { REVIEWS } from "@/examples/reviews";
import { PortfolioScreen } from "@/examples/portfolio/home-screen";
import { PORTFOLIO_STATUS_PATH, portfolioManifest, portfolioStatus } from "@/examples/portfolio/manifest";
import { parsePortfolioState } from "@/examples/portfolio/state";
import { Hub } from "@/stateview/hub";
import { listFrames } from "@/stateview/manifest";

export default function PortfolioHubPage() {
  const thumbnails: Record<string, React.ReactNode> = {};
  for (const frame of listFrames(portfolioManifest)) {
    thumbnails[frame.item.id] ??= <PortfolioScreen state={parsePortfolioState(frame.inputs)} />;
  }
  return (
    <>
      {/* A React <title>, like the viewer's, so the tab changes in the same render as the page (see app/app/members/page.tsx). */}
      <title>Stateview</title>
      <Hub manifest={portfolioManifest} thumbnails={thumbnails} reviews={REVIEWS} agentStatus={portfolioStatus} statusPath={PORTFOLIO_STATUS_PATH} />
    </>
  );
}
