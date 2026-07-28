/**
 * Origines autorisées pour l’intégration iframe multi-boutique.
 * Source unique — utilisée par `next.config.ts` (headers CSP).
 *
 * Ne pas confondre :
 * - `frame-ancestors` : qui peut intégrer ce Storefront
 * - `frame-src` : ce que ce Storefront peut charger (JustPrint)
 */

const STOREFRONT_SELF_HOSTS = [
  "https://justprint-storefront.vercel.app",
  "https://configurator.justprint.fr",
] as const;

/** RawMoto — vitrine + Shopify (prod / preview). */
const RAWMOTO_FRAME_ANCESTORS = [
  "https://rawmoto.fr",
  "https://www.rawmoto.fr",
  "https://26578d-f2.myshopify.com",
  "http://26578d-f2.myshopify.com",
  "https://u-b30092c2dcb74c9b9811eeea13e32906",
  "http://u-b30092c2dcb74c9b9811eeea13e32906",
] as const;

/** Origines JustPrint que le Storefront peut charger en iframe. */
export const JUSTPRINT_FRAME_SRC_ORIGINS = [
  "https://www.justprint.app",
  "https://justprint.app",
] as const;

/**
 * Liste `frame-ancestors` pour le Storefront embarqué dans les sites boutique.
 * Pas de `frame-ancestors *`.
 */
export function buildStorefrontFrameAncestors(): string {
  const ancestors = ["'self'", ...STOREFRONT_SELF_HOSTS, ...RAWMOTO_FRAME_ANCESTORS];

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

  // Déduplique en préservant l’ordre
  return [...new Set(ancestors)].join(" ");
}

/** CSP Storefront : frame-ancestors (embedding) + frame-src (charger JustPrint). */
export function buildStorefrontContentSecurityPolicy(): string {
  const frameAncestors = buildStorefrontFrameAncestors();
  const frameSrc = ["'self'", ...JUSTPRINT_FRAME_SRC_ORIGINS].join(" ");
  return `frame-ancestors ${frameAncestors}; frame-src ${frameSrc}`;
}
