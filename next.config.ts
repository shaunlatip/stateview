import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The viewer and the app it frames are both Next pages, so the indicator would show twice. Errors still surface.
  devIndicators: false,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
