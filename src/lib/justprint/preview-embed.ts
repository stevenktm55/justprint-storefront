import { isClassicDesignId } from "@/lib/justprint/catalog";
import { getJustPrintEnvironment } from "@/lib/justprint/environment";
import type { ConfiguratorStep, PreviewMode } from "@/types/configurator";
import type { StorefrontViewerDisplayMode } from "@/types/justprint";

/** Cas pilote remote — seul combo avec moteur JustPrint embarqué pour l’instant. */
export const REMOTE_PILOT_BIKE_ID = "yamaha-450-yzf-2025";
/** Slug storefront historique — préférer `isClassicDesignId` (accepte aussi l’UUID). */
export const REMOTE_PILOT_DESIGN_ID = "classic";
/** UUID interne JustPrint du design CLASSIC (Yamaha 450 YZF 2025). */
export const REMOTE_PILOT_DESIGN_INTERNAL_ID =
  "7b841fac-b0e9-4b97-96cc-745434d8c090";

export type RemotePreviewKind =
  | "mock_local"
  | "remote_iframe"
  | "remote_2d"
  | "preparing"
  | "unsupported";

export function isRemotePilot3dSupported(
  bikeId: string | null | undefined,
  designId: string | null | undefined,
  previewMode: PreviewMode,
): boolean {
  const isClassic =
    designId === REMOTE_PILOT_DESIGN_ID ||
    designId === REMOTE_PILOT_DESIGN_INTERNAL_ID ||
    isClassicDesignId(designId);
  return (
    previewMode === "3d" &&
    bikeId === REMOTE_PILOT_BIKE_ID &&
    isClassic
  );
}

/**
 * Décide quel aperçu afficher.
 * En remote : jamais de faux rendu SVG/CSS pour une config non mock.
 */
export function resolveRemotePreviewKind(args: {
  isMockMode: boolean;
  bikeId: string | null | undefined;
  designId: string | null | undefined;
  previewMode: PreviewMode;
  savedDesignId: string | null | undefined;
}): RemotePreviewKind {
  if (args.isMockMode) {
    return "mock_local";
  }

  if (args.previewMode === "2d") {
    return args.savedDesignId ? "remote_2d" : "preparing";
  }

  if (
    isRemotePilot3dSupported(args.bikeId, args.designId, args.previewMode)
  ) {
    return args.savedDesignId ? "remote_iframe" : "preparing";
  }

  return "unsupported";
}

export interface BuildStorefrontPreviewEmbedUrlArgs {
  savedDesignId: string;
  /** Requis pour les brouillons JustPrint — passé en query `token`, jamais loggé. */
  editToken: string | null;
  /** Cache-bust / sync après PATCH réussi. */
  version: string | number;
  /** Origine du parent (RawMoto) pour postMessage sortant ciblé. */
  parentOrigin?: string;
  view?: string;
  apiUrl?: string;
}

/**
 * URL d’embed JustPrint — UUID `saved_designs.id`, pas le publicId JP-RM-….
 * Route réelle : `/embed/storefront-preview/:savedDesignId`
 * (2D / legacy — le 3D persistant utilise `buildStorefrontViewerEmbedUrl`.)
 */
export function buildStorefrontPreviewEmbedUrl(
  args: BuildStorefrontPreviewEmbedUrlArgs,
): string {
  const apiUrl = (args.apiUrl ?? getJustPrintEnvironment().apiUrl).replace(
    /\/$/,
    "",
  );
  const path = `${apiUrl}/embed/storefront-preview/${encodeURIComponent(args.savedDesignId)}`;
  const params = new URLSearchParams();
  if (args.editToken) {
    params.set("token", args.editToken);
  }
  params.set("v", String(args.version));
  if (args.parentOrigin) {
    params.set("parentOrigin", args.parentOrigin);
  }
  if (args.view) {
    params.set("view", args.view);
  }
  return `${path}?${params.toString()}`;
}

export interface BuildStorefrontViewerEmbedUrlArgs {
  shopId: string;
  bikeId: string;
  apiUrl?: string;
}

/**
 * URL du viewer 3D persistant JustPrint.
 * Stable tant que `shop` + `bike` ne changent pas — pas de savedDesignId,
 * version, display mode ni cache-bust dans le `src`.
 */
export function buildStorefrontViewerEmbedUrl(
  args: BuildStorefrontViewerEmbedUrlArgs,
): string {
  const apiUrl = (args.apiUrl ?? getJustPrintEnvironment().apiUrl).replace(
    /\/$/,
    "",
  );
  const params = new URLSearchParams({
    shop: args.shopId,
    bike: args.bikeId,
  });
  return `${apiUrl}/embed/storefront-viewer?${params.toString()}`;
}

/** Viewer 3D persistant : remote + moto 3D (pas de mock, pas de 2D). */
export function shouldUsePersistent3dViewer(args: {
  isMockMode: boolean;
  previewMode: PreviewMode;
}): boolean {
  return !args.isMockMode && args.previewMode === "3d";
}

/**
 * Mode d’affichage unique du viewer persistant.
 * Moto / Design → background (préchargement hors écran).
 * Personnalisation / Logos / Finale → compact (ancre layout).
 * Agrandir (`isExpanded`) → full overlay, quelle que soit l’étape.
 */
export function getViewerDisplayMode(args: {
  currentStep: ConfiguratorStep;
  isExpanded: boolean;
  active: boolean;
  hasAnchor: boolean;
}): StorefrontViewerDisplayMode {
  if (!args.active) return "background";
  if (args.isExpanded) return "full";
  if (args.currentStep >= 3 && args.currentStep <= 5 && args.hasAnchor) {
    return "compact";
  }
  return "background";
}
