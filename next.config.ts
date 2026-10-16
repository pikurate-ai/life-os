import type { NextConfig } from 'next';

const isGithubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BASE_PATH: isGithubPages ? '/life-os' : '' },
  output: 'export',
  basePath: isGithubPages ? '/life-os' : '',
  assetPrefix: isGithubPages ? '/life-os' : '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
