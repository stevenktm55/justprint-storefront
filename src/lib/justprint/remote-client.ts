import { justPrintFetch } from "@/lib/justprint/fetch";
import { setStorefrontCatalog } from "@/lib/justprint/catalog";
import { buildMockStorefrontBootstrap } from "@/lib/justprint/mock-bootstrap";
import type {
  CreateConfigurationResponse,
  FinalizeConfigurationResponse,
  StorefrontBootstrap,
  StorefrontConfigurationCreateBody,
  StorefrontConfigurationPatchBody,
  UpdateConfigurationResponse,
} from "@/types/justprint";
import type { JustPrintPreviewResult } from "@/types/configurator";

/**
 * Catalogue storefront : l’API JustPrint n’expose pas encore /bootstrap.
 * En remote on réutilise le catalogue mock local pour le parcours UI,
 * tandis que create / patch / finalize passent par la vraie API.
 */
export async function remoteGetStorefrontBootstrap(
  shopId: string,
): Promise<StorefrontBootstrap> {
  try {
    const bootstrap = await justPrintFetch<StorefrontBootstrap>(
      "/api/storefront/bootstrap",
      {
        method: "GET",
        searchParams: { shop: shopId },
      },
    );
    setStorefrontCatalog(bootstrap);
    return bootstrap;
  } catch {
    const bootstrap = buildMockStorefrontBootstrap(shopId);
    setStorefrontCatalog(bootstrap);
    return bootstrap;
  }
}

export async function remoteCreateConfiguration(
  body: StorefrontConfigurationCreateBody,
): Promise<CreateConfigurationResponse> {
  return justPrintFetch<CreateConfigurationResponse>(
    "/api/storefront/configurations",
    {
      method: "POST",
      body,
    },
  );
}

export async function remoteUpdateConfiguration(
  configurationId: string,
  editToken: string,
  body: StorefrontConfigurationPatchBody,
): Promise<UpdateConfigurationResponse> {
  return justPrintFetch<UpdateConfigurationResponse>(
    `/api/storefront/configurations/${encodeURIComponent(configurationId)}`,
    {
      method: "PATCH",
      body,
      editToken,
    },
  );
}

export async function remoteFinalizeConfiguration(
  configurationId: string,
  editToken: string,
): Promise<FinalizeConfigurationResponse> {
  return justPrintFetch<FinalizeConfigurationResponse>(
    `/api/storefront/configurations/${encodeURIComponent(configurationId)}/finalize`,
    {
      method: "POST",
      body: {},
      editToken,
    },
  );
}

/** Preview réel non branché — conserve un stub pour l’UI existante. */
export async function remoteGenerateConfigurationPreview(
  configurationId: string,
): Promise<JustPrintPreviewResult> {
  return {
    previewMode: "3d",
    previewId: `preview-${configurationId}`,
    previewUrl: "",
    model3dId: "jp-3d-pending",
  };
}
