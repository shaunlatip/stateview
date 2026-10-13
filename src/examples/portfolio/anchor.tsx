"use client";

import type { ComponentProps } from "react";
import { useInThumbnail } from "@/stateview/in-thumbnail";

/**
 * A link that turns into a plain span inside a thumbnail: the hub and the
 * filmstrip wrap each thumbnail in their own link, and a link can't contain
 * another one.
 */
export function Anchor({ href, target, rel, onClick, ref, children, ...rest }: ComponentProps<"a">) {
  const inThumbnail = useInThumbnail();
  if (inThumbnail) return <span {...(rest as ComponentProps<"span">)}>{children}</span>;
  return (
    <a href={href} target={target} rel={rel} onClick={onClick} ref={ref} {...rest}>
      {children}
    </a>
  );
}
