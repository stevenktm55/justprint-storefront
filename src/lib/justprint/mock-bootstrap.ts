import { CATALOG_BIKES } from "@/data/bikes";
import { DESIGNS } from "@/data/designs";
import { LOGO_CATEGORIES, LOGO_LIBRARY } from "@/data/logos";
import { getTenantConfig } from "@/tenants";
import type { StorefrontBootstrap, StorefrontColorLibrary } from "@/types/justprint";

/**
 * Builds the mock StorefrontBootstrap for a given shop.
 * Visual components must not import @/data/* directly — they consume this via the client.
 *
 * RawMoto is the first configured tenant and reuses the existing local catalog
 * (bikes, designs, logo categories, 2D/3D options).
 *
 * Color libraries / palettes here are MOCK-ONLY — remote mode never falls back to them.
 */
const MOCK_COLOR_LIBRARY: StorefrontColorLibrary = {
  id: "mock-rawmoto-colors",
  name: "Couleurs RawMoto",
  shopId: "rawmoto",
  active: true,
  displayOrder: 0,
  colors: [
    { id: "mock-orange", name: "Orange Raw", hex: "#FF5A00", displayOrder: 0, cmyk: { c: 0, m: 72, y: 100, k: 0 }, rgb: { r: 255, g: 90, b: 0 } },
    { id: "mock-black", name: "Noir Mat", hex: "#111111", displayOrder: 1, cmyk: { c: 0, m: 0, y: 0, k: 93 }, rgb: { r: 17, g: 17, b: 17 } },
    { id: "mock-white", name: "Blanc Pur", hex: "#FFFFFF", displayOrder: 2, cmyk: { c: 0, m: 0, y: 0, k: 0 }, rgb: { r: 255, g: 255, b: 255 } },
    { id: "mock-blue", name: "Bleu Racing", hex: "#0066FF", displayOrder: 3, cmyk: { c: 100, m: 60, y: 0, k: 0 }, rgb: { r: 0, g: 102, b: 255 } },
    { id: "mock-red", name: "Rouge Factory", hex: "#E10600", displayOrder: 4, cmyk: { c: 0, m: 97, y: 100, k: 12 }, rgb: { r: 225, g: 6, b: 0 } },
    { id: "mock-yellow", name: "Jaune Fluo", hex: "#F5E000", displayOrder: 5, cmyk: { c: 4, m: 0, y: 100, k: 4 }, rgb: { r: 245, g: 224, b: 0 } },
  ],
};

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
    designs: DESIGNS.map((design) => ({
      ...design,
      storefrontId: design.id,
      colorSlots: [
        {
          key: "primary",
          label: "Principal",
          defaultHex: design.accentColors[0],
          defaultValue: {
            hex: design.accentColors[0],
            colorId: null,
            name: null,
            cmyk: null,
          },
        },
        {
          key: "secondary",
          label: "Secondaire",
          defaultHex: design.accentColors[1],
          defaultValue: {
            hex: design.accentColors[1],
            colorId: null,
            name: null,
            cmyk: null,
          },
        },
        {
          key: "accent",
          label: "Accent",
          defaultHex: design.accentColors[2],
          defaultValue: {
            hex: design.accentColors[2],
            colorId: null,
            name: null,
            cmyk: null,
          },
        },
        {
          key: "plate",
          label: "Plaque",
          defaultHex: "#FFFFFF",
          isPlate: true,
          defaultValue: {
            hex: "#FFFFFF",
            colorId: null,
            name: "Blanc",
            cmyk: { c: 0, m: 0, y: 0, k: 0 },
          },
        },
      ],
    })),
    logoCategories: LOGO_CATEGORIES.map((category) => ({ ...category })),
    logos: LOGO_LIBRARY.map((logo) => ({ ...logo })),
    colorLibraries: [{ ...MOCK_COLOR_LIBRARY, shopId: tenant.id }],
  };
}
