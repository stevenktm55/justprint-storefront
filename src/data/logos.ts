import type { LogoCategoryId, LogoOption } from "@/types/configurator";

/** Seed data only — consumed by the mock JustPrint bootstrap, not by UI components. */
export interface LogoCategory {
  id: LogoCategoryId;
  label: string;
}

export const LOGO_CATEGORIES: LogoCategory[] = [
  { id: "pneus", label: "Pneus" },
  { id: "suspensions", label: "Suspensions" },
  { id: "equipement", label: "Équipement" },
  { id: "huiles", label: "Huiles" },
  { id: "accessoires", label: "Accessoires" },
  { id: "sponsors", label: "Mes sponsors" },
];

export const LOGO_LIBRARY: LogoOption[] = [
  { id: "dunlop", name: "Dunlop", category: "pneus" },
  { id: "michelin", name: "Michelin", category: "pneus" },
  { id: "pirelli", name: "Pirelli", category: "pneus" },
  { id: "bridgestone", name: "Bridgestone", category: "pneus" },

  { id: "wp", name: "WP", category: "suspensions" },
  { id: "kyb", name: "KYB", category: "suspensions" },
  { id: "showa", name: "Showa", category: "suspensions" },
  { id: "ohlins", name: "Ohlins", category: "suspensions" },

  { id: "thor", name: "Thor", category: "equipement" },
  { id: "fox", name: "Fox", category: "equipement" },
  { id: "alpinestars", name: "Alpinestars", category: "equipement" },
  { id: "oakley", name: "Oakley", category: "equipement" },

  { id: "motorex", name: "Motorex", category: "huiles" },
  { id: "motul", name: "Motul", category: "huiles" },
  { id: "putoline", name: "Putoline", category: "huiles" },

  { id: "renthal", name: "Renthal", category: "accessoires" },
  { id: "twin-air", name: "Twin Air", category: "accessoires" },
  { id: "acerbis", name: "Acerbis", category: "accessoires" },
  { id: "polisport", name: "Polisport", category: "accessoires" },

  { id: "garage-martin", name: "Garage Martin", category: "sponsors" },
  { id: "rawmoto", name: "RawMoto", category: "sponsors" },
  { id: "sponsor-perso", name: "Sponsor perso", category: "sponsors" },
];

