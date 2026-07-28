import type {
  StorefrontBike,
  StorefrontBootstrap,
  StorefrontColorLibrary,
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

export function getCatalogColorLibraries(): StorefrontColorLibrary[] {
  return catalog?.colorLibraries ?? [];
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
  const designs = getCatalogDesigns();
  return (
    designs.find((design) => design.id === id) ??
    designs.find((design) => design.storefrontId === id) ??
    null
  );
}

/** True when the design is the RawMoto CLASSIC pilot (UUID or slug). */
export function isClassicDesign(
  design: StorefrontDesign | null | undefined,
): boolean {
  if (!design) return false;
  return (
    design.storefrontId === "classic" ||
    design.id === "classic" ||
    design.name.toUpperCase() === "CLASSIC"
  );
}

export function isClassicDesignId(designId: string | null | undefined): boolean {
  if (!designId) return false;
  return isClassicDesign(findCatalogDesignById(designId));
}

export function findCatalogLogoById(id: string): StorefrontLogo | null {
  return getCatalogLogos().find((logo) => logo.id === id) ?? null;
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
