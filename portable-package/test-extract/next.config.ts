import type { NextConfig } from "next";

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(basePath ? { basePath } : {}),
  async redirects() {
    return [
      { source: "/app", destination: "/realtyos", permanent: false },
      { source: "/app/:path*", destination: "/realtyos/:path*", permanent: false },
      { source: "/admin/login", destination: "/realtyos/admin/login", permanent: false },
      { source: "/login", destination: "/realtyos/admin/login", permanent: false },
    ];
  },
  async rewrites() {
    return [
      { source: "/realtyos/admin/login", destination: "/admin/login" },
      { source: "/realtyos/api/:path*", destination: "/api/:path*" },
      { source: "/realtyos/owner/:path*", destination: "/owner/:path*" },
      { source: "/realtyos/tenant/:path*", destination: "/tenant/:path*" },
      { source: "/realtyos/app/:path*", destination: "/app/:path*" },
      { source: "/realtyos", destination: "/app" },
      { source: "/realtyos/:path*", destination: "/app/:path*" },
    ];
  },
};

export default nextConfig;
