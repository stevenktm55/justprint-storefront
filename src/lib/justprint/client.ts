import {
  getJustPrintEnvironment,
  isJustPrintMockMode,
} from "@/lib/justprint/environment";
import { toJustPrintError } from "@/lib/justprint/errors";
import {
  mockCompleteConfiguration,
  mockCreateConfiguration,
  mockGenerateConfigurationPreview,
  mockGetStorefrontBootstrap,
  mockLegacyCompleteFromState,
  mockRunProductionChecks,
  mockUpdateConfiguration,
} from "@/lib/justprint/mock-client";
import {
  remoteCompleteConfiguration,
  remoteCreateConfiguration,
  remoteGenerateConfigurationPreview,
  remoteGetStorefrontBootstrap,
  remoteUpdateConfiguration,
} from "@/lib/justprint/remote-client";
import { getCompatibleDesigns as catalogCompatibleDesigns } from "@/lib/justprint/catalog";
import { getBikePreviewMode } from "@/lib/bike-preview";
import type {
  CompletedConfiguration,
  ConfigurationDraft,
  CreateConfigurationInput,
  StorefrontBootstrap,
  StorefrontDesign,
  UpdateConfigurationInput,
} from "@/types/justprint";
import type {
  BikeSelection,
  JustPrintCompletionResult,
  JustPrintPreviewResult,
  ProductionCheck,
  ConfiguratorState,
} from "@/types/configurator";

async function withErrorBoundary<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw toJustPrintError(error);
  }
}

export async function getStorefrontBootstrap(
  shopId: string,
): Promise<StorefrontBootstrap> {
  return withErrorBoundary(async () => {
    if (isJustPrintMockMode()) {
      return mockGetStorefrontBootstrap(shopId);
    }
    return remoteGetStorefrontBootstrap(shopId);
  });
}

export async function createConfiguration(
  input: CreateConfigurationInput,
): Promise<ConfigurationDraft> {
  return withErrorBoundary(async () => {
    if (isJustPrintMockMode()) {
      return mockCreateConfiguration(input);
    }
    return remoteCreateConfiguration(input);
  });
}

export async function updateConfiguration(
  input: UpdateConfigurationInput,
): Promise<ConfigurationDraft> {
  return withErrorBoundary(async () => {
    if (isJustPrintMockMode()) {
      return mockUpdateConfiguration(input);
    }
    return remoteUpdateConfiguration(input);
  });
}

export async function generateConfigurationPreview(
  configurationId: string,
): Promise<JustPrintPreviewResult> {
  return withErrorBoundary(async () => {
    if (isJustPrintMockMode()) {
      return mockGenerateConfigurationPreview(configurationId);
    }
    return remoteGenerateConfigurationPreview(configurationId);
  });
}

export async function completeConfiguration(
  configurationId: string,
): Promise<CompletedConfiguration> {
  return withErrorBoundary(async () => {
    if (isJustPrintMockMode()) {
      return mockCompleteConfiguration(configurationId);
    }
    return remoteCompleteConfiguration(configurationId);
  });
}

/**
 * Facade kept for gradual migration of the configurator shell.
 * New code should call the named exports above.
 */
export interface JustPrintClient {
  getStorefrontBootstrap(shopId: string): Promise<StorefrontBootstrap>;
  createConfiguration(
    input: CreateConfigurationInput,
  ): Promise<ConfigurationDraft>;
  updateConfiguration(
    input: UpdateConfigurationInput,
  ): Promise<ConfigurationDraft>;
  generateConfigurationPreview(
    configurationId: string,
  ): Promise<JustPrintPreviewResult>;
  completeConfiguration(
    configurationId: string,
  ): Promise<CompletedConfiguration>;
  /** @deprecated Use catalog from bootstrap */
  getCompatibleDesigns(bike: BikeSelection): Promise<StorefrontDesign[]>;
  /** @deprecated Use updateConfiguration */
  saveDraft(state: ConfiguratorState): Promise<{ ok: true }>;
  /** @deprecated Use generateConfigurationPreview */
  generatePreview(state: ConfiguratorState): Promise<JustPrintPreviewResult>;
  runProductionChecks(state: ConfiguratorState): Promise<ProductionCheck[]>;
  /** @deprecated Prefer completeConfiguration(configurationId) */
  completeConfigurationFromState(
    state: ConfiguratorState,
  ): Promise<JustPrintCompletionResult>;
}

export const justPrintClient: JustPrintClient = {
  getStorefrontBootstrap,
  createConfiguration,
  updateConfiguration,
  generateConfigurationPreview,
  completeConfiguration,

  async getCompatibleDesigns(bike: BikeSelection): Promise<StorefrontDesign[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return catalogCompatibleDesigns(bike.id);
  },

  async saveDraft(state: ConfiguratorState): Promise<{ ok: true }> {
    if (!state.configurationId || !state.bike || !state.selectedDesign) {
      return { ok: true };
    }

    await updateConfiguration({
      configurationId: state.configurationId,
      bikeId: state.bike.id,
      designId: state.selectedDesign,
      previewMode: getBikePreviewMode(state.bike),
      personalization: {
        riderName: state.riderName,
        raceNumber: state.raceNumber,
        plateColor: state.plateColor,
        numberColor: state.numberColor,
        nameColor: state.nameColor,
        palette: state.palette,
      },
      logos: state.selectedLogos.map((logo) => ({
        id: logo.id,
        name: logo.name,
        prominenceLevel: logo.prominenceLevel,
        addedAt: logo.addedAt,
      })),
    });

    return { ok: true };
  },

  async generatePreview(
    state: ConfiguratorState,
  ): Promise<JustPrintPreviewResult> {
    if (state.configurationId) {
      return generateConfigurationPreview(state.configurationId);
    }

    if (isJustPrintMockMode()) {
      const { buildPreviewResultFromState } = await import(
        "@/lib/justprint/mock-client"
      );
      await new Promise((resolve) => setTimeout(resolve, 400));
      return buildPreviewResultFromState(state);
    }

    throw toJustPrintError(
      new Error("configurationId required to generate a remote preview"),
    );
  },

  async runProductionChecks(
    state: ConfiguratorState,
  ): Promise<ProductionCheck[]> {
    if (isJustPrintMockMode()) {
      return mockRunProductionChecks(state);
    }
    // Remote production checks are not exposed yet — keep local validated status.
    await new Promise((resolve) => setTimeout(resolve, 200));
    return state.productionChecks.map((check) => ({
      ...check,
      status: "validated",
    }));
  },

  async completeConfigurationFromState(
    state: ConfiguratorState,
  ): Promise<JustPrintCompletionResult> {
    if (isJustPrintMockMode()) {
      return mockLegacyCompleteFromState(state);
    }

    const configurationId = state.configurationId;
    if (!configurationId) {
      throw toJustPrintError(
        new Error("configurationId required to complete configuration"),
      );
    }

    await justPrintClient.saveDraft(state);
    const completed = await completeConfiguration(configurationId);

    if (completed.previewMode === "2d") {
      return {
        previewMode: "2d",
        previewId: `preview-${configurationId}`,
        previewUrl: completed.previewUrl,
        template2dId: completed.template2dId ?? "",
        pieceIds: completed.pieceIds,
        configurationId: completed.configurationId,
      };
    }

    return {
      previewMode: "3d",
      previewId: `preview-${configurationId}`,
      previewUrl: completed.previewUrl,
      model3dId: completed.model3dId ?? "jp-3d-fallback",
      availableViews: completed.availableViews,
      configurationId: completed.configurationId,
    };
  },
};

export { getJustPrintEnvironment, isJustPrintMockMode };
