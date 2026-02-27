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
    serverExternalPackages: [
        "puppeteer-extra",
        "puppeteer-extra-plugin-stealth",
    ],
};

export default nextConfig;
