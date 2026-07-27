import { getBikePreviewMode, isBike2D, isBike3D } from "@/lib/bike-preview";
import { findCatalogDesignById, findCatalogLogoById } from "@/lib/justprint/catalog";
import { getLogoProminenceDefinition } from "@/lib/logo-prominence";
import type { ConfiguratorState } from "@/types/configurator";
import type {
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
  for (const swatch of state.palette) {
    colors[swatch.id] = swatch.hex;
  }
  if (state.numberColor) {
    colors.number = state.numberColor;
  }
  if (state.nameColor) {
    colors.name = state.nameColor;
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
      designId && design
        ? { id: design.id, name: design.name }
        : designId
          ? { id: designId, name: designId }
          : undefined,
    personalization: {
      riderName: state.riderName,
      raceNumber: state.raceNumber,
      plateColor: state.plateColor || null,
      colors,
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

  return {
    shopId: context.shopId,
    bikeId: state.bike.id,
    designId: state.selectedDesign,
    previewMode: getBikePreviewMode(state.bike),
    configurationData,
  };
}

export function buildPatchConfigurationBody(
  state: ConfiguratorState,
  context: SnapshotContext,
): StorefrontConfigurationPatchBody {
  const configurationData = buildConfigurationSnapshot(state, context);

  return {
    bikeId: state.bike?.id ?? null,
    designId: state.selectedDesign ?? null,
    previewMode: getBikePreviewMode(state.bike),
    configurationData,
  };
}
