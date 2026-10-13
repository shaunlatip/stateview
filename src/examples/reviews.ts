import type { ReviewLink } from "@/stateview/hub";

/**
 * Every review this deployment carries, for the switcher at the foot of the
 * hub's index. Each one is a manifest with its own hub and review routes; this
 * list holds only what the switcher shows, so it doesn't pull every screen
 * into the hub's bundle.
 */
export const REVIEWS: ReviewLink[] = [
  { id: "team-members", label: "Halcyon · Team members", hub: "/" },
  { id: "portfolio-home", label: "Portfolio · Home", hub: "/portfolio" },
  { id: "ai-gateway-setup", label: "AI Gateway · Setup", hub: "/ai-gateway" },
  { id: "shader-lab-onboarding", label: "Shader Lab · Onboarding", hub: "/shader-lab" },
  // Installed into Curio by the /stateview skill and served by Curio's own dev server, so it's listed in development only.
  ...(process.env.NODE_ENV === "development"
    ? [{ id: "search-wall", label: "Curio · Search (local)", hub: process.env.NEXT_PUBLIC_CURIO_REVIEW ?? "http://localhost:3101/stateview/search-wall" }]
    : []),
];
