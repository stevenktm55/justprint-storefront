import { describe, expect, it } from "vitest";
import { normalizeStorefrontBootstrap } from "@/lib/justprint/normalize-bootstrap";
import { buildCreateConfigurationBody } from "@/lib/justprint/snapshot";
import { setStorefrontCatalog } from "@/lib/justprint/catalog";
import { createInitialState } from "@/types/configurator";

const CLASSIC_UUID = "7b841fac-b0e9-4b97-96cc-745434d8c090";

describe("normalizeStorefrontBootstrap", () => {
  it("flattens nested remote bootstrap into StorefrontBootstrap", () => {
    const bootstrap = normalizeStorefrontBootstrap(
      {
        ok: true,
        shop: { id: "rawmoto", label: "RawMoto" },
        bikes: [
          {
            id: "yamaha-450-yzf-2025",
            brand: "Yamaha",
            model: "450 YZF",
            year: 2025,
            previewMode: "3d",
            designs: [{ id: "classic", name: "CLASSIC", compatible: true }],
            colorSlots: [
              {
                key: "primary",
                label: "Principal",
                defaultHex: "#f200ff",
              },
              {
                key: "plate",
                label: "Plaque",
                defaultHex: "#ffffff",
                isPlate: true,
              },
            ],
            logoCategories: [{ id: "sponsors", label: "Sponsors" }],
            logos: [
              {
                id: "logo-1",
                name: "Dunlop",
                imageUrl: "https://example.com/d.png",
                categoryId: null,
              },
            ],
          },
        ],
      },
      "rawmoto",
    );

    expect(bootstrap.shop.id).toBe("rawmoto");
    expect(bootstrap.shop.name).toBe("RawMoto");
    expect(bootstrap.bikes).toHaveLength(1);
    expect(bootstrap.bikes[0]?.id).toBe("yamaha-450-yzf-2025");
    expect(bootstrap.bikes[0]?.previewMode).toBe("3d");
    expect(bootstrap.bikes[0]?.colorSlots?.[0]?.key).toBe("primary");
    expect(bootstrap.designs).toHaveLength(1);
    expect(bootstrap.designs[0]?.id).toBe("classic");
    expect(bootstrap.designs[0]?.compatibleBikeIds).toEqual([
      "yamaha-450-yzf-2025",
    ]);
    expect(bootstrap.logos[0]?.id).toBe("logo-1");
    expect(bootstrap.logoCategories[0]?.id).toBe("sponsors");
    expect(bootstrap.colorLibraries).toEqual([]);
  });

  it("normalizes products + colorLibraries + design UUID", () => {
    const bootstrap = normalizeStorefrontBootstrap(
      {
        ok: true,
        shop: {
          id: "rawmoto",
          name: "RawMoto",
          justprintShopId: "dca29616-b6cf-4cec-a686-15d438fbc3ab",
        },
        products: [
          {
            id: "c7440f74-a17c-4bde-8a92-0b789827763c",
            storefrontId: "yamaha-450-yzf-2025",
            brand: "Yamaha",
            model: "450 YZF",
            year: 2025,
            previewMode: "3d",
            models: { parent: "model-parent", stickers: "model-stickers" },
            designs: [
              {
                id: CLASSIC_UUID,
                storefrontId: "classic",
                name: "CLASSIC",
                thumbnailUrl: "https://example.com/classic.png",
                colorSlots: [
                  {
                    key: "primary",
                    label: "Principal",
                    originalHex: "#f200ff",
                    defaultHex: "#ffffff",
                    defaultValue: {
                      hex: "#ffffff",
                      colorId: "143b0d58-4c9b-47b5-8208-57ec16e9079b",
                      name: "Blanc",
                      cmyk: { c: 0, m: 0, y: 0, k: 0 },
                    },
                    isPlate: false,
                    slotIndex: 0,
                  },
                  {
                    key: "plate",
                    label: "Plaque",
                    defaultHex: "#ffffff",
                    defaultValue: {
                      hex: "#ffffff",
                      colorId: null,
                      name: "Blanc",
                      cmyk: null,
                    },
                    isPlate: true,
                    slotIndex: 6,
                  },
                ],
              },
            ],
            colorSlots: [],
            logoCategories: [],
            logos: [],
          },
        ],
        bikes: [],
        colorLibraries: [
          {
            id: "shop-colors:dca29616",
            name: "RawMoto",
            shopId: "rawmoto",
            active: true,
            colors: [
              {
                id: "143b0d58-4c9b-47b5-8208-57ec16e9079b",
                name: "Blanc",
                hex: "#ffffff",
                rgb: { r: 255, g: 255, b: 255 },
                cmyk: { c: 0, m: 0, y: 0, k: 0 },
                displayOrder: 0,
              },
              {
                id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
                name: "Noir",
                hex: "#000000",
                rgb: { r: 0, g: 0, b: 0 },
                cmyk: { c: 0, m: 0, y: 0, k: 100 },
                displayOrder: 1,
              },
            ],
          },
        ],
      },
      "rawmoto",
    );

    expect(bootstrap.bikes).toHaveLength(1);
    expect(bootstrap.bikes[0]?.id).toBe("yamaha-450-yzf-2025");
    expect(bootstrap.designs).toHaveLength(1);
    expect(bootstrap.designs[0]?.id).toBe(CLASSIC_UUID);
    expect(bootstrap.designs[0]?.storefrontId).toBe("classic");
    expect(bootstrap.designs[0]?.thumbnailUrl).toBe(
      "https://example.com/classic.png",
    );
    expect(bootstrap.designs[0]?.colorSlots?.[0]?.defaultValue?.colorId).toBe(
      "143b0d58-4c9b-47b5-8208-57ec16e9079b",
    );
    expect(bootstrap.colorLibraries).toHaveLength(1);
    expect(bootstrap.colorLibraries[0]?.colors).toHaveLength(2);
    expect(bootstrap.colorLibraries[0]?.colors[1]?.cmyk?.k).toBe(100);
  });
});

describe("buildCreateConfigurationBody (saved-designs payload)", () => {
  it("builds configurationData with colorSelections", () => {
    setStorefrontCatalog(
      normalizeStorefrontBootstrap(
        {
          shop: { id: "rawmoto", label: "RawMoto" },
          products: [
            {
              id: "prod-1",
              storefrontId: "yamaha-450-yzf-2025",
              brand: "Yamaha",
              model: "450 YZF",
              year: 2025,
              previewMode: "3d",
              designs: [
                {
                  id: CLASSIC_UUID,
                  storefrontId: "classic",
                  name: "CLASSIC",
                  colorSlots: [
                    {
                      key: "primary",
                      label: "Principal",
                      defaultHex: "#f200ff",
                      defaultValue: {
                        hex: "#f200ff",
                        colorId: null,
                        name: null,
                        cmyk: null,
                      },
                    },
                  ],
                },
              ],
            },
          ],
          colorLibraries: [],
        },
        "rawmoto",
      ),
    );

    const state = {
      ...createInitialState(),
      bike: {
        id: "yamaha-450-yzf-2025",
        brand: "Yamaha",
        model: "450 YZF",
        year: "2025",
        previewMode: "3d" as const,
        model3dId: "jp-3d-yamaha-450-yzf-2025",
      },
      selectedDesign: CLASSIC_UUID,
      riderName: "MAGINOT",
      raceNumber: "21",
      plateColor: "#FFFFFF",
      palette: [
        {
          id: "primary",
          label: "Principal",
          hex: "#000000",
          colorId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
          name: "Noir",
          cmyk: { c: 0, m: 0, y: 0, k: 100 },
          libraryId: "shop-colors:x",
        },
        {
          id: "secondary",
          label: "Secondaire",
          hex: "#00dbd5",
          name: "Cyan",
        },
      ],
      selectedLogos: [
        {
          id: "logo-1",
          name: "Dunlop",
          prominenceLevel: 7,
          addedAt: 1,
        },
      ],
    };

    const body = buildCreateConfigurationBody(state, {
      shopId: "rawmoto",
      locale: "fr",
    });

    expect(body.shopId).toBe("rawmoto");
    expect(body.bikeId).toBe("yamaha-450-yzf-2025");
    expect(body.designId).toBe(CLASSIC_UUID);
    expect(body.previewMode).toBe("3d");
    expect(body.configurationData.version).toBe(1);
    expect(body.configurationData.design?.id).toBe(CLASSIC_UUID);
    expect(body.configurationData.personalization?.colors.primary).toBe(
      "#000000",
    );
    expect(
      body.configurationData.personalization?.colorSelections?.primary,
    ).toEqual({
      colorId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      hex: "#000000",
      name: "Noir",
      cmyk: { c: 0, m: 0, y: 0, k: 100 },
      libraryId: "shop-colors:x",
    });
    expect(body.configurationData.logos?.[0]?.logoId).toBe("logo-1");
  });
});
