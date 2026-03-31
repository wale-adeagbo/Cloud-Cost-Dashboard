import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@aws-sdk/client-cost-explorer"],
  /** Avoid picking a parent lockfile when multiple exist under $HOME. */
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
