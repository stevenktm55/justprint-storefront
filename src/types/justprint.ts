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

/** Server-side configuration lifecycle (JustPrint API). */
export type ConfigurationStatus =
  | "draft"
  | "preview_ready"
  | "completed"
  | "finalized";

/** Client-side sync pipeline status. */
export type SynchronizationStatus =
  | "idle"
  | "creating"
  | "saving"
  | "saved"
  | "finalizing"
  | "finalized"
  | "error";

/** @deprecated Prefer SynchronizationStatus */
export type SyncStatus = SynchronizationStatus;

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

/** Snapshot JSON versionné attendu par l’API JustPrint. */
export interface StorefrontConfigurationData {
  version: 1;
  bike?: {
    id: string;
    brand: string;
    model: string;
    year: number | string;
    previewMode: PreviewMode;
    model3dId?: string | null;
    template2dId?: string | null;
  };
  design?: {
    id: string;
    name: string;
  };
  personalization?: {
    riderName: string;
    raceNumber: string;
    plateColor?: string | null;
    colors: Record<string, string>;
  };
  logos?: Array<{
    logoId: string;
    name: string;
    categoryId?: string | null;
    prominenceLevel: number;
    prominenceLabel?: string | null;
    source?: string | null;
  }>;
  storefront?: {
    shopId: string;
    locale: string;
    productHandle?: string | null;
    shopifyVariantId?: string | null;
  };
}

export interface StorefrontConfigurationCreateBody {
  shopId: string;
  bikeId?: string | null;
  designId?: string | null;
  previewMode: PreviewMode;
  configurationData: StorefrontConfigurationData;
}

export interface StorefrontConfigurationPatchBody {
  bikeId?: string | null;
  designId?: string | null;
  previewMode?: PreviewMode;
  configurationData?: StorefrontConfigurationData;
}

/** Brouillon de configuration JustPrint (état client unifié). */
export interface ConfigurationDraft {
  /** UUID interne JustPrint (ou id mock). */
  id: string;
  /** Identifiant public lisible (JP-RM-…). */
  publicId: string;
  /**
   * Jeton d’édition — jamais affiché, jamais postMessagé, jamais loggé.
   * Absent après finalisation côté serveur.
   */
  editToken: string;
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

export interface CreateConfigurationResponse {
  configurationId: string;
  publicId: string;
  editToken: string;
  status: ConfigurationStatus;
  createdAt: string;
}

export interface UpdateConfigurationResponse {
  configurationId: string;
  publicId: string;
  status: ConfigurationStatus;
  updatedAt: string;
}

export interface FinalizeConfigurationResponse {
  configurationId: string;
  publicId: string;
  status: ConfigurationStatus;
  previewMode: PreviewMode;
  previewUrl: string | null;
  productionStatus: "not_generated" | "ready" | "pending" | "error";
}

export interface CompletedConfiguration {
  configurationId: string;
  publicId?: string;
  status: "completed" | "finalized";
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

/** @deprecated Prefer StorefrontConfigurationCreateBody + snapshot builder */
export interface CreateConfigurationInput {
  shopId: string;
  bikeId: string;
  designId: string;
  personalization?: ConfigurationPersonalization;
  logos?: SelectedConfigurationLogo[];
  previewMode: PreviewMode;
  configurationData?: StorefrontConfigurationData;
}

/** @deprecated Prefer StorefrontConfigurationPatchBody + editToken */
export interface UpdateConfigurationInput {
  configurationId: string;
  editToken: string;
  bikeId?: string;
  designId?: string;
  personalization?: ConfigurationPersonalization;
  logos?: SelectedConfigurationLogo[];
  previewMode?: PreviewMode;
  status?: ConfigurationStatus;
  configurationData?: StorefrontConfigurationData;
}
