import { justPrintFetch } from "@/lib/justprint/fetch";
import { setStorefrontCatalog } from "@/lib/justprint/catalog";
import { normalizeStorefrontBootstrap } from "@/lib/justprint/normalize-bootstrap";
import type {
  CreateSavedDesignResponse,
  FinalizeSavedDesignResponse,
  PublicSavedDesignState,
  StorefrontBootstrap,
  StorefrontConfigurationCreateBody,
  StorefrontConfigurationPatchBody,
  UpdateSavedDesignResponse,
} from "@/types/justprint";
import type { JustPrintPreviewResult } from "@/types/configurator";

type PublicSavedDesignView = {
  configurationId: string;
  publicId: string | null;
  status: string;
  updatedAt?: string | null;
  finalized?: boolean;
  previewMode?: "2d" | "3d" | null;
  productId?: string | null;
  designId?: string | null;
  savedDesignState?: PublicSavedDesignState | null;
};

function mapStatus(
  status: string,
  finalized?: boolean,
): UpdateSavedDesignResponse["status"] {
  if (finalized || status === "finalized" || status === "completed") {
    return "finalized";
  }
  if (status === "preview_ready") return "preview_ready";
  return "draft";
}

function mapUpdateView(view: PublicSavedDesignView): UpdateSavedDesignResponse {
  return {
    configurationId: view.configurationId,
    publicId: view.publicId ?? "",
    status: mapStatus(view.status, view.finalized),
    updatedAt: view.updatedAt ?? new Date().toISOString(),
    finalized: Boolean(view.finalized),
    productId: view.productId ?? null,
    designId: view.designId ?? null,
    savedDesignState: view.savedDesignState ?? null,
  };
}

/**
 * Catalogue storefront remote : GET /api/storefront/bootstrap?shop=…
 * Aucun fallback mock — seuls les produits/designs retournés sont proposés.
 */
export async function remoteGetStorefrontBootstrap(
  shopId: string,
): Promise<StorefrontBootstrap> {
  const raw = await justPrintFetch<unknown>("/api/storefront/bootstrap", {
    method: "GET",
    searchParams: { shop: shopId },
  });
  const bootstrap = normalizeStorefrontBootstrap(raw, shopId);
  setStorefrontCatalog(bootstrap);
  return bootstrap;
}

export async function remoteCreateSavedDesign(
  body: StorefrontConfigurationCreateBody,
): Promise<CreateSavedDesignResponse> {
  return justPrintFetch<CreateSavedDesignResponse>(
    "/api/storefront/saved-designs",
    {
      method: "POST",
      body,
    },
  );
}

/**
 * GET draft authentifié (editToken) — uniquement côté Storefront parent,
 * jamais depuis l’iframe viewer.
 */
export async function remoteGetSavedDesign(
  savedDesignId: string,
  editToken: string,
): Promise<UpdateSavedDesignResponse> {
  const view = await justPrintFetch<PublicSavedDesignView>(
    `/api/storefront/saved-designs/${encodeURIComponent(savedDesignId)}`,
    {
      method: "GET",
      editToken,
    },
  );
  return mapUpdateView(view);
}

export async function remoteUpdateSavedDesign(
  savedDesignId: string,
  editToken: string,
  body: StorefrontConfigurationPatchBody,
): Promise<UpdateSavedDesignResponse> {
  const view = await justPrintFetch<PublicSavedDesignView>(
    `/api/storefront/saved-designs/${encodeURIComponent(savedDesignId)}`,
    {
      method: "PATCH",
      body,
      editToken,
    },
  );

  return mapUpdateView(view);
}

export async function remoteFinalizeSavedDesign(
  savedDesignId: string,
  editToken: string,
): Promise<FinalizeSavedDesignResponse> {
  const result = await justPrintFetch<{
    configurationId: string;
    publicId: string;
    status: string;
    source?: string | null;
    warnings?: string[];
  }>(
    `/api/storefront/saved-designs/${encodeURIComponent(savedDesignId)}/finalize`,
    {
      method: "POST",
      body: {},
      editToken,
    },
  );

  return {
    configurationId: result.configurationId,
    publicId: result.publicId,
    status: "finalized",
    previewMode: "3d",
    previewUrl: null,
    productionStatus: "not_generated",
    source: result.source,
    warnings: result.warnings,
  };
}

/** Preview réel non branché — conserve un stub pour l’UI existante. */
export async function remoteGenerateConfigurationPreview(
  savedDesignId: string,
): Promise<JustPrintPreviewResult> {
  return {
    previewMode: "3d",
    previewId: `preview-${savedDesignId}`,
    previewUrl: "",
    model3dId: "jp-3d-pending",
  };
}

/** @deprecated Prefer remoteCreateSavedDesign */
export const remoteCreateConfiguration = remoteCreateSavedDesign;
/** @deprecated Prefer remoteUpdateSavedDesign */
export const remoteUpdateConfiguration = remoteUpdateSavedDesign;
/** @deprecated Prefer remoteFinalizeSavedDesign */
export const remoteFinalizeConfiguration = remoteFinalizeSavedDesign;
