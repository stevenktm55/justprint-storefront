import { describe, expect, it } from "vitest";
import { normalizeStorefrontBootstrap } from "@/lib/justprint/normalize-bootstrap";
import { buildCreateConfigurationBody } from "@/lib/justprint/snapshot";
import { setStorefrontCatalog } from "@/lib/justprint/catalog";
import { createInitialState } from "@/types/configurator";

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
  });
});

describe("buildCreateConfigurationBody (saved-designs payload)", () => {
  it("builds configurationData compatible with JustPrint adapter", () => {
    setStorefrontCatalog(
      normalizeStorefrontBootstrap(
        {
          shop: { id: "rawmoto", label: "RawMoto" },
          bikes: [
            {
              id: "yamaha-450-yzf-2025",
              brand: "Yamaha",
              model: "450 YZF",
              year: "2025",
              previewMode: "3d",
              designs: [{ id: "classic", name: "CLASSIC" }],
              colorSlots: [
                { key: "primary", label: "Principal", defaultHex: "#f200ff" },
              ],
            },
          ],
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
      selectedDesign: "classic",
      riderName: "MAGINOT",
      raceNumber: "21",
      plateColor: "#FFFFFF",
      palette: [
        { id: "primary", label: "Principal", hex: "#f200ff" },
        { id: "secondary", label: "Secondaire", hex: "#00dbd5" },
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
    expect(body.designId).toBe("classic");
    expect(body.previewMode).toBe("3d");
    expect(body.configurationData.version).toBe(1);
    expect(body.configurationData.bike?.id).toBe("yamaha-450-yzf-2025");
    expect(body.configurationData.design?.id).toBe("classic");
    expect(body.configurationData.personalization?.riderName).toBe("MAGINOT");
    expect(body.configurationData.personalization?.raceNumber).toBe("21");
    expect(body.configurationData.personalization?.colors.primary).toBe(
      "#f200ff",
    );
    expect(body.configurationData.logos?.[0]?.logoId).toBe("logo-1");
    expect(body.configurationData.storefront?.shopId).toBe("rawmoto");
  });
});
