import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**.supabase.co",
            },
        ],
    },
    // Fix for workspace root detection on server
    outputFileTracingRoot: process.env.NODE_ENV === 'production' ? '/root/marketing-fairy' : undefined,
};

export default nextConfig;
