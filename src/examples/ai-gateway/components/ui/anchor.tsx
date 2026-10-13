"use client";

import type { ComponentProps } from "react";
import { useInThumbnail } from "@/stateview/in-thumbnail";

/**
 * A link that turns into a plain span inside a hub thumbnail: the hub wraps
 * each thumbnail in its own link, and a link can't contain another one.
 */
export function Anchor({ href, target, rel, ...props }: ComponentProps<"a">) {
  const still = useInThumbnail();
  if (still) return <span {...(props as ComponentProps<"span">)} />;
  return <a href={href} target={target} rel={rel} {...props} />;
}
