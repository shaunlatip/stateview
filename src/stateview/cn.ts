import { createCn } from "cn/config";

/**
 * Class merging that knows Stateview's theme utilities (theme.css). Without
 * this, `text-gui-xs` reads as a text color and `font-gui-ui` as a weight, so
 * merging them with a color or weight class silently drops the size or
 * family. Part of the engine, so a copy in another app doesn't depend on that
 * app's own `cn`, which wouldn't know these classes.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: ["gui-xxs", "gui-xs", "gui-s", "gui-m", "gui-l", "gui-xl", "gui-xxl"] }],
      "font-family": [{ font: ["gui-ui", "gui-brand", "gui-editorial", "gui-data"] }],
      "font-weight": [{ font: ["gui-regular", "gui-medium", "gui-heavy", "gui-brand-heavy"] }],
    },
  },
});
