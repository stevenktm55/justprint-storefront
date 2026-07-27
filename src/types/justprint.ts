import type { PaletteColor, PreviewMode, PreviewView } from "@/types/configurator";

/** Boutique storefront JustPrint. */
export interface StorefrontShop {
  id: string;
  name: string;
  slug: string;
}

type StorefrontBikeBase = {
  id: string;
  brand: string;
  model: string;
  year: string;
  thumbnailUrl?: string;
  previewUrl?: string;
};

/** Moto avec modèle 3D JustPrint. */
export type StorefrontBike3D = StorefrontBikeBase & {
  previewMode: "3d";
  model3dId: string;
  template2dId?: string;
  availableViews?: PreviewView[];
};

/** Moto avec gabarit 2D JustPrint. */
export type StorefrontBike2D = StorefrontBikeBase & {
  previewMode: "2d";
  template2dId: string;
  model3dId?: never;
  pieceIds?: string[];
};

export type StorefrontBike = StorefrontBike3D | StorefrontBike2D;

export interface StorefrontDesign {
  id: string;
  name: string;
  badge: string;
  description: string;
  accentColors: [string, string, string];
  /** Optional bike ids this design is compatible with. Empty / omitted = all. */
  compatibleBikeIds?: string[];
}

export type StorefrontLogoCategoryId =
  | "pneus"
  | "suspensions"
  | "equipement"
  | "huiles"
  | "accessoires"
  | "sponsors";

export interface StorefrontLogoCategory {
  id: StorefrontLogoCategoryId;
  label: string;
}

export interface StorefrontLogo {
  id: string;
  name: string;
  category: StorefrontLogoCategoryId;
}

/** Réponse unique de bootstrap storefront. */
export interface StorefrontBootstrap {
  shop: StorefrontShop;
  bikes: StorefrontBike[];
  designs: StorefrontDesign[];
  logoCategories: StorefrontLogoCategory[];
  logos: StorefrontLogo[];
}

export type ConfigurationStatus = "draft" | "preview_ready" | "completed";

export interface ConfigurationPersonalization {
  riderName: string;
  raceNumber: string;
  plateColor: string;
  numberColor: string;
  nameColor: string;
  palette: PaletteColor[];
}

export interface SelectedConfigurationLogo {
  id: string;
  name: string;
  prominenceLevel: number;
  addedAt?: number;
}

/** Brouillon de configuration JustPrint. */
export interface ConfigurationDraft {
  id: string;
  shopId: string;
  bikeId: string;
  designId: string;
  personalization: ConfigurationPersonalization;
  logos: SelectedConfigurationLogo[];
  status: ConfigurationStatus;
  previewMode: PreviewMode;
  createdAt: string;
  updatedAt: string;
}

export interface CompletedConfiguration {
  configurationId: string;
  status: "completed";
  previewMode: PreviewMode;
  previewUrl: string;
  model3dId?: string;
  template2dId?: string;
  availableViews?: PreviewView[];
  pieceIds?: string[];
}

/** Messages postMessage émis par l’iframe d’aperçu JustPrint. */
export type JustPrintPreviewMessage =
  | {
      type: "JUSTPRINT_PREVIEW_READY";
      configurationId: string;
    }
  | {
      type: "JUSTPRINT_PREVIEW_UPDATED";
      configurationId: string;
      previewUrl?: string;
    }
  | {
      type: "JUSTPRINT_PREVIEW_ERROR";
      configurationId: string;
      message: string;
    };

export interface CreateConfigurationInput {
  shopId: string;
  bikeId: string;
  designId: string;
  personalization?: ConfigurationPersonalization;
  logos?: SelectedConfigurationLogo[];
  previewMode: PreviewMode;
}

export interface UpdateConfigurationInput {
  configurationId: string;
  bikeId?: string;
  designId?: string;
  personalization?: ConfigurationPersonalization;
  logos?: SelectedConfigurationLogo[];
  previewMode?: PreviewMode;
  status?: ConfigurationStatus;
}

export type SyncStatus = "idle" | "saving" | "saved" | "error";
