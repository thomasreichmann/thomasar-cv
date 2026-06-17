import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @thomasar-cv/* workspace packages export raw TypeScript (no build step), so
  // Next has to transpile them like first-party source.
  transpilePackages: ["@thomasar-cv/db", "@thomasar-cv/render"],
  // @react-pdf/renderer ships native-ish deps (yoga layout, fontkit) and only
  // ever runs server-side here (the preview renders the PDF in a server
  // component). Keeping it external means Next requires it at runtime instead of
  // bundling it, which avoids the bundler choking on those deps.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
