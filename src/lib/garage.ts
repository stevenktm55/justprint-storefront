import type { BikeSelection } from "@/types/configurator";
import {
  DEFAULT_GARAGE_BIKE_IDS,
  findCatalogBike,
  findCatalogBikeById,
} from "@/lib/justprint/catalog";

export const GARAGE_STORAGE_KEY = "rawmoto-garage-bikes";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeGarageBike(raw: unknown): BikeSelection | null {
  if (!isRecord(raw)) return null;

  if (typeof raw.id === "string") {
    const fromCatalog = findCatalogBikeById(raw.id);
    if (fromCatalog) return fromCatalog;
  }

  const brand = typeof raw.brand === "string" ? raw.brand : "";
  const model = typeof raw.model === "string" ? raw.model : "";
  const year =
    typeof raw.year === "string"
      ? raw.year
      : typeof raw.year === "number"
        ? String(raw.year)
        : "";

  if (!brand || !model || !year) return null;
  return findCatalogBike(brand, model, year);
}

function defaultGarage(): BikeSelection[] {
  return DEFAULT_GARAGE_BIKE_IDS.flatMap((id) => {
    const bike = findCatalogBikeById(id);
    return bike ? [bike] : [];
  });
}

export function loadGarageBikes(): BikeSelection[] {
  if (!isBrowser()) return defaultGarage();

  try {
    const raw = window.localStorage.getItem(GARAGE_STORAGE_KEY);
    if (!raw) return defaultGarage();

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultGarage();

    const bikes = parsed
      .map(normalizeGarageBike)
      .filter((bike): bike is BikeSelection => bike !== null);

    // Deduplicate by id
    const seen = new Set<string>();
    return bikes.filter((bike) => {
      if (seen.has(bike.id)) return false;
      seen.add(bike.id);
      return true;
    });
  } catch {
    return defaultGarage();
  }
}

export function saveGarageBikes(bikes: BikeSelection[]): void {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(
      GARAGE_STORAGE_KEY,
      JSON.stringify(bikes.map((bike) => ({ id: bike.id }))),
    );
  } catch {
    // Ignore quota / private mode errors in demo mode.
  }
}

export function removeGarageBike(
  bikes: BikeSelection[],
  bikeId: string,
): BikeSelection[] {
  const next = bikes.filter((bike) => bike.id !== bikeId);
  saveGarageBikes(next);
  return next;
}

export function addGarageBike(
  bikes: BikeSelection[],
  bike: BikeSelection,
): BikeSelection[] {
  if (bikes.some((item) => item.id === bike.id)) return bikes;
  const next = [...bikes, bike];
  saveGarageBikes(next);
  return next;
}
