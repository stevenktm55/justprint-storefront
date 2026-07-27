import { justPrintFetch } from "@/lib/justprint/fetch";
import { setStorefrontCatalog } from "@/lib/justprint/catalog";
import type {
  CompletedConfiguration,
  ConfigurationDraft,
  CreateConfigurationInput,
  StorefrontBootstrap,
  UpdateConfigurationInput,
} from "@/types/justprint";
import type { JustPrintPreviewResult } from "@/types/configurator";

export async function remoteGetStorefrontBootstrap(
  shopId: string,
): Promise<StorefrontBootstrap> {
  const bootstrap = await justPrintFetch<StorefrontBootstrap>(
    "/api/storefront/bootstrap",
    {
      method: "GET",
      searchParams: { shop: shopId },
    },
  );
  setStorefrontCatalog(bootstrap);
  return bootstrap;
}

export async function remoteCreateConfiguration(
  input: CreateConfigurationInput,
): Promise<ConfigurationDraft> {
  return justPrintFetch<ConfigurationDraft>("/api/storefront/configurations", {
    method: "POST",
    body: input,
  });
}

export async function remoteUpdateConfiguration(
  input: UpdateConfigurationInput,
): Promise<ConfigurationDraft> {
  const { configurationId, ...payload } = input;
  return justPrintFetch<ConfigurationDraft>(
    `/api/storefront/configurations/${encodeURIComponent(configurationId)}`,
    {
      method: "PATCH",
      body: payload,
    },
  );
}

export async function remoteGenerateConfigurationPreview(
  configurationId: string,
): Promise<JustPrintPreviewResult> {
  return justPrintFetch<JustPrintPreviewResult>(
    `/api/storefront/configurations/${encodeURIComponent(configurationId)}/preview`,
    {
      method: "POST",
      body: {},
    },
  );
}

export async function remoteCompleteConfiguration(
  configurationId: string,
): Promise<CompletedConfiguration> {
  return justPrintFetch<CompletedConfiguration>(
    `/api/storefront/configurations/${encodeURIComponent(configurationId)}/complete`,
    {
      method: "POST",
      body: {},
    },
  );
}
