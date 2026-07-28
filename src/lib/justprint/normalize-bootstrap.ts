import type {
  StorefrontBike,
  StorefrontBootstrap,
  StorefrontDesign,
  StorefrontLogo,
  StorefrontLogoCategory,
  StorefrontLogoCategoryId,
  StorefrontShop,
} from "@/types/justprint";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function asPreviewMode(value: unknown): "2d" | "3d" {
  return value === "2d" ? "2d" : "3d";
}

function asYear(value: unknown): string {
  return asString(value) ?? "";
}

function normalizeLogoCategoryId(value: unknown): StorefrontLogoCategoryId {
  const id = asString(value)?.toLowerCase() ?? "sponsors";
  return id as StorefrontLogoCategoryId;
}

function normalizeColorSlots(
  value: unknown,
): NonNullable<StorefrontBike["colorSlots"]> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const key = asString(item.key);
      const label = asString(item.label) ?? key;
      const defaultHex = asString(item.defaultHex) ?? "#FFFFFF";
      if (!key || !label) return null;
      return {
        key,
        label,
        defaultHex,
        isPlate: Boolean(item.isPlate),
      };
    })
    .filter(
      (slot): slot is NonNullable<typeof slot> => slot !== null,
    );
}

function normalizeBike(raw: unknown): StorefrontBike | null {
  if (!isRecord(raw)) return null;

  const id = asString(raw.id);
  const brand = asString(raw.brand);
  const model = asString(raw.model);
  const year = asYear(raw.year);
  if (!id || !brand || !model || !year) return null;

  const previewMode = asPreviewMode(raw.previewMode);
  const colorSlots = normalizeColorSlots(raw.colorSlots);
  const thumbnailUrl = asString(raw.thumbnailUrl) ?? undefined;
  const previewUrl = asString(raw.previewUrl) ?? undefined;

  if (previewMode === "2d") {
    const template2dId =
      asString(raw.template2dId) ?? `jp-2d-${id}`;
    return {
      id,
      brand,
      model,
      year,
      previewMode: "2d",
      template2dId,
      thumbnailUrl,
      previewUrl,
      colorSlots,
    };
  }

  const model3dId = asString(raw.model3dId) ?? `jp-3d-${id}`;
  return {
    id,
    brand,
    model,
    year,
    previewMode: "3d",
    model3dId,
    thumbnailUrl,
    previewUrl,
    colorSlots,
  };
}

function accentColorsFromSlots(
  slots: NonNullable<StorefrontBike["colorSlots"]>,
): [string, string, string] {
  const colors = slots
    .filter((slot) => !slot.isPlate)
    .map((slot) => slot.defaultHex);
  return [
    colors[0] ?? "#FF5A00",
    colors[1] ?? "#111111",
    colors[2] ?? "#FFFFFF",
  ];
}

function normalizeNestedDesign(
  raw: unknown,
  bikeId: string,
  colorSlots: NonNullable<StorefrontBike["colorSlots"]>,
): StorefrontDesign | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id);
  const name = asString(raw.name);
  if (!id || !name) return null;

  const accent =
    Array.isArray(raw.accentColors) && raw.accentColors.length >= 3
      ? ([
          asString(raw.accentColors[0]) ?? "#FF5A00",
          asString(raw.accentColors[1]) ?? "#111111",
          asString(raw.accentColors[2]) ?? "#FFFFFF",
        ] as [string, string, string])
      : accentColorsFromSlots(colorSlots);

  return {
    id,
    name,
    badge: asString(raw.badge) ?? name,
    description: asString(raw.description) ?? name,
    accentColors: accent,
    compatibleBikeIds: [bikeId],
  };
}

function normalizeFlatDesign(raw: unknown): StorefrontDesign | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id);
  const name = asString(raw.name);
  if (!id || !name) return null;

  const accentColors =
    Array.isArray(raw.accentColors) && raw.accentColors.length >= 3
      ? ([
          asString(raw.accentColors[0]) ?? "#FF5A00",
          asString(raw.accentColors[1]) ?? "#111111",
          asString(raw.accentColors[2]) ?? "#FFFFFF",
        ] as [string, string, string])
      : (["#FF5A00", "#111111", "#FFFFFF"] as [string, string, string]);

  const compatibleBikeIds = Array.isArray(raw.compatibleBikeIds)
    ? raw.compatibleBikeIds.filter(
        (item): item is string => typeof item === "string" && Boolean(item.trim()),
      )
    : undefined;

  return {
    id,
    name,
    badge: asString(raw.badge) ?? name,
    description: asString(raw.description) ?? name,
    accentColors,
    compatibleBikeIds,
  };
}

function normalizeLogo(
  raw: unknown,
  fallbackCategory: StorefrontLogoCategoryId = "sponsors",
): StorefrontLogo | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id);
  const name = asString(raw.name);
  if (!id || !name) return null;
  const category = normalizeLogoCategoryId(
    raw.category ?? raw.categoryId ?? fallbackCategory,
  );
  return {
    id,
    name,
    category,
    imageUrl: asString(raw.imageUrl) ?? undefined,
  };
}

function normalizeLogoCategory(raw: unknown): StorefrontLogoCategory | null {
  if (!isRecord(raw)) return null;
  const id = normalizeLogoCategoryId(raw.id);
  const label = asString(raw.label) ?? id;
  return { id, label };
}

function normalizeShop(raw: unknown, fallbackShopId: string): StorefrontShop {
  if (!isRecord(raw)) {
    return { id: fallbackShopId, name: fallbackShopId, slug: fallbackShopId };
  }
  const id = asString(raw.id) ?? fallbackShopId;
  const name = asString(raw.name) ?? asString(raw.label) ?? id;
  const slug = asString(raw.slug) ?? id;
  return { id, name, slug };
}

/**
 * Normalise la réponse GET /api/storefront/bootstrap (forme imbriquée pilote
 * ou forme plate historique) vers StorefrontBootstrap consommé par l’UI.
 */
export function normalizeStorefrontBootstrap(
  raw: unknown,
  fallbackShopId: string,
): StorefrontBootstrap {
  if (!isRecord(raw)) {
    throw new Error("Bootstrap JustPrint invalide.");
  }

  const shop = normalizeShop(raw.shop, fallbackShopId);
  const rawBikes = Array.isArray(raw.bikes) ? raw.bikes : [];
  const bikes: StorefrontBike[] = [];
  const designsById = new Map<string, StorefrontDesign>();
  const logosById = new Map<string, StorefrontLogo>();
  const categoriesById = new Map<string, StorefrontLogoCategory>();

  for (const rawBike of rawBikes) {
    const bike = normalizeBike(rawBike);
    if (!bike) continue;
    bikes.push(bike);

    if (isRecord(rawBike) && Array.isArray(rawBike.designs)) {
      for (const nested of rawBike.designs) {
        const design = normalizeNestedDesign(
          nested,
          bike.id,
          bike.colorSlots ?? [],
        );
        if (!design) continue;
        const existing = designsById.get(design.id);
        if (existing) {
          const merged = new Set([
            ...(existing.compatibleBikeIds ?? []),
            ...(design.compatibleBikeIds ?? []),
          ]);
          designsById.set(design.id, {
            ...existing,
            compatibleBikeIds: Array.from(merged),
          });
        } else {
          designsById.set(design.id, design);
        }
      }
    }

    if (isRecord(rawBike) && Array.isArray(rawBike.logoCategories)) {
      for (const category of rawBike.logoCategories) {
        const normalized = normalizeLogoCategory(category);
        if (normalized) categoriesById.set(normalized.id, normalized);
      }
    }

    if (isRecord(rawBike) && Array.isArray(rawBike.logos)) {
      for (const logo of rawBike.logos) {
        const normalized = normalizeLogo(logo);
        if (normalized) logosById.set(normalized.id, normalized);
      }
    }
  }

  // Forme plate (mock / historique) : designs / logos / catégories au top-level.
  if (Array.isArray(raw.designs)) {
    for (const design of raw.designs) {
      const normalized = normalizeFlatDesign(design);
      if (normalized) designsById.set(normalized.id, normalized);
    }
  }

  if (Array.isArray(raw.logoCategories)) {
    for (const category of raw.logoCategories) {
      const normalized = normalizeLogoCategory(category);
      if (normalized) categoriesById.set(normalized.id, normalized);
    }
  }

  if (Array.isArray(raw.logos)) {
    for (const logo of raw.logos) {
      const normalized = normalizeLogo(logo);
      if (normalized) logosById.set(normalized.id, normalized);
    }
  }

  if (categoriesById.size === 0 && logosById.size > 0) {
    for (const logo of logosById.values()) {
      if (!categoriesById.has(logo.category)) {
        categoriesById.set(logo.category, {
          id: logo.category,
          label: logo.category,
        });
      }
    }
  }

  return {
    shop,
    bikes,
    designs: Array.from(designsById.values()),
    logoCategories: Array.from(categoriesById.values()),
    logos: Array.from(logosById.values()),
  };
}
