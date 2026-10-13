import type { ComponentProps } from "react";

/*
 * Stateview's mark: three stacked cards, the front one filled. Drawn in
 * currentColor so it follows the scheme it sits in.
 */
const CARDS = (
  <>
    <path
      d="M 10.57,26.21 H 9.09 C 8.44,26.21 7.92,25.69 7.92,25.05 V 16.81 C 7.92,16.17 8.44,15.65 9.09,15.65 H 21.5 C 22.14,15.65 22.64,16.17 22.64,16.81 V 18.03"
      stroke="currentColor"
      strokeWidth="1.41176"
    />
    <path
      d="M 14.22,29.61 H 12.66 C 12.01,29.61 11.56,29.13 11.56,28.48 V 20.25 C 11.56,19.60 12.02,19.12 12.65,19.12 H 25.12 C 25.75,19.12 26.29,19.59 26.29,20.23 V 21.54"
      stroke="currentColor"
      strokeWidth="1.41176"
    />
    <path
      d="M 28.99,33.51 H 16.14 C 15.26,33.51 14.54,32.79 14.54,31.91 V 23.51 C 14.54,22.63 15.26,21.91 16.14,21.91 H 28.99 C 29.87,21.91 30.59,22.63 30.59,23.51 V 31.91 C 30.59,32.79 29.87,33.51 28.99,33.51 Z"
      fill="currentColor"
    />
  </>
);


/**
 * The cards mark. Where the name is needed it's set as text beside it, in the
 * UI face. Decorative: the link or heading around it carries the name.
 */
export function Logo(props: ComponentProps<"svg">) {
  return (
    <svg aria-hidden viewBox="7 14.5 24.3 19.5" fill="none" {...props}>
      {CARDS}
    </svg>
  );
}
