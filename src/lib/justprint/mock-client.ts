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
  CreateConfigurationInput,
  SelectedConfigurationLogo,
  StorefrontBootstrap,
  UpdateConfigurationInput,
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

export async function mockGetStorefrontBootstrap(
  shopId: string,
): Promise<StorefrontBootstrap> {
  await delay(280);
  const bootstrap = buildMockStorefrontBootstrap(shopId);
  setStorefrontCatalog(bootstrap);
  return bootstrap;
}

export async function mockCreateConfiguration(
  input: CreateConfigurationInput & { id?: string },
): Promise<ConfigurationDraft> {
  await delay(220);
  const id = input.id ?? generateConfigurationId();
  const createdAt = nowIso();
  const draft: ConfigurationDraft = {
    id,
    shopId: input.shopId,
    bikeId: input.bikeId,
    designId: input.designId,
    personalization: input.personalization ?? emptyPersonalization(),
    logos: input.logos ?? [],
    status: "draft",
    previewMode: input.previewMode,
    createdAt,
    updatedAt: createdAt,
  };
  draftStore.set(id, draft);
  return { ...draft, logos: [...draft.logos] };
}

export async function mockUpdateConfiguration(
  input: UpdateConfigurationInput,
): Promise<ConfigurationDraft> {
  await delay(180);
  const existing = draftStore.get(input.configurationId);
  const base: ConfigurationDraft =
    existing ??
    ({
      id: input.configurationId,
      shopId: currentMockShopId(),
      bikeId: input.bikeId ?? "",
      designId: input.designId ?? "",
      personalization: input.personalization ?? emptyPersonalization(),
      logos: input.logos ?? [],
      status: "draft",
      previewMode: input.previewMode ?? "3d",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    } satisfies ConfigurationDraft);

  const updated: ConfigurationDraft = {
    ...base,
    bikeId: input.bikeId ?? base.bikeId,
    designId: input.designId ?? base.designId,
    personalization: input.personalization ?? base.personalization,
    logos: input.logos ?? base.logos,
    previewMode: input.previewMode ?? base.previewMode,
    status: input.status ?? base.status,
    updatedAt: nowIso(),
  };

  draftStore.set(updated.id, updated);
  return {
    ...updated,
    logos: [...updated.logos],
    personalization: {
      ...updated.personalization,
      palette: updated.personalization.palette.map((color) => ({ ...color })),
    },
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

  const preview = buildPreviewFromDraft(draft);
  await mockUpdateConfiguration({
    configurationId,
    status: "preview_ready",
  });
  return preview;
}

export async function mockCompleteConfiguration(
  configurationId: string,
): Promise<CompletedConfiguration> {
  await delay(400);
  const draft = draftStore.get(configurationId);
  const preview = draft
    ? buildPreviewFromDraft(draft)
    : ({
        previewMode: "3d" as const,
        previewId: `preview-${Date.now()}`,
        previewUrl: `https://preview.local/3d/fallback/${configurationId}`,
        model3dId: "jp-3d-fallback",
      } satisfies JustPrintPreviewResult);

  if (draft) {
    await mockUpdateConfiguration({
      configurationId,
      status: "completed",
    });
  }

  if (preview.previewMode === "2d") {
    return {
      configurationId,
      status: "completed",
      previewMode: "2d",
      previewUrl: preview.previewUrl,
      template2dId: preview.template2dId,
      pieceIds: preview.pieceIds,
    };
  }

  return {
    configurationId,
    status: "completed",
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
  const configurationId =
    state.configurationId ?? generateConfigurationId();

  if (state.bike && state.selectedDesign) {
    const existing = draftStore.get(configurationId);

    if (!existing) {
      await mockCreateConfiguration({
        id: configurationId,
        shopId: currentMockShopId(),
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
        logos: state.selectedLogos.map(
          (logo): SelectedConfigurationLogo => ({
            id: logo.id,
            name: logo.name,
            prominenceLevel: logo.prominenceLevel,
            addedAt: logo.addedAt,
          }),
        ),
      });
    } else {
      await mockUpdateConfiguration({
        configurationId,
        bikeId: state.bike.id,
        designId: state.selectedDesign,
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
        previewMode: getBikePreviewMode(state.bike),
      });
    }
  }

  const completed = await mockCompleteConfiguration(configurationId);
  const preview = buildPreviewResultFromState({
    ...state,
    configurationId,
  });

  return {
    ...preview,
    previewUrl: completed.previewUrl,
    configurationId: completed.configurationId,
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
