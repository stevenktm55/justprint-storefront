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
  savedDesignId: string,
  publicId: string,
  variantId: string | null = null,
): ShopifyCartSummary {
  const sorted = sortLogosByProminence(state.selectedLogos);

  return {
    configurationId: savedDesignId,
    publicId,
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

export type CartReadyIssue =
  | "bike"
  | "design"
  | "riderName"
  | "raceNumber";

/** Returns the first missing field blocking add-to-cart, or null if ready. */
export function getCartReadyIssue(
  state: ConfiguratorState,
): CartReadyIssue | null {
  if (!state.bike?.brand || !state.bike.model || !state.bike.year) {
    return "bike";
  }
  if (!state.selectedDesign) {
    return "design";
  }
  if (!state.riderName.trim()) {
    return "riderName";
  }
  if (!state.raceNumber.trim()) {
    return "raceNumber";
  }
  return null;
}

export function cartReadyIssueMessage(issue: CartReadyIssue): string {
  switch (issue) {
    case "bike":
      return "Moto manquante. Choisis ta moto avant d’ajouter au panier.";
    case "design":
      return "Design manquant. Choisis un design avant d’ajouter au panier.";
    case "riderName":
      return "Nom du pilote manquant. Renseigne ton nom avant d’ajouter au panier.";
    case "raceNumber":
      return "Numéro de course manquant. Renseigne ton numéro avant d’ajouter au panier.";
  }
}

/** True when the configurator has enough data to request add-to-cart. */
export function isConfigurationReadyForCart(state: ConfiguratorState): boolean {
  return getCartReadyIssue(state) === null;
}

export function formatLogoProminenceLine(logo: {
  name: string;
  prominenceLevel: number;
}): string {
  const definition = getLogoProminenceDefinition(logo.prominenceLevel);
  return `${logo.name} — ${definition.label}`;
}
