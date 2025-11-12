import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img-global-jp.cpcdn.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
