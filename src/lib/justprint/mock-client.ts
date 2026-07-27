import { generateConfigurationId } from "@/lib/configuration-id";
import { getBikePreviewMode, isBike2D, isBike3D } from "@/lib/bike-preview";
import {
  findCatalogBikeById,
  getStorefrontCatalog,
  setStorefrontCatalog,
} from "@/lib/justprint/catalog";
import { buildMockStorefrontBootstrap } from "@/lib/justprint/mock-bootstrap";
import type {
  CompletedConfiguration,
  ConfigurationDraft,
  ConfigurationPersonalization,
  CreateConfigurationResponse,
  FinalizeConfigurationResponse,
  SelectedConfigurationLogo,
  StorefrontBootstrap,
  StorefrontConfigurationCreateBody,
  StorefrontConfigurationPatchBody,
  UpdateConfigurationResponse,
} from "@/types/justprint";
import type {
  JustPrintCompletionResult,
  JustPrintPreviewResult,
  ProductionCheck,
  ConfiguratorState,
} from "@/types/configurator";
import { DEFAULT_PALETTE } from "@/types/configurator";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const draftStore = new Map<string, ConfigurationDraft>();

function currentMockShopId(): string {
  return getStorefrontCatalog()?.shop.id ?? "rawmoto";
}

function emptyPersonalization(): ConfigurationPersonalization {
  return {
    riderName: "",
    raceNumber: "17",
    plateColor: "#FFFFFF",
    numberColor: "#111111",
    nameColor: "#FFFFFF",
    palette: DEFAULT_PALETTE.map((color) => ({ ...color })),
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Mock public id e.g. JP-RM-X8K29D — mock mode only. */
function generateMockPublicId(shopId: string): string {
  const code = shopId === "rawmoto" ? "RM" : "XX";
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `JP-${code}-${suffix}`;
}

function generateMockEditToken(): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let token = "";
  for (let i = 0; i < 43; i += 1) {
    token += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return token;
}

export async function mockGetStorefrontBootstrap(
  shopId: string,
): Promise<StorefrontBootstrap> {
  await delay(280);
  const bootstrap = buildMockStorefrontBootstrap(shopId);
  setStorefrontCatalog(bootstrap);
  return bootstrap;
}

export async function mockCreateConfiguration(
  body: StorefrontConfigurationCreateBody & { id?: string },
): Promise<CreateConfigurationResponse> {
  await delay(220);
  const id = body.id ?? generateConfigurationId();
  const publicId = generateMockPublicId(body.shopId);
  const editToken = generateMockEditToken();
  const createdAt = nowIso();
  const personalization = body.configurationData.personalization;
  const logos = (body.configurationData.logos ?? []).map(
    (logo): SelectedConfigurationLogo => ({
      id: logo.logoId,
      name: logo.name,
      prominenceLevel: logo.prominenceLevel,
    }),
  );

  const draft: ConfigurationDraft = {
    id,
    publicId,
    editToken,
    shopId: body.shopId,
    bikeId: body.bikeId ?? body.configurationData.bike?.id ?? "",
    designId: body.designId ?? body.configurationData.design?.id ?? "",
    personalization: {
      riderName: personalization?.riderName ?? "",
      raceNumber: personalization?.raceNumber ?? "17",
      plateColor: personalization?.plateColor ?? "#FFFFFF",
      numberColor: personalization?.colors?.number ?? "#111111",
      nameColor: personalization?.colors?.name ?? "#FFFFFF",
      palette: DEFAULT_PALETTE.map((color) => ({
        ...color,
        hex: personalization?.colors?.[color.id] ?? color.hex,
      })),
    },
    logos,
    status: "draft",
    previewMode: body.previewMode,
    createdAt,
    updatedAt: createdAt,
  };
  draftStore.set(id, draft);

  return {
    configurationId: id,
    publicId,
    editToken,
    status: "draft",
    createdAt,
  };
}

export async function mockUpdateConfiguration(
  configurationId: string,
  editToken: string,
  body: StorefrontConfigurationPatchBody,
): Promise<UpdateConfigurationResponse> {
  await delay(180);
  void editToken;
  const existing = draftStore.get(configurationId);
  const personalization = body.configurationData?.personalization;
  const logos = body.configurationData?.logos?.map(
    (logo): SelectedConfigurationLogo => ({
      id: logo.logoId,
      name: logo.name,
      prominenceLevel: logo.prominenceLevel,
    }),
  );

  const base: ConfigurationDraft =
    existing ??
    ({
      id: configurationId,
      publicId: generateMockPublicId(currentMockShopId()),
      editToken: generateMockEditToken(),
      shopId: currentMockShopId(),
      bikeId: body.bikeId ?? "",
      designId: body.designId ?? "",
      personalization: emptyPersonalization(),
      logos: logos ?? [],
      status: "draft",
      previewMode: body.previewMode ?? "3d",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    } satisfies ConfigurationDraft);

  if (base.status === "finalized") {
    const { JustPrintError } = await import("@/lib/justprint/errors");
    throw new JustPrintError({
      code: "FINALIZED",
      status: 409,
      message: "Configuration already finalized",
      userMessage:
        "Cette configuration est déjà finalisée et ne peut plus être modifiée.",
    });
  }

  const updated: ConfigurationDraft = {
    ...base,
    bikeId: body.bikeId ?? base.bikeId,
    designId: body.designId ?? base.designId,
    previewMode: body.previewMode ?? base.previewMode,
    personalization: personalization
      ? {
          riderName: personalization.riderName,
          raceNumber: personalization.raceNumber,
          plateColor: personalization.plateColor ?? base.personalization.plateColor,
          numberColor:
            personalization.colors?.number ?? base.personalization.numberColor,
          nameColor:
            personalization.colors?.name ?? base.personalization.nameColor,
          palette: base.personalization.palette.map((color) => ({
            ...color,
            hex: personalization.colors?.[color.id] ?? color.hex,
          })),
        }
      : base.personalization,
    logos: logos ?? base.logos,
    updatedAt: nowIso(),
  };

  draftStore.set(updated.id, updated);
  return {
    configurationId: updated.id,
    publicId: updated.publicId,
    status: updated.status,
    updatedAt: updated.updatedAt,
  };
}

export async function mockFinalizeConfiguration(
  configurationId: string,
  editToken: string,
): Promise<FinalizeConfigurationResponse> {
  await delay(300);
  void editToken;
  const draft = draftStore.get(configurationId);
  if (!draft) {
    const { JustPrintError } = await import("@/lib/justprint/errors");
    throw new JustPrintError({
      code: "VALIDATION",
      status: 400,
      message: "Unknown configuration",
      userMessage: "Configuration introuvable. Réessaie depuis le début.",
    });
  }

  if (draft.status === "finalized") {
    return {
      configurationId: draft.id,
      publicId: draft.publicId,
      status: "finalized",
      previewMode: draft.previewMode,
      previewUrl: null,
      productionStatus: "not_generated",
    };
  }

  const updated: ConfigurationDraft = {
    ...draft,
    status: "finalized",
    updatedAt: nowIso(),
  };
  draftStore.set(configurationId, updated);

  return {
    configurationId: updated.id,
    publicId: updated.publicId,
    status: "finalized",
    previewMode: updated.previewMode,
    previewUrl: null,
    productionStatus: "not_generated",
  };
}

function buildPreviewFromDraft(
  draft: ConfigurationDraft,
): JustPrintPreviewResult {
  const previewId = `preview-${Date.now()}`;
  const bike = findCatalogBikeById(draft.bikeId);

  if (draft.previewMode === "2d" || (bike && isBike2D(bike))) {
    const template2dId =
      bike && isBike2D(bike)
        ? bike.template2dId
        : `jp-2d-${draft.bikeId || "unknown"}`;
    return {
      previewMode: "2d",
      previewId,
      previewUrl: `https://preview.local/2d/${template2dId}/${previewId}`,
      template2dId,
      pieceIds: bike && isBike2D(bike) ? bike.pieceIds : undefined,
    };
  }

  const model3dId =
    bike && isBike3D(bike)
      ? bike.model3dId
      : `jp-3d-${draft.bikeId || "fallback"}`;

  return {
    previewMode: "3d",
    previewId,
    previewUrl: `https://preview.local/3d/${model3dId}/${previewId}`,
    model3dId,
    availableViews: bike && isBike3D(bike) ? bike.availableViews : undefined,
  };
}

export async function mockGenerateConfigurationPreview(
  configurationId: string,
): Promise<JustPrintPreviewResult> {
  await delay(450);
  const draft = draftStore.get(configurationId);
  if (!draft) {
    return {
      previewMode: "3d",
      previewId: `preview-${Date.now()}`,
      previewUrl: `https://preview.local/3d/fallback/${configurationId}`,
      model3dId: "jp-3d-fallback",
    };
  }

  return buildPreviewFromDraft(draft);
}

export async function mockCompleteConfiguration(
  configurationId: string,
): Promise<CompletedConfiguration> {
  const finalized = await mockFinalizeConfiguration(configurationId, "mock");
  const draft = draftStore.get(configurationId);
  const preview = draft
    ? buildPreviewFromDraft(draft)
    : ({
        previewMode: "3d" as const,
        previewId: `preview-${Date.now()}`,
        previewUrl: `https://preview.local/3d/fallback/${configurationId}`,
        model3dId: "jp-3d-fallback",
      } satisfies JustPrintPreviewResult);

  if (preview.previewMode === "2d") {
    return {
      configurationId: finalized.configurationId,
      publicId: finalized.publicId,
      status: "finalized",
      previewMode: "2d",
      previewUrl: preview.previewUrl,
      template2dId: preview.template2dId,
      pieceIds: preview.pieceIds,
    };
  }

  return {
    configurationId: finalized.configurationId,
    publicId: finalized.publicId,
    status: "finalized",
    previewMode: "3d",
    previewUrl: preview.previewUrl,
    model3dId: preview.model3dId,
    availableViews: preview.availableViews,
  };
}

/** @deprecated Prefer syncing via ConfigurationDraft — kept for shell transition. */
export function buildPreviewResultFromState(
  state: ConfiguratorState,
): JustPrintPreviewResult {
  const previewId = `preview-${Date.now()}`;
  const mode = getBikePreviewMode(state.bike);

  if (mode === "2d" && state.bike && isBike2D(state.bike)) {
    return {
      previewMode: "2d",
      previewId,
      previewUrl: `https://preview.local/2d/${state.bike.template2dId}/${previewId}`,
      template2dId: state.bike.template2dId,
      pieceIds: state.bike.pieceIds,
    };
  }

  const model3dId =
    state.bike && isBike3D(state.bike)
      ? state.bike.model3dId
      : "jp-3d-fallback";

  return {
    previewMode: "3d",
    previewId,
    previewUrl: `https://preview.local/3d/${model3dId}/${previewId}`,
    model3dId,
    availableViews:
      state.bike && isBike3D(state.bike) ? state.bike.availableViews : undefined,
  };
}

export async function mockLegacyCompleteFromState(
  state: ConfiguratorState,
): Promise<JustPrintCompletionResult> {
  const { buildCreateConfigurationBody } = await import(
    "@/lib/justprint/snapshot"
  );

  let configurationId = state.configurationId;
  let publicId = state.publicId;

  if (state.bike && state.selectedDesign) {
    if (!configurationId || !state.editToken) {
      const created = await mockCreateConfiguration(
        buildCreateConfigurationBody(state, {
          shopId: currentMockShopId(),
          locale: "fr",
        }),
      );
      configurationId = created.configurationId;
      publicId = created.publicId;
    } else {
      const { buildPatchConfigurationBody } = await import(
        "@/lib/justprint/snapshot"
      );
      await mockUpdateConfiguration(
        configurationId,
        state.editToken,
        buildPatchConfigurationBody(state, {
          shopId: currentMockShopId(),
          locale: "fr",
        }),
      );
    }
  }

  if (!configurationId) {
    configurationId = generateConfigurationId();
  }

  const completed = await mockCompleteConfiguration(configurationId);
  const preview = buildPreviewResultFromState({
    ...state,
    configurationId,
    publicId: publicId ?? completed.publicId ?? null,
  });

  return {
    ...preview,
    previewUrl: completed.previewUrl,
    configurationId: completed.publicId ?? completed.configurationId,
  };
}

export async function mockRunProductionChecks(
  state: ConfiguratorState,
): Promise<ProductionCheck[]> {
  await delay(350);
  return state.productionChecks.map((check) => ({
    ...check,
    status: "validated",
  }));
}
