import type { PreviewMode, PreviewView } from "@/types/configurator";

/** Boutique storefront JustPrint. */
export interface StorefrontShop {
  id: string;
  name: string;
  slug: string;
  label?: string;
  /** UUID `shops.id` JustPrint — jamais un secret. */
  justprintShopId?: string | null;
}

/** CMJN 0–100 tel qu’enregistré en admin (jamais recalculé côté Storefront). */
export interface StorefrontCmyk {
  c: number;
  m: number;
  y: number;
  k: number;
}

export interface StorefrontRgb {
  r: number;
  g: number;
  b: number;
}

/**
 * Sélection riche transmise au saved_design (`personalization.colorSelections`).
 * `hex` est requis ; CMJN / colorId / name sont conservés depuis la bibliothèque.
 */
export interface StorefrontColorSelection {
  colorId?: string | null;
  hex: string;
  name?: string | null;
  cmyk?: StorefrontCmyk | null;
  libraryId?: string | null;
}

/** Couleur d’une bibliothèque boutique (bootstrap `colorLibraries[].colors[]`). */
export interface StorefrontLibraryColor {
  id: string;
  name: string;
  hex: string;
  rgb?: StorefrontRgb | null;
  cmyk?: StorefrontCmyk | null;
  displayOrder: number;
  active?: boolean;
}

/** Bibliothèque de couleurs publique (une ou plusieurs par boutique). */
export interface StorefrontColorLibrary {
  id: string;
  name: string;
  shopId: string;
  active: boolean;
  colors: StorefrontLibraryColor[];
  /** Ordre d’affichage optionnel renvoyé par l’API. */
  displayOrder?: number;
}

/** Valeur par défaut d’un slot (bootstrap). */
export interface StorefrontColorSlotDefault {
  hex: string;
  colorId: string | null;
  name: string | null;
  cmyk: StorefrontCmyk | null;
  libraryId?: string | null;
}

export interface StorefrontColorSlot {
  key: string;
  label: string;
  /** HEX d’affichage / fallback (égal à defaultValue.hex quand présent). */
  defaultHex: string;
  defaultValue?: StorefrontColorSlotDefault;
  originalHex?: string;
  isPlate?: boolean;
  slotIndex?: number;
}

type StorefrontBikeBase = {
  id: string;
  brand: string;
  model: string;
  year: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  /** Slots au niveau moto (alias historique — préférer design.colorSlots). */
  colorSlots?: StorefrontColorSlot[];
  /** UUID produit JustPrint si fourni via `products`. */
  internalProductId?: string;
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
  /**
   * Identifiant utilisé pour la sélection UI et le saved_design.
   * Remote : UUID interne JustPrint quand disponible ; sinon slug storefront.
   */
  id: string;
  /** Slug storefront (ex. `classic`) — utile pour les gates pilote. */
  storefrontId?: string;
  name: string;
  badge: string;
  description: string;
  /** Miniature réelle du design (remote) ou accents dérivés (mock). */
  thumbnailUrl?: string | null;
  /** Accents d’affichage dérivés des slots — mock / fallback UI uniquement. */
  accentColors: [string, string, string];
  /** Slots de couleurs du design (source de vérité remote). */
  colorSlots?: StorefrontColorSlot[];
  /** Optional bike ids this design is compatible with. Empty / omitted = all. */
  compatibleBikeIds?: string[];
  productionTemplateId?: string;
  kitColorHexList?: string[];
}

/** Catégories mock historiques + ids libres renvoyés par le bootstrap remote. */
export type StorefrontLogoCategoryId = string;

export interface StorefrontLogoCategory {
  id: StorefrontLogoCategoryId;
  label: string;
}

export interface StorefrontLogo {
  id: string;
  name: string;
  category: StorefrontLogoCategoryId;
  imageUrl?: string;
}

/** Réponse unique de bootstrap storefront. */
export interface StorefrontBootstrap {
  shop: StorefrontShop;
  bikes: StorefrontBike[];
  designs: StorefrontDesign[];
  logoCategories: StorefrontLogoCategory[];
  logos: StorefrontLogo[];
  /** Bibliothèques de couleurs de la boutique (remote). Absentes en mock si non seedées. */
  colorLibraries: StorefrontColorLibrary[];
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

/** Couleur de palette / slot dans l’état configurateur. */
export interface PaletteColor {
  /** Clé technique du slot (ex. primary) — utilisée pour le PATCH. */
  id: string;
  /** Label public du slot. */
  label: string;
  hex: string;
  colorId?: string | null;
  libraryId?: string | null;
  name?: string | null;
  rgb?: StorefrontRgb | null;
  cmyk?: StorefrontCmyk | null;
  /** Couleur absente de la bibliothèque mais encore présente dans le brouillon. */
  archived?: boolean;
  isPlate?: boolean;
}

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
    /** Map slotKey → HEX (pipeline historique). */
    colors: Record<string, string>;
    /** Sélections riches (colorId + CMJN) — source de vérité admin. */
    colorSelections?: Record<string, StorefrontColorSelection>;
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

/** Réponse POST /api/storefront/saved-designs (configurationId = UUID saved_designs). */
export interface CreateSavedDesignResponse {
  /** UUID réel `saved_designs.id`. */
  configurationId: string;
  publicId: string;
  editToken: string;
  status: ConfigurationStatus | string;
  createdAt: string;
  productId?: string;
  designId?: string | null;
  warnings?: string[];
  /** État public pour le viewer (postMessage) — jamais d’editToken. */
  savedDesignState?: PublicSavedDesignState | null;
}

/** @deprecated Prefer CreateSavedDesignResponse */
export type CreateConfigurationResponse = CreateSavedDesignResponse;

/** Sous-ensemble public de SavedDesignConfigState (JustPrint). */
export interface PublicSavedDesignState {
  values: Record<string, unknown>;
  currentProductId: string | null;
  textOverrides?: Record<string, unknown>;
  logoOverrides?: Record<string, unknown>;
}

/**
 * Configuration runtime publique pour JUSTPRINT_APPLY_RUNTIME_CONFIG.
 * Dérivée de SavedDesignConfigState + designId — jamais d’editToken.
 */
export interface StorefrontViewerRuntimeConfiguration {
  currentProductId: string;
  designId: string;
  values: Record<string, unknown>;
  textOverrides?: Record<string, unknown>;
  logoOverrides?: Record<string, unknown>;
}

export interface UpdateSavedDesignResponse {
  configurationId: string;
  publicId: string;
  status: ConfigurationStatus | string;
  updatedAt: string;
  finalized?: boolean;
  productId?: string | null;
  designId?: string | null;
  savedDesignState?: PublicSavedDesignState | null;
}

/** @deprecated Prefer UpdateSavedDesignResponse */
export type UpdateConfigurationResponse = UpdateSavedDesignResponse;

export interface FinalizeSavedDesignResponse {
  configurationId: string;
  publicId: string;
  status: ConfigurationStatus | string;
  previewMode?: PreviewMode;
  previewUrl?: string | null;
  productionStatus?: "not_generated" | "ready" | "pending" | "error";
  source?: string | null;
  warnings?: string[];
}

/** @deprecated Prefer FinalizeSavedDesignResponse */
export type FinalizeConfigurationResponse = FinalizeSavedDesignResponse;

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

/** Statut du viewer 3D persistant côté Storefront. */
export type StorefrontViewerStatus =
  | "idle"
  | "preloading"
  | "model-ready"
  | "applying-design"
  | "ready"
  | "error";

/** Mode d’affichage du conteneur iframe unique. */
export type StorefrontViewerDisplayMode = "background" | "compact" | "full";

/** Messages postMessage émis par l’iframe d’aperçu JustPrint. */
export type JustPrintPreviewMessage =
  | {
      type: "JUSTPRINT_MODEL_PRELOAD_STARTED";
      bikeId?: string;
      shop?: string;
      bike?: string;
    }
  | {
      type: "JUSTPRINT_MODEL_PRELOADED";
      bikeId?: string;
      shop?: string;
      bike?: string;
      elapsedMs?: number;
    }
  | {
      type: "JUSTPRINT_SAVED_DESIGN_APPLYING";
      savedDesignId?: string;
      configurationId?: string;
      version?: number;
    }
  | {
      type: "JUSTPRINT_PREVIEW_READY";
      configurationId?: string;
      savedDesignId?: string;
      version?: number | null;
    }
  | {
      type: "JUSTPRINT_PREVIEW_UPDATED";
      configurationId?: string;
      savedDesignId?: string;
      version?: number;
      previewUrl?: string;
    }
  | {
      type: "JUSTPRINT_PREVIEW_ERROR";
      configurationId?: string;
      savedDesignId?: string;
      message: string;
      code?: string;
    };

/** Messages sortants Storefront → iframe viewer persistant. */
export type JustPrintViewerOutboundMessage =
  | {
      type: "JUSTPRINT_LOAD_SAVED_DESIGN";
      savedDesignId: string;
      /** Entier ≥ 1 — jamais un ISO timestamp, jamais l’editToken. */
      version: number;
    }
  | {
      type: "JUSTPRINT_REFRESH_SAVED_DESIGN";
      savedDesignId: string;
      version: number;
    }
  | {
      type: "JUSTPRINT_APPLY_RUNTIME_CONFIG";
      savedDesignId: string;
      version: number;
      configuration: StorefrontViewerRuntimeConfiguration;
    }
  | {
      type: "JUSTPRINT_SET_DISPLAY_MODE";
      mode: StorefrontViewerDisplayMode;
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
