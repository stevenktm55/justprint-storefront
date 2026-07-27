import { getBikePreviewMode } from "@/lib/bike-preview";
import { findCatalogDesignById } from "@/lib/justprint/catalog";
import {
  getLogoProminenceDefinition,
  sortLogosByProminence,
} from "@/lib/logo-prominence";
import type {
  ConfigurationCompletionSummary,
  ConfiguratorState,
  JustPrintAddToCartSummary,
  ShopifyCartSummary,
} from "@/types/configurator";

export function formatBikeLabel(
  bike: ConfiguratorState["bike"],
): string {
  if (!bike) return "—";
  return `${bike.brand} ${bike.model} (${bike.year})`;
}

export function getDesignName(designId: string | null): string {
  if (!designId) return "—";
  return findCatalogDesignById(designId)?.name ?? "—";
}

export function buildCompletionSummary(
  state: ConfiguratorState,
): ConfigurationCompletionSummary {
  const logos = sortLogosByProminence(state.selectedLogos).map((logo) => {
    const definition = getLogoProminenceDefinition(logo.prominenceLevel);
    return {
      name: logo.name,
      prominenceLevel: definition.level,
      prominenceLabel: definition.label,
    };
  });

  return {
    bike: formatBikeLabel(state.bike),
    design: getDesignName(state.selectedDesign),
    riderName: state.riderName || "—",
    raceNumber: state.raceNumber || "—",
    colors: state.palette.map((color) => color.hex),
    logos,
    previewMode: getBikePreviewMode(state.bike),
  };
}

export function buildShopifyCartSummary(
  state: ConfiguratorState,
  configurationId: string,
  variantId: string | null = null,
): ShopifyCartSummary {
  const sorted = sortLogosByProminence(state.selectedLogos);

  return {
    configurationId,
    bikeLabel: formatBikeLabel(state.bike),
    designName: getDesignName(state.selectedDesign),
    riderName: state.riderName,
    raceNumber: state.raceNumber,
    selectedColors: state.palette.map((color) => color.hex),
    selectedLogoNames: sorted.map((logo) => logo.name),
    selectedLogoCount: sorted.length,
    previewMode: getBikePreviewMode(state.bike),
    previewUrl: null,
    variantId,
  };
}

/** Summary payload for JUSTPRINT_ADD_TO_CART (parent Shopify cart bridge). */
export function buildAddToCartSummary(
  state: ConfiguratorState,
): JustPrintAddToCartSummary {
  const sorted = sortLogosByProminence(state.selectedLogos);

  return {
    bikeLabel: formatBikeLabel(state.bike),
    designName: getDesignName(state.selectedDesign),
    riderName: state.riderName,
    raceNumber: state.raceNumber,
    previewMode: getBikePreviewMode(state.bike),
    selectedColors: state.palette.map((color) => color.hex),
    selectedLogoNames: sorted.map((logo) => logo.name),
    selectedLogoCount: sorted.length,
  };
}

/** True when the configurator has enough data to request add-to-cart. */
export function isConfigurationReadyForCart(state: ConfiguratorState): boolean {
  return Boolean(
    state.bike?.brand &&
      state.bike.model &&
      state.bike.year &&
      state.selectedDesign &&
      state.raceNumber.trim().length > 0,
  );
}

export function formatLogoProminenceLine(logo: {
  name: string;
  prominenceLevel: number;
}): string {
  const definition = getLogoProminenceDefinition(logo.prominenceLevel);
  return `${logo.name} — ${definition.label}`;
}
