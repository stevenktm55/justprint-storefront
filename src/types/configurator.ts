import type {
  StorefrontBike,
  StorefrontBike2D,
  StorefrontBike3D,
  StorefrontDesign,
  StorefrontLogo,
  StorefrontLogoCategoryId,
} from "@/types/justprint";

export type ConfiguratorStep = 1 | 2 | 3 | 4 | 5;

export type PreviewMode = "3d" | "2d";

export type PreviewView = "left" | "front" | "right" | "top";

/** Bike with a JustPrint 3D model — aligned with StorefrontBike3D. */
export type Bike3D = StorefrontBike3D;

/** Bike with a flat 2D kit template — aligned with StorefrontBike2D. */
export type Bike2D = StorefrontBike2D;

export type BikeSelection = StorefrontBike;

export type DesignOption = StorefrontDesign;

export type LogoCategoryId = StorefrontLogoCategoryId;

export type LogoOption = StorefrontLogo;

export interface SelectedLogo {
  id: string;
  name: string;
  prominenceLevel: number;
  addedAt: number;
}

export type CheckStatus = "pending" | "checking" | "validated" | "warning";

export interface ProductionCheck {
  id: string;
  label: string;
  status: CheckStatus;
}

export interface PaletteColor {
  id: string;
  label: string;
  hex: string;
}

export interface ShopifyQueryParams {
  shop: string | null;
  product: string | null;
  variant: string | null;
  design: string | null;
  bike: string | null;
}

/** Commercial summary prepared for a future Shopify cart line item. */
export interface ShopifyCartSummary {
  configurationId: string;
  bikeLabel: string;
  designName: string;
  riderName: string;
  raceNumber: string;
  selectedColors: string[];
  selectedLogoNames: string[];
  selectedLogoCount: number;
  previewMode: PreviewMode;
  previewUrl: string | null;
  variantId: string | null;
}

export interface ConfigurationLogoSummary {
  name: string;
  prominenceLevel: number;
  prominenceLabel: string;
}

export interface ConfigurationCompletionSummary {
  bike: string;
  design: string;
  riderName: string;
  raceNumber: string;
  colors: string[];
  logos: ConfigurationLogoSummary[];
  previewMode: PreviewMode;
}

export interface JustPrintCompletionMessage {
  type: "JUSTPRINT_CONFIGURATION_COMPLETED";
  configurationId: string;
  variantId: string | null;
  previewUrl: string | null;
  previewMode: PreviewMode;
  productionStatus: "ready";
  source: "rawmoto-local-demo";
  summary: ConfigurationCompletionSummary;
}

/** Commercial summary embedded in JUSTPRINT_ADD_TO_CART for the parent Shopify page. */
export interface JustPrintAddToCartSummary {
  bikeLabel: string;
  designName: string;
  riderName: string;
  raceNumber: string;
  previewMode: PreviewMode;
  selectedColors: string[];
  selectedLogoNames: string[];
  selectedLogoCount: number;
}

/** Outgoing: ask the parent Shopify page to add the configured kit to cart. */
export interface JustPrintAddToCartMessage {
  type: "JUSTPRINT_ADD_TO_CART";
  configurationId: string;
  variantId: string | null;
  source: "justprint-storefront";
  summary: JustPrintAddToCartSummary;
}

/** Incoming: parent Shopify page reports a cart failure. */
export interface JustPrintCartErrorMessage {
  type: "JUSTPRINT_CART_ERROR";
  message: string;
}

/** Future JustPrint generatePreview / completeConfiguration payloads. */
export type JustPrintPreviewResult =
  | {
      previewMode: "3d";
      previewId: string;
      previewUrl: string;
      model3dId: string;
      availableViews?: PreviewView[];
    }
  | {
      previewMode: "2d";
      previewId: string;
      previewUrl: string;
      template2dId: string;
      pieceIds?: string[];
    };

export type JustPrintCompletionResult = JustPrintPreviewResult & {
  configurationId: string;
};

export interface ConfiguratorState {
  currentStep: ConfiguratorStep;
  bike: BikeSelection | null;
  selectedDesign: string | null;
  riderName: string;
  raceNumber: string;
  plateColor: string;
  numberColor: string;
  nameColor: string;
  palette: PaletteColor[];
  selectedLogos: SelectedLogo[];
  previewView: PreviewView;
  productionChecks: ProductionCheck[];
  configurationId: string | null;
  draftRestored: boolean;
  /** When true, design selection returns to the final preview without resetting other choices. */
  returnToFinalPreview: boolean;
}

export const TOTAL_STEPS = 5 as const;

export const STEP_LABELS: Record<ConfiguratorStep, string> = {
  1: "Moto",
  2: "Design",
  3: "Personnalisation",
  4: "Logos",
  5: "Aperçu final",
};

export const DEFAULT_PALETTE: PaletteColor[] = [
  { id: "primary", label: "Orange", hex: "#FF5A00" },
  { id: "secondary", label: "Noir", hex: "#111111" },
  { id: "tertiary", label: "Blanc", hex: "#FFFFFF" },
  { id: "accent", label: "Bleu", hex: "#0066FF" },
];

export const DEFAULT_PRODUCTION_CHECKS: ProductionCheck[] = [
  { id: "bike-year", label: "Moto et année compatibles", status: "pending" },
  { id: "design-template", label: "Design associé au bon gabarit", status: "pending" },
  { id: "number-safe", label: "Numéro dans une zone sécurisée", status: "pending" },
  { id: "text-vector", label: "Textes convertibles en vectoriel", status: "pending" },
  { id: "logo-margins", label: "Logos dans les marges autorisées", status: "pending" },
  { id: "bleed", label: "Fonds perdus présents", status: "pending" },
  { id: "colors", label: "Couleurs de production préparées", status: "pending" },
  { id: "cut", label: "Éléments correctement découpés", status: "pending" },
  { id: "pdf", label: "Export PDF vectoriel disponible", status: "pending" },
];

export function createInitialState(): ConfiguratorState {
  return {
    currentStep: 1,
    bike: null,
    selectedDesign: null,
    riderName: "",
    raceNumber: "17",
    plateColor: "#FFFFFF",
    numberColor: "#111111",
    nameColor: "#FFFFFF",
    palette: DEFAULT_PALETTE.map((color) => ({ ...color })),
    selectedLogos: [],
    previewView: "left",
    productionChecks: DEFAULT_PRODUCTION_CHECKS.map((check) => ({ ...check })),
    configurationId: null,
    draftRestored: false,
    returnToFinalPreview: false,
  };
}
