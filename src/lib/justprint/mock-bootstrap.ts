import { CATALOG_BIKES } from "@/data/bikes";
import { DESIGNS } from "@/data/designs";
import { LOGO_CATEGORIES, LOGO_LIBRARY } from "@/data/logos";
import { getTenantConfig } from "@/tenants";
import type { StorefrontBootstrap } from "@/types/justprint";

/**
 * Builds the mock StorefrontBootstrap for a given shop.
 * Visual components must not import @/data/* directly — they consume this via the client.
 *
 * RawMoto is the first configured tenant and reuses the existing local catalog
 * (bikes, designs, logo categories, 2D/3D options).
 */
export function buildMockStorefrontBootstrap(
  shopId: string,
): StorefrontBootstrap {
  const tenant = getTenantConfig(shopId);

  if (!tenant || tenant.id !== "rawmoto") {
    throw new Error(
      `Mock catalog is not available for shop "${shopId}". Only "rawmoto" is seeded locally.`,
    );
  }

  return {
    shop: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.id,
    },
    bikes: CATALOG_BIKES.map((bike) => ({ ...bike })),
    designs: DESIGNS.map((design) => ({ ...design })),
    logoCategories: LOGO_CATEGORIES.map((category) => ({ ...category })),
    logos: LOGO_LIBRARY.map((logo) => ({ ...logo })),
  };
}
