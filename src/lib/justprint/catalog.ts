import type {
  StorefrontBike,
  StorefrontBootstrap,
  StorefrontDesign,
  StorefrontLogo,
  StorefrontLogoCategory,
} from "@/types/justprint";

let catalog: StorefrontBootstrap | null = null;

export function setStorefrontCatalog(bootstrap: StorefrontBootstrap): void {
  catalog = bootstrap;
}

export function getStorefrontCatalog(): StorefrontBootstrap | null {
  return catalog;
}

export function requireStorefrontCatalog(): StorefrontBootstrap {
  if (!catalog) {
    throw new Error(
      "Storefront catalog is not loaded yet. Call getStorefrontBootstrap() first.",
    );
  }
  return catalog;
}

export function getCatalogBikes(): StorefrontBike[] {
  return catalog?.bikes ?? [];
}

export function getCatalogDesigns(): StorefrontDesign[] {
  return catalog?.designs ?? [];
}

export function getCatalogLogoCategories(): StorefrontLogoCategory[] {
  return catalog?.logoCategories ?? [];
}

export function getCatalogLogos(): StorefrontLogo[] {
  return catalog?.logos ?? [];
}

export function findCatalogBike(
  brand: string,
  model: string,
  year: string,
): StorefrontBike | null {
  return (
    getCatalogBikes().find(
      (bike) =>
        bike.brand === brand && bike.model === model && bike.year === year,
    ) ?? null
  );
}

export function findCatalogBikeById(id: string): StorefrontBike | null {
  return getCatalogBikes().find((bike) => bike.id === id) ?? null;
}

export function findCatalogDesignById(id: string): StorefrontDesign | null {
  return getCatalogDesigns().find((design) => design.id === id) ?? null;
}

export function getBikeBrands(): string[] {
  return Array.from(new Set(getCatalogBikes().map((bike) => bike.brand))).sort();
}

export function getBikeModelsByBrand(brand: string): string[] {
  return Array.from(
    new Set(
      getCatalogBikes()
        .filter((bike) => bike.brand === brand)
        .map((bike) => bike.model),
    ),
  ).sort();
}

export function getYearsForBike(brand: string, model: string): string[] {
  return Array.from(
    new Set(
      getCatalogBikes()
        .filter((bike) => bike.brand === brand && bike.model === model)
        .map((bike) => bike.year),
    ),
  ).sort((a, b) => Number(b) - Number(a));
}

export function getLogosByCategory(
  categoryId: StorefrontLogoCategory["id"],
): StorefrontLogo[] {
  return getCatalogLogos().filter((logo) => logo.category === categoryId);
}

export function getCompatibleDesigns(bikeId: string): StorefrontDesign[] {
  const designs = getCatalogDesigns();
  return designs.filter((design) => {
    if (!design.compatibleBikeIds || design.compatibleBikeIds.length === 0) {
      return true;
    }
    return design.compatibleBikeIds.includes(bikeId);
  });
}

export const DEFAULT_GARAGE_BIKE_IDS = [
  "ktm-450-sxf-2024",
  "ktm-450-sxf-2020",
  "honda-crf450r-2018",
] as const;
