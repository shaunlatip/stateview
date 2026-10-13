import Link from "next/link";
import type { ReactNode } from "react";
import { parseAgentStatus, type AgentStatus } from "./agent-status";
import { Hub, type ReviewLink } from "./hub";
import { listFrames, listItems, type Inputs, type Manifest } from "./manifest";
import { ThemeScope } from "./ui";

/**
 * What the `/stateview` skill writes for each screen it reviews: the manifest
 * (JSON, checked by `check.mjs`) and the boundary that renders the real screen
 * from a state's inputs. The generated routes take it from there.
 */
export type Review = {
  manifest: Manifest;
  render: (inputs: Inputs) => ReactNode;
  /** "off" for screens that can't render many live copies at once (WebGL maps, video). */
  thumbnails: "live" | "off";
  /** What the coding agent reported per comment, from the review's status.json. */
  agentStatus: AgentStatus;
  /** Where that file is, from the app's root, for the copied prompt to name. */
  statusPath?: string;
};

/**
 * Pairs a manifest with its render function. `T` types the render function
 * against the screen's own state; the result is untyped so every review fits
 * one registry. The manifest is typed loosely because it comes from JSON; the
 * checker is what guarantees its shape. `status` is the imported status.json,
 * so the agent writing it hot-reloads into the open review.
 */
export function defineReview<T extends Inputs>(
  manifest: object,
  render: (inputs: T) => ReactNode,
  options: { thumbnails?: "live" | "off"; status?: object; statusPath?: string } = {},
): Review {
  return {
    manifest: manifest as Manifest,
    render: render as Review["render"],
    thumbnails: options.thumbnails ?? "live",
    agentStatus: parseAgentStatus(options.status),
    statusPath: options.statusPath,
  };
}

/**
 * The hub for one review, with a live thumbnail per state unless the review
 * turns them off. `scope` replaces the manifest's recorded one (`readScope`
 * from `scope.ts` reads it from git), and `reviews` puts a switcher in the
 * index when the app has more than one.
 */
export function ReviewHub({ review, scope, reviews }: { review: Review; scope?: Manifest["scope"]; reviews?: ReviewLink[] }) {
  const thumbnails: Record<string, ReactNode> = {};
  if (review.thumbnails === "live") {
    for (const frame of listFrames(review.manifest)) {
      thumbnails[frame.item.id] ??= review.render(frame.inputs);
    }
  }
  const manifest = scope ? { ...review.manifest, scope } : review.manifest;
  return <Hub manifest={manifest} thumbnails={thumbnails} reviews={reviews} agentStatus={review.agentStatus} statusPath={review.statusPath} />;
}

/** The switcher's entries for every review in a registry, each labelled with its screen. */
export function reviewLinks(reviews: Record<string, Review>, basePath: string): ReviewLink[] {
  return Object.values(reviews).map(({ manifest }) => ({ id: manifest.id, label: manifest.screen, hub: `${basePath}/${manifest.id}` }));
}

/** Every review in the app, for when a change touches more than one screen. */
export function ReviewIndex({ reviews, basePath }: { reviews: Review[]; basePath: string }) {
  return (
    <ThemeScope as="main" className="flex-1 bg-gui-neutral-1">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-gui-xl px-gui-m py-gui-xl sm:px-gui-xl">
        <header className="flex flex-col gap-gui-xs">
          <p className="font-gui-brand font-gui-brand-heavy">Stateview</p>
          <h1 className="font-gui-brand text-gui-l font-gui-brand-heavy text-balance">Reviews</h1>
        </header>
        {reviews.length === 0 ? (
          <p className="max-w-prose text-gui-neutral-7">
            No reviews yet. Run <code className="font-gui-data text-gui-neutral-10">/stateview</code> in your coding agent to
            create one for the current branch.
          </p>
        ) : (
          <ul className="flex flex-col">
            {reviews.map(({ manifest }) => (
              <li key={manifest.id} className="gui-divider-top relative flex flex-col gap-gui-xxs py-gui-m">
                <h2 className="font-gui-medium">
                  <Link
                    href={`${basePath}/${manifest.id}`}
                    className="rounded-gui-s outline-none after:absolute after:inset-0 focus-visible:gui-focus-ring"
                  >
                    {manifest.screen}
                  </Link>
                </h2>
                <p className="text-gui-s text-gui-neutral-7 tabular-nums">
                  <code className="font-gui-data">{manifest.scope.branch}</code>
                  {manifest.scope.base ? (
                    <>
                      {" "}
                      against <code className="font-gui-data">{manifest.scope.base}</code>
                    </>
                  ) : null}{" "}
                  · {listItems(manifest).length} states in{" "}
                  {manifest.sections.length} sections
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ThemeScope>
  );
}
