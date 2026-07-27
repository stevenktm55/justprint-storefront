import type { NextConfig } from "next";

/**
 * frame-ancestors for iframe embedding on client shop sites.
 * Do not set X-Frame-Options: DENY or SAMEORIGIN — that would block Shopify embeds.
 *
 * Shopify preview / myshopify domains will be appended when confirmed.
 * Note: CSP does not support `localhost:*` port wildcards — list known local ports in development.
 */
function buildFrameAncestors(): string {
  const ancestors = [
    "'self'",
    "https://rawmoto.fr",
    "https://www.rawmoto.fr",
    // Future Shopify storefront / theme preview origins for RawMoto:
    // "https://rawmoto.myshopify.com",
  ];

  const appEnv = process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV;
  if (appEnv !== "production") {
    ancestors.push(
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:9292",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:9292",
    );
  }

  return ancestors.join(" ");
}

const nextConfig: NextConfig = {
  async headers() {
    const frameAncestors = buildFrameAncestors();

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${frameAncestors}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
