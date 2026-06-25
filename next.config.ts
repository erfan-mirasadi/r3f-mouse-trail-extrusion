import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS || false;
let basePath = isGithubActions ? "/r3f-mouse-trail-extrusion" : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath,
};

export default nextConfig;
