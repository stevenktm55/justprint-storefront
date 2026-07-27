import { findCatalogBike } from "@/lib/justprint/catalog";
import type {
  Bike2D,
  Bike3D,
  BikeSelection,
  PreviewMode,
} from "@/types/configurator";

export function isBike3D(bike: BikeSelection): bike is Bike3D {
  return bike.previewMode === "3d";
}

export function isBike2D(bike: BikeSelection): bike is Bike2D {
  return bike.previewMode === "2d";
}

export function getBikePreviewMode(
  bike: BikeSelection | null | undefined,
): PreviewMode {
  return bike?.previewMode ?? "3d";
}

export function formatPreviewModeLabel(mode: PreviewMode): string {
  return mode === "3d" ? "3D" : "2D";
}

export function previewModeBadgeLabel(mode: PreviewMode): string {
  return mode === "3d" ? "Aperçu 3D disponible" : "Aperçu 2D";
}

export function previewModeHelpText(mode: PreviewMode): string {
  return mode === "3d"
    ? "Ton kit est appliqué directement sur la moto afin de visualiser le rendu sous plusieurs angles."
    : "Ton numéro, ton nom, tes couleurs et tes logos sont appliqués directement sur les différentes pièces du kit.";
}

/** Rebuild a full BikeSelection from partial draft fields + catalog lookup. */
export function resolveBikeSelection(partial: {
  id?: string;
  brand: string;
  model: string;
  year: string;
  previewMode?: unknown;
  model3dId?: unknown;
  template2dId?: unknown;
  thumbnailUrl?: unknown;
  availableViews?: unknown;
  pieceIds?: unknown;
  previewUrl?: unknown;
}): BikeSelection | null {
  if (!partial.brand || !partial.model || !partial.year) return null;

  const fromCatalog = findCatalogBike(
    partial.brand,
    partial.model,
    partial.year,
  );
  if (fromCatalog) return { ...fromCatalog };

  const previewMode: PreviewMode =
    partial.previewMode === "2d" || partial.previewMode === "3d"
      ? partial.previewMode
      : "3d";

  const id =
    typeof partial.id === "string" && partial.id
      ? partial.id
      : `${partial.brand}-${partial.model}-${partial.year}`
          .toLowerCase()
          .replace(/\s+/g, "-");

  if (previewMode === "2d") {
    const template2dId =
      typeof partial.template2dId === "string" && partial.template2dId
        ? partial.template2dId
        : `jp-2d-${id}`;

    return {
      id,
      brand: partial.brand,
      model: partial.model,
      year: partial.year,
      previewMode: "2d",
      template2dId,
      thumbnailUrl:
        typeof partial.thumbnailUrl === "string"
          ? partial.thumbnailUrl
          : undefined,
      pieceIds: Array.isArray(partial.pieceIds)
        ? partial.pieceIds.filter((item): item is string => typeof item === "string")
        : undefined,
      previewUrl:
        typeof partial.previewUrl === "string" ? partial.previewUrl : undefined,
    };
  }

  const model3dId =
    typeof partial.model3dId === "string" && partial.model3dId
      ? partial.model3dId
      : `jp-3d-${id}`;

  return {
    id,
    brand: partial.brand,
    model: partial.model,
    year: partial.year,
    previewMode: "3d",
    model3dId,
    thumbnailUrl:
      typeof partial.thumbnailUrl === "string"
        ? partial.thumbnailUrl
        : undefined,
    template2dId:
      typeof partial.template2dId === "string"
        ? partial.template2dId
        : undefined,
    previewUrl:
      typeof partial.previewUrl === "string" ? partial.previewUrl : undefined,
  };
}
