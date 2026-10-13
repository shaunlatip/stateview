import { Suspense } from "react";
import { PortfolioReview } from "./portfolio-review";

/* The state comes from `?sv=`, known only per request; see app/app/members/page.tsx for the title handling. */
export default function PortfolioPage() {
  return (
    <Suspense fallback={<title>Stateview</title>}>
      <PortfolioReview />
    </Suspense>
  );
}
