import { getBikePreviewMode, isBike2D, isBike3D } from "@/lib/bike-preview";
import {
  findCatalogDesignById,
  findCatalogLogoById,
} from "@/lib/justprint/catalog";
import { normalizeHex, paletteColorToSelection } from "@/lib/justprint/colors";
import { getLogoProminenceDefinition } from "@/lib/logo-prominence";
import type { ConfiguratorState } from "@/types/configurator";
import type {
  StorefrontColorSelection,
  StorefrontConfigurationCreateBody,
  StorefrontConfigurationData,
  StorefrontConfigurationPatchBody,
} from "@/types/justprint";

export interface SnapshotContext {
  shopId: string;
  locale?: string;
  productHandle?: string | null;
  shopifyVariantId?: string | null;
}

/**
 * Builds the versioned configurationData snapshot expected by JustPrint.
 * Uses real ids/values from configurator state — never includes editToken.
 * Persists both HEX `colors` and rich `colorSelections` (colorId + CMJN).
 */
export function buildConfigurationSnapshot(
  state: ConfiguratorState,
  context: SnapshotContext,
): StorefrontConfigurationData {
  const bike = state.bike;
  const designId = state.selectedDesign;
  const design = designId ? findCatalogDesignById(designId) : null;
  const previewMode = getBikePreviewMode(bike);

  const colors: Record<string, string> = {};
  const colorSelections: Record<string, StorefrontColorSelection> = {};

  for (const swatch of state.palette) {
    const hex = normalizeHex(swatch.hex);
    colors[swatch.id] = hex;
    colorSelections[swatch.id] = paletteColorToSelection(swatch);
  }

  // Plate slot — also mirrored in colors.plate when present.
  if (state.plateColor) {
    const plateHex = normalizeHex(state.plateColor);
    colors.plate = plateHex;
    const plateSwatch = state.palette.find((p) => p.isPlate || p.id === "plate");
    if (plateSwatch) {
      colorSelections.plate = paletteColorToSelection({
        ...plateSwatch,
        hex: plateHex,
      });
    } else {
      colorSelections.plate = {
        hex: plateHex,
        name: null,
        colorId: null,
        cmyk: null,
      };
    }
  }

  if (state.numberColor) {
    colors.number = normalizeHex(state.numberColor);
  }
  if (state.nameColor) {
    colors.name = normalizeHex(state.nameColor);
  }

  const logos = state.selectedLogos.map((logo) => {
    const catalogLogo = findCatalogLogoById(logo.id);
    const prominence = getLogoProminenceDefinition(logo.prominenceLevel);
    return {
      logoId: logo.id,
      name: logo.name,
      categoryId: catalogLogo?.category ?? null,
      prominenceLevel: logo.prominenceLevel,
      prominenceLabel: prominence.label,
      source: catalogLogo ? "catalog" : "custom",
    };
  });

  // Prefer internal UUID ; fall back to storefront slug.
  const resolvedDesignId = design?.id ?? designId ?? undefined;
  const resolvedDesignName = design?.name ?? designId ?? undefined;

  return {
    version: 1,
    bike: bike
      ? {
          id: bike.id,
          brand: bike.brand,
          model: bike.model,
          year: (() => {
            const parsed = Number.parseInt(bike.year, 10);
            return Number.isFinite(parsed) ? parsed : bike.year;
          })(),
          previewMode,
          model3dId: isBike3D(bike) ? bike.model3dId : null,
          template2dId: isBike2D(bike) ? bike.template2dId : null,
        }
      : undefined,
    design:
      resolvedDesignId && resolvedDesignName
        ? { id: resolvedDesignId, name: resolvedDesignName }
        : undefined,
    personalization: {
      riderName: state.riderName,
      raceNumber: state.raceNumber,
      plateColor: state.plateColor ? normalizeHex(state.plateColor) : null,
      colors,
      colorSelections,
    },
    logos,
    storefront: {
      shopId: context.shopId,
      locale: context.locale ?? "fr",
      productHandle: context.productHandle ?? null,
      shopifyVariantId: context.shopifyVariantId ?? null,
    },
  };
}

export function buildCreateConfigurationBody(
  state: ConfiguratorState,
  context: SnapshotContext,
): StorefrontConfigurationCreateBody {
  if (!state.bike || !state.selectedDesign) {
    throw new Error("bike and design are required to create a configuration");
  }

  const configurationData = buildConfigurationSnapshot(state, context);
  const design = findCatalogDesignById(state.selectedDesign);
  const designId = design?.id ?? state.selectedDesign;

  return {
    shopId: context.shopId,
    bikeId: state.bike.id,
    designId,
    previewMode: getBikePreviewMode(state.bike),
    configurationData,
  };
}

export function buildPatchConfigurationBody(
  state: ConfiguratorState,
  context: SnapshotContext,
): StorefrontConfigurationPatchBody {
  const configurationData = buildConfigurationSnapshot(state, context);
  const design = state.selectedDesign
    ? findCatalogDesignById(state.selectedDesign)
    : null;

  return {
    bikeId: state.bike?.id ?? null,
    designId: design?.id ?? state.selectedDesign ?? null,
    previewMode: getBikePreviewMode(state.bike),
    configurationData,
  };
}
