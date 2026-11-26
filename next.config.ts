import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "11mb",
    },
  },
  async headers() {
    const noCacheHeaders = [
      {
        key: "Cache-Control",
        value: "no-cache, no-store, must-revalidate",
      },
    ];

    return [
      {
        source: "/manifest.webmanifest",
        headers: noCacheHeaders,
      },
      {
        source: "/sw.js",
        headers: [
          ...noCacheHeaders,
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
      {
        source: "/:path((?!.*\\.[^/]+$).*)",
        headers: noCacheHeaders,
      },
    ];
  },
};

export default nextConfig;
