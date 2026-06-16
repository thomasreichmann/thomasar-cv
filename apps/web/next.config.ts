import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @thomasar-cv/db exports raw TypeScript (no build step), so Next has to
  // transpile it like first-party source.
  transpilePackages: ["@thomasar-cv/db"],
};

export default nextConfig;
