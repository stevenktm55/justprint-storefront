import type { NextConfig } from "next";
import { buildStorefrontContentSecurityPolicy } from "./src/lib/storefront-frame-ancestors";

/**
 * Headers CSP pour iframe embedding sur les sites boutique.
 * Do not set X-Frame-Options: DENY or SAMEORIGIN — that would block Shopify embeds.
 *
 * Note: CSP does not support `localhost:*` port wildcards — list known local ports in development.
 * Source unique des origines : `src/lib/storefront-frame-ancestors.ts`.
 */
const nextConfig: NextConfig = {
  async headers() {
    const csp = buildStorefrontContentSecurityPolicy();

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
