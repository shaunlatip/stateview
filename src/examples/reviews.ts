/**
 * Every review this deployment carries, for the switcher at the foot of the
 * hub's index. Each one is a manifest with its own hub and review routes; this
 * list holds only what the switcher shows, so it doesn't pull every screen
 * into the hub's bundle.
 */
export type ReviewLink = {
  /** The manifest's id. */
  id: string;
  /** The app and the screen, as the switcher shows them. */
  label: string;
  /** The review's hub route (the manifest's `hub`). */
  hub: string;
};

export const REVIEWS: ReviewLink[] = [
  { id: "team-members", label: "Halcyon · Team members", hub: "/" },
  { id: "portfolio-home", label: "Portfolio · Home", hub: "/portfolio" },
  { id: "ai-gateway-setup", label: "AI Gateway · Setup", hub: "/ai-gateway" },
  { id: "shader-lab-onboarding", label: "Shader Lab · Onboarding", hub: "/shader-lab" },
];
