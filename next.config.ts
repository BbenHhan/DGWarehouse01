import type { NextConfig } from "next";

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      ...(supabaseHostname
        ? [{ protocol: "https" as const, hostname: supabaseHostname, pathname: "/storage/v1/object/public/**" }]
        : []),
      // Google account profile photos, shown in the header's account menu
      // (specs/004-user-account-menu).
      { protocol: "https" as const, hostname: "lh3.googleusercontent.com" },
    ],
  },
  experimental: {
    // Default Server Action body limit (1MB) is far too small for video
    // uploads (Constitution VIII: size ceiling must admit real video files).
    serverActions: {
      bodySizeLimit: "300mb",
    },
  },
};

export default nextConfig;
