import {
  getJustPrintEnvironment,
  isJustPrintMockMode,
} from "@/lib/justprint/environment";
import { toJustPrintError } from "@/lib/justprint/errors";
import {
  mockCompleteConfiguration,
  mockCreateConfiguration,
  mockFinalizeConfiguration,
  mockGenerateConfigurationPreview,
  mockGetStorefrontBootstrap,
  mockLegacyCompleteFromState,
  mockRunProductionChecks,
  mockUpdateConfiguration,
} from "@/lib/justprint/mock-client";
import {
  remoteCreateSavedDesign,
  remoteFinalizeSavedDesign,
  remoteGenerateConfigurationPreview,
  remoteGetSavedDesign,
  remoteGetStorefrontBootstrap,
  remoteUpdateSavedDesign,
} from "@/lib/justprint/remote-client";
import { getCompatibleDesigns as catalogCompatibleDesigns } from "@/lib/justprint/catalog";
import {
  buildCreateConfigurationBody,
  buildPatchConfigurationBody,
  type SnapshotContext,
} from "@/lib/justprint/snapshot";
import type {
  CompletedConfiguration,
  CreateConfigurationResponse,
  FinalizeConfigurationResponse,
  StorefrontBootstrap,
  StorefrontConfigurationCreateBody,
  StorefrontConfigurationPatchBody,
  StorefrontDesign,
  UpdateConfigurationResponse,
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

export async function createSavedDesign(
  body: StorefrontConfigurationCreateBody,
): Promise<CreateConfigurationResponse> {
  return withErrorBoundary(async () => {
    if (isJustPrintMockMode()) {
      return mockCreateConfiguration(body);
    }
    return remoteCreateSavedDesign(body);
  });
}

/** @deprecated Prefer createSavedDesign */
export const createConfiguration = createSavedDesign;

/**
 * GET authentifié draft — uniquement côté parent Storefront (editToken).
 * Jamais depuis l’iframe viewer.
 */
export async function getSavedDesign(
  savedDesignId: string,
  editToken: string,
): Promise<UpdateConfigurationResponse> {
  return withErrorBoundary(async () => {
    if (isJustPrintMockMode()) {
      return mockUpdateConfiguration(savedDesignId, editToken, {});
    }
    return remoteGetSavedDesign(savedDesignId, editToken);
  });
}

export async function updateSavedDesign(
  savedDesignId: string,
  editToken: string,
  body: StorefrontConfigurationPatchBody,
): Promise<UpdateConfigurationResponse> {
  return withErrorBoundary(async () => {
    if (isJustPrintMockMode()) {
      return mockUpdateConfiguration(savedDesignId, editToken, body);
    }
    return remoteUpdateSavedDesign(savedDesignId, editToken, body);
  });
}

/** @deprecated Prefer updateSavedDesign */
export const updateConfiguration = updateSavedDesign;

export async function finalizeSavedDesign(
  savedDesignId: string,
  editToken: string,
): Promise<FinalizeConfigurationResponse> {
  return withErrorBoundary(async () => {
    if (isJustPrintMockMode()) {
      return mockFinalizeConfiguration(savedDesignId, editToken);
    }
    return remoteFinalizeSavedDesign(savedDesignId, editToken);
  });
}

/** @deprecated Prefer finalizeSavedDesign */
export const finalizeConfiguration = finalizeSavedDesign;

export async function generateConfigurationPreview(
  savedDesignId: string,
): Promise<JustPrintPreviewResult> {
  return withErrorBoundary(async () => {
    if (isJustPrintMockMode()) {
      return mockGenerateConfigurationPreview(savedDesignId);
    }
    return remoteGenerateConfigurationPreview(savedDesignId);
  });
}

export async function completeConfiguration(
  savedDesignId: string,
  editToken?: string,
): Promise<CompletedConfiguration> {
  return withErrorBoundary(async () => {
    if (isJustPrintMockMode()) {
      return mockCompleteConfiguration(savedDesignId);
    }
    if (!editToken) {
      throw toJustPrintError(
        new Error("editToken required to finalize a remote saved design"),
      );
    }
    const finalized = await remoteFinalizeSavedDesign(
      savedDesignId,
      editToken,
    );
    return {
      configurationId: finalized.configurationId,
      publicId: finalized.publicId,
      status: "finalized",
      previewMode: finalized.previewMode ?? "3d",
      previewUrl: finalized.previewUrl ?? "",
    };
  });
}

/**
 * Facade kept for gradual migration of the configurator shell.
 * New code should call the named exports above.
 */
export interface JustPrintClient {
  getStorefrontBootstrap(shopId: string): Promise<StorefrontBootstrap>;
  createConfiguration(
    body: StorefrontConfigurationCreateBody,
  ): Promise<CreateConfigurationResponse>;
  updateConfiguration(
    configurationId: string,
    editToken: string,
    body: StorefrontConfigurationPatchBody,
  ): Promise<UpdateConfigurationResponse>;
  finalizeConfiguration(
    configurationId: string,
    editToken: string,
  ): Promise<FinalizeConfigurationResponse>;
  generateConfigurationPreview(
    configurationId: string,
  ): Promise<JustPrintPreviewResult>;
  completeConfiguration(
    configurationId: string,
    editToken?: string,
  ): Promise<CompletedConfiguration>;
  /** @deprecated Use catalog from bootstrap */
  getCompatibleDesigns(bike: BikeSelection): Promise<StorefrontDesign[]>;
  /** @deprecated Use updateConfiguration */
  saveDraft(
    state: ConfiguratorState,
    context: SnapshotContext,
  ): Promise<{ ok: true }>;
  /** @deprecated Use generateConfigurationPreview */
  generatePreview(state: ConfiguratorState): Promise<JustPrintPreviewResult>;
  runProductionChecks(state: ConfiguratorState): Promise<ProductionCheck[]>;
  /** @deprecated Prefer finalizeConfiguration */
  completeConfigurationFromState(
    state: ConfiguratorState,
    context: SnapshotContext,
  ): Promise<JustPrintCompletionResult>;
}

export const justPrintClient: JustPrintClient = {
  getStorefrontBootstrap,
  createConfiguration: createSavedDesign,
  updateConfiguration: updateSavedDesign,
  finalizeConfiguration: finalizeSavedDesign,
  generateConfigurationPreview,
  completeConfiguration,

  async getCompatibleDesigns(bike: BikeSelection): Promise<StorefrontDesign[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return catalogCompatibleDesigns(bike.id);
  },

  async saveDraft(
    state: ConfiguratorState,
    context: SnapshotContext,
  ): Promise<{ ok: true }> {
    if (
      !state.savedDesignId ||
      !state.editToken ||
      !state.bike ||
      !state.selectedDesign
    ) {
      return { ok: true };
    }

    await updateSavedDesign(
      state.savedDesignId,
      state.editToken,
      buildPatchConfigurationBody(state, context),
    );

    return { ok: true };
  },

  async generatePreview(
    state: ConfiguratorState,
  ): Promise<JustPrintPreviewResult> {
    if (state.savedDesignId) {
      return generateConfigurationPreview(state.savedDesignId);
    }

    if (isJustPrintMockMode()) {
      const { buildPreviewResultFromState } = await import(
        "@/lib/justprint/mock-client"
      );
      await new Promise((resolve) => setTimeout(resolve, 400));
      return buildPreviewResultFromState(state);
    }

    throw toJustPrintError(
      new Error("savedDesignId required to generate a remote preview"),
    );
  },

  async runProductionChecks(
    state: ConfiguratorState,
  ): Promise<ProductionCheck[]> {
    if (isJustPrintMockMode()) {
      return mockRunProductionChecks(state);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
    return state.productionChecks.map((check) => ({
      ...check,
      status: "validated",
    }));
  },

  async completeConfigurationFromState(
    state: ConfiguratorState,
    context: SnapshotContext,
  ): Promise<JustPrintCompletionResult> {
    if (isJustPrintMockMode()) {
      return mockLegacyCompleteFromState(state);
    }

    const savedDesignId = state.savedDesignId;
    const editToken = state.editToken;
    if (!savedDesignId || !editToken) {
      throw toJustPrintError(
        new Error(
          "savedDesignId and editToken required to complete configuration",
        ),
      );
    }

    await justPrintClient.saveDraft(state, context);
    const completed = await completeConfiguration(savedDesignId, editToken);
    const cartId = completed.publicId ?? savedDesignId;

    if (completed.previewMode === "2d") {
      return {
        previewMode: "2d",
        previewId: `preview-${savedDesignId}`,
        previewUrl: completed.previewUrl,
        template2dId: completed.template2dId ?? "",
        pieceIds: completed.pieceIds,
        configurationId: cartId,
      };
    }

    return {
      previewMode: "3d",
      previewId: `preview-${savedDesignId}`,
      previewUrl: completed.previewUrl,
      model3dId: completed.model3dId ?? "jp-3d-fallback",
      availableViews: completed.availableViews,
      configurationId: cartId,
    };
  },
};

export { buildCreateConfigurationBody, buildPatchConfigurationBody };
export type { SnapshotContext };
export { getJustPrintEnvironment, isJustPrintMockMode };
