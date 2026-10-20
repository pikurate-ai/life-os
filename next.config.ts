import type { NextConfig } from 'next';
import { resolveBuildConfig } from './scripts/build-config.cjs';

const build = resolveBuildConfig();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  env: {
    NEXT_PUBLIC_BASE_PATH: build.basePath,
    NEXT_PUBLIC_LIFE_OS_PREVIEW: String(build.preview),
  },
  output: 'export',
  basePath: build.basePath,
  assetPrefix: build.basePath,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
