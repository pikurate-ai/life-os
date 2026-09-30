import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath: isGithubPages ? "/life-os" : "",
  assetPrefix: isGithubPages ? "/life-os" : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
