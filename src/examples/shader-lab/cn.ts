import { createCn } from "cn/config";

/**
 * Class merging that knows Shader Lab's own theme utilities (shader-lab.css).
 * Without this, tailwind-merge reads `text-sl-13` as a text colour and drops
 * it next to `text-sl-text`, and reads `shadow-sl-2` as a shadow colour.
 */
export const cn = createCn({
  extend: {
    theme: {
      text: ["sl-xs", "sl-sm", "sl-10", "sl-11", "sl-12", "sl-13", "sl-15"],
      radius: ["sl-control", "sl-card", "sl-frame", "sl-item", "sl-swatch", "sl-print", "sl-toast"],
      shadow: ["sl-1", "sl-2", "sl-3", "sl-5", "sl-toast"],
    },
    classGroups: {
      "font-family": [{ font: ["sl-lab", "sl-logo"] }],
    },
  },
});
