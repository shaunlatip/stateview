import { createCn } from "cn/config";

/**
 * Class merging that knows the screen's prefixed Geist utilities
 * (ai-gateway.css). Without this, `text-gw-copy-13` reads as a text colour,
 * so merging it with `text-gw-gray-1000` silently drops the size (and the
 * weight and tracking that come with it).
 */
export const cn = createCn({
  extend: {
    theme: {
      radius: ["gw-sm", "gw-md", "gw-lg", "gw-xl"],
    },
    classGroups: {
      "font-size": [
        {
          text: [
            "gw-heading-24",
            "gw-heading-20",
            "gw-heading-16",
            "gw-heading-14",
            "gw-label-13",
            "gw-label-12",
            "gw-copy-14",
            "gw-copy-13",
            "gw-copy-13-mono",
            "gw-button-14",
            "gw-agent-14",
            "gw-11",
            "gw-10-5",
            "gw-emoji-16",
            "gw-emoji-10",
          ],
        },
      ],
    },
  },
});
