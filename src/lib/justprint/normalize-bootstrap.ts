import type {
  StorefrontBike,
  StorefrontBootstrap,
  StorefrontCmyk,
  StorefrontColorLibrary,
  StorefrontColorSlot,
  StorefrontColorSlotDefault,
  StorefrontDesign,
  StorefrontLibraryColor,
  StorefrontLogo,
  StorefrontLogoCategory,
  StorefrontLogoCategoryId,
  StorefrontRgb,
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

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function normalizeLogoCategoryId(value: unknown): StorefrontLogoCategoryId {
  const id = asString(value)?.toLowerCase() ?? "sponsors";
  return id as StorefrontLogoCategoryId;
}

function normalizeHex(value: unknown, fallback = "#ffffff"): string {
  const raw = asString(value);
  if (!raw) return fallback;
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  const body = withHash.slice(1);
  if (body.length === 3) {
    return `#${body
      .split("")
      .map((c) => c + c)
      .join("")
      .toLowerCase()}`;
  }
  return `#${body.slice(0, 8).toLowerCase()}`;
}

function normalizeCmyk(value: unknown): StorefrontCmyk | null {
  if (!isRecord(value)) return null;
  return {
    c: asNumber(value.c),
    m: asNumber(value.m),
    y: asNumber(value.y),
    k: asNumber(value.k),
  };
}

function normalizeRgb(value: unknown): StorefrontRgb | null {
  if (!isRecord(value)) return null;
  return {
    r: asNumber(value.r),
    g: asNumber(value.g),
    b: asNumber(value.b),
  };
}

function normalizeDefaultValue(
  value: unknown,
  fallbackHex: string,
): StorefrontColorSlotDefault {
  if (!isRecord(value)) {
    return {
      hex: fallbackHex,
      colorId: null,
      name: null,
      cmyk: null,
    };
  }
  return {
    hex: normalizeHex(value.hex, fallbackHex),
    colorId: asString(value.colorId),
    name: asString(value.name),
    cmyk: normalizeCmyk(value.cmyk),
    libraryId: asString(value.libraryId) ?? undefined,
  };
}

function normalizeColorSlots(value: unknown): StorefrontColorSlot[] {
  if (!Array.isArray(value)) return [];
  const slots: StorefrontColorSlot[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    if (!isRecord(item)) continue;
    const key = asString(item.key);
    const label = asString(item.label) ?? key;
    if (!key || !label) continue;
    const defaultHex = normalizeHex(
      item.defaultHex ??
        (isRecord(item.defaultValue) ? item.defaultValue.hex : null) ??
        item.originalHex,
      "#ffffff",
    );
    const defaultValue = normalizeDefaultValue(item.defaultValue, defaultHex);
    slots.push({
      key,
      label,
      defaultHex: defaultValue.hex || defaultHex,
      defaultValue,
      originalHex: asString(item.originalHex)
        ? normalizeHex(item.originalHex)
        : undefined,
      isPlate: Boolean(item.isPlate),
      slotIndex: typeof item.slotIndex === "number" ? item.slotIndex : index,
    });
  }
  return slots;
}

function accentColorsFromSlots(
  slots: StorefrontColorSlot[],
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

function normalizeLibraryColor(raw: unknown): StorefrontLibraryColor | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id);
  const hex = normalizeHex(raw.hex, "");
  if (!id) return null;
  // HEX optional in theory — keep entry if we have name or id for archived restore.
  const name = asString(raw.name) ?? (hex || id);
  return {
    id,
    name,
    hex: hex || "#cccccc",
    rgb: normalizeRgb(raw.rgb),
    cmyk: normalizeCmyk(raw.cmyk),
    displayOrder: asNumber(raw.displayOrder ?? raw.display_order, 0),
    active: raw.active === false ? false : true,
  };
}

function normalizeColorLibrary(
  raw: unknown,
  index: number,
): StorefrontColorLibrary | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id) ?? `color-library-${index}`;
  const name = asString(raw.name) ?? asString(raw.label) ?? id;
  const shopId = asString(raw.shopId) ?? "";
  const colors = Array.isArray(raw.colors)
    ? raw.colors
        .map((c) => normalizeLibraryColor(c))
        .filter((c): c is StorefrontLibraryColor => c !== null)
        .sort((a, b) => a.displayOrder - b.displayOrder)
    : [];
  return {
    id,
    name,
    shopId,
    active: raw.active === false ? false : true,
    colors,
    displayOrder: asNumber(raw.displayOrder, index),
  };
}

function normalizeBikeBase(raw: Record<string, unknown>): {
  id: string;
  brand: string;
  model: string;
  year: string;
  previewMode: "2d" | "3d";
  colorSlots: StorefrontColorSlot[];
  thumbnailUrl?: string;
  previewUrl?: string;
  internalProductId?: string;
  model3dId?: string | null;
  template2dId?: string | null;
} | null {
  // products[] uses storefrontId ; bikes[] uses id
  const id =
    asString(raw.storefrontId) ??
    asString(raw.id) ??
    asString(raw.publicIds && isRecord(raw.publicIds) ? raw.publicIds.bikeId : null);
  const brand = asString(raw.brand);
  const model = asString(raw.model);
  const year = asYear(raw.year);
  if (!id || !brand || !model || !year) return null;

  const previewMode = asPreviewMode(raw.previewMode);
  const colorSlots = normalizeColorSlots(raw.colorSlots);
  const thumbnailUrl = asString(raw.thumbnailUrl) ?? undefined;
  const previewUrl = asString(raw.previewUrl) ?? undefined;
  const internalProductId =
    asString(raw.internalProductId) ??
    (asString(raw.storefrontId) ? asString(raw.id) : null) ??
    undefined;

  const models = isRecord(raw.models) ? raw.models : null;
  const model3dId =
    asString(raw.model3dId) ??
    asString(models?.parent) ??
    null;
  const template2dId = asString(raw.template2dId);

  return {
    id,
    brand,
    model,
    year,
    previewMode,
    colorSlots,
    thumbnailUrl,
    previewUrl,
    internalProductId: internalProductId ?? undefined,
    model3dId,
    template2dId,
  };
}

function normalizeBike(raw: unknown): StorefrontBike | null {
  if (!isRecord(raw)) return null;
  const base = normalizeBikeBase(raw);
  if (!base) return null;

  if (base.previewMode === "2d") {
    return {
      id: base.id,
      brand: base.brand,
      model: base.model,
      year: base.year,
      previewMode: "2d",
      template2dId: base.template2dId ?? `jp-2d-${base.id}`,
      thumbnailUrl: base.thumbnailUrl,
      previewUrl: base.previewUrl,
      colorSlots: base.colorSlots,
      internalProductId: base.internalProductId,
    };
  }

  return {
    id: base.id,
    brand: base.brand,
    model: base.model,
    year: base.year,
    previewMode: "3d",
    model3dId: base.model3dId ?? `jp-3d-${base.id}`,
    thumbnailUrl: base.thumbnailUrl,
    previewUrl: base.previewUrl,
    colorSlots: base.colorSlots,
    internalProductId: base.internalProductId,
  };
}

/**
 * Normalise un design (imbriqué products/bikes ou flat).
 * Préfère l’UUID interne JustPrint comme `id` quand disponible.
 */
function normalizeDesign(
  raw: unknown,
  bikeId: string | null,
  fallbackSlots: StorefrontColorSlot[],
): StorefrontDesign | null {
  if (!isRecord(raw)) return null;

  const storefrontId =
    asString(raw.storefrontId) ??
    // Nested bikes[] uses id = slug and internalId = UUID
    (asString(raw.internalId) ? asString(raw.id) : null);

  const internalId =
    asString(raw.internalId) ??
    // products[].designs[].id = UUID when storefrontId is also present
    (asString(raw.storefrontId) ? asString(raw.id) : null) ??
    // UUID-looking id without storefrontId
    (asString(raw.id)?.includes("-") && asString(raw.id)!.length > 20
      ? asString(raw.id)
      : null);

  const slugOrId = asString(raw.id);
  if (!slugOrId && !internalId && !storefrontId) return null;

  const id = internalId ?? storefrontId ?? slugOrId!;
  const resolvedStorefrontId = storefrontId ?? (!internalId ? slugOrId : undefined);
  const name = asString(raw.name) ?? resolvedStorefrontId ?? id;

  const colorSlots = (() => {
    const nested = normalizeColorSlots(raw.colorSlots);
    if (nested.length > 0) return nested;
    return fallbackSlots;
  })();

  const accent =
    Array.isArray(raw.accentColors) && raw.accentColors.length >= 3
      ? ([
          normalizeHex(raw.accentColors[0], "#FF5A00"),
          normalizeHex(raw.accentColors[1], "#111111"),
          normalizeHex(raw.accentColors[2], "#FFFFFF"),
        ] as [string, string, string])
      : accentColorsFromSlots(colorSlots);

  const compatibleBikeIds = Array.isArray(raw.compatibleBikeIds)
    ? raw.compatibleBikeIds.filter(
        (item): item is string => typeof item === "string" && Boolean(item.trim()),
      )
    : bikeId
      ? [bikeId]
      : undefined;

  // Nested bikes mark compatible: true without compatibleBikeIds
  const finalCompatible =
    compatibleBikeIds ??
    (bikeId && (raw.compatible === true || raw.compatible === undefined)
      ? [bikeId]
      : compatibleBikeIds);

  return {
    id,
    storefrontId: resolvedStorefrontId ?? undefined,
    name,
    badge: asString(raw.badge) ?? name,
    description: asString(raw.description) ?? name,
    thumbnailUrl: asString(raw.thumbnailUrl),
    accentColors: accent,
    colorSlots,
    compatibleBikeIds: finalCompatible,
    productionTemplateId: asString(raw.productionTemplateId) ?? undefined,
    kitColorHexList: Array.isArray(raw.kitColorHexList)
      ? raw.kitColorHexList
          .map((h) => asString(h))
          .filter((h): h is string => Boolean(h))
      : undefined,
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
  return {
    id,
    name,
    slug,
    label: asString(raw.label) ?? undefined,
    justprintShopId: asString(raw.justprintShopId),
  };
}

function mergeDesign(
  existing: StorefrontDesign,
  incoming: StorefrontDesign,
): StorefrontDesign {
  const mergedBikes = new Set([
    ...(existing.compatibleBikeIds ?? []),
    ...(incoming.compatibleBikeIds ?? []),
  ]);
  return {
    ...existing,
    ...incoming,
    // Prefer richer fields
    id: incoming.id.includes("-") && incoming.id.length > 20
      ? incoming.id
      : existing.id.includes("-") && existing.id.length > 20
        ? existing.id
        : incoming.id,
    storefrontId: incoming.storefrontId ?? existing.storefrontId,
    thumbnailUrl: incoming.thumbnailUrl ?? existing.thumbnailUrl,
    colorSlots:
      incoming.colorSlots && incoming.colorSlots.length > 0
        ? incoming.colorSlots
        : existing.colorSlots,
    compatibleBikeIds: Array.from(mergedBikes),
  };
}

/**
 * Normalise la réponse GET /api/storefront/bootstrap (products + colorLibraries
 * ou forme imbriquée / plate historique) vers StorefrontBootstrap.
 */
export function normalizeStorefrontBootstrap(
  raw: unknown,
  fallbackShopId: string,
): StorefrontBootstrap {
  if (!isRecord(raw)) {
    throw new Error("Bootstrap JustPrint invalide.");
  }

  const shop = normalizeShop(raw.shop, fallbackShopId);
  const designsById = new Map<string, StorefrontDesign>();
  const logosById = new Map<string, StorefrontLogo>();
  const categoriesById = new Map<string, StorefrontLogoCategory>();
  const bikes: StorefrontBike[] = [];

  // Prefer products[] (new) then bikes[] (legacy alias).
  const rawProducts = Array.isArray(raw.products) ? raw.products : [];
  const rawBikes = Array.isArray(raw.bikes) ? raw.bikes : [];
  const sourceItems = rawProducts.length > 0 ? rawProducts : rawBikes;

  for (const rawItem of sourceItems) {
    const bike = normalizeBike(rawItem);
    if (!bike) continue;
    bikes.push(bike);

    if (!isRecord(rawItem)) continue;

    const itemSlots = bike.colorSlots ?? [];

    if (Array.isArray(rawItem.designs)) {
      for (const nested of rawItem.designs) {
        const design = normalizeDesign(nested, bike.id, itemSlots);
        if (!design) continue;
        // Also index by storefrontId for lookups
        const existing = designsById.get(design.id);
        const merged = existing ? mergeDesign(existing, design) : design;
        designsById.set(merged.id, merged);
        if (merged.storefrontId && merged.storefrontId !== merged.id) {
          const bySlug = designsById.get(merged.storefrontId);
          designsById.set(
            merged.storefrontId,
            bySlug ? mergeDesign(bySlug, merged) : merged,
          );
        }
      }
    }

    if (Array.isArray(rawItem.logoCategories)) {
      for (const category of rawItem.logoCategories) {
        const normalized = normalizeLogoCategory(category);
        if (normalized) categoriesById.set(normalized.id, normalized);
      }
    }

    if (Array.isArray(rawItem.logos)) {
      for (const logo of rawItem.logos) {
        const normalized = normalizeLogo(logo);
        if (normalized) logosById.set(normalized.id, normalized);
      }
    }
  }

  // Forme plate (mock / historique) : designs / logos / catégories au top-level.
  if (Array.isArray(raw.designs)) {
    for (const design of raw.designs) {
      const normalized = normalizeDesign(design, null, []);
      if (!normalized) continue;
      const existing = designsById.get(normalized.id);
      designsById.set(
        normalized.id,
        existing ? mergeDesign(existing, normalized) : normalized,
      );
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

  const colorLibraries: StorefrontColorLibrary[] = Array.isArray(
    raw.colorLibraries,
  )
    ? raw.colorLibraries
        .map((lib, i) => normalizeColorLibrary(lib, i))
        .filter((lib): lib is StorefrontColorLibrary => lib !== null)
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    : [];

  // Dedupe designs: prefer UUID entries, drop pure slug aliases that point to same design.
  const uniqueDesigns: StorefrontDesign[] = [];
  const seenKeys = new Set<string>();
  for (const design of designsById.values()) {
    const key = design.storefrontId ?? design.id;
    if (seenKeys.has(key)) {
      // Replace slug-only entry with richer UUID entry if needed
      const idx = uniqueDesigns.findIndex(
        (d) => (d.storefrontId ?? d.id) === key,
      );
      if (idx >= 0) {
        uniqueDesigns[idx] = mergeDesign(uniqueDesigns[idx]!, design);
      }
      continue;
    }
    seenKeys.add(key);
    uniqueDesigns.push(design);
  }

  return {
    shop,
    bikes,
    designs: uniqueDesigns,
    logoCategories: Array.from(categoriesById.values()),
    logos: Array.from(logosById.values()),
    colorLibraries,
  };
}
