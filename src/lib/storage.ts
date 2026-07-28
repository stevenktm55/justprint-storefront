import type {
  ConfiguratorState,
  ConfiguratorStep,
  PaletteColor,
  ProductionCheck,
  SelectedLogo,
} from "@/types/configurator";
import {
  createInitialState,
  CURRENT_DRAFT_SCHEMA_VERSION,
  DEFAULT_PALETTE,
  DEFAULT_PRODUCTION_CHECKS,
} from "@/types/configurator";
import type {
  ConfigurationStatus,
} from "@/types/justprint";
import {
  findCatalogBike,
  findCatalogBikeById,
  findCatalogDesignById,
} from "@/lib/justprint/catalog";
import { resolveBikeSelection } from "@/lib/bike-preview";
import { buildCompletionSummary } from "@/lib/cart-summary";

export const DRAFT_STORAGE_KEY = "rawmoto-configurator-draft";
export const COMPLETED_STORAGE_KEY = "rawmoto-configurator-completed";
export { CURRENT_DRAFT_SCHEMA_VERSION };

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeStep(value: unknown): ConfiguratorStep {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 1) return 1;
  // Legacy drafts used step 6 for production checks — fold into final preview.
  if (numeric >= 6) return 5;
  if (numeric > 5) return 5;
  return numeric as ConfiguratorStep;
}

function normalizeSelectedLogos(value: unknown): SelectedLogo[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!isRecord(item)) return null;
      const id = typeof item.id === "string" ? item.id : null;
      const name = typeof item.name === "string" ? item.name : null;
      if (!id || !name) return null;

      const prominenceLevel =
        typeof item.prominenceLevel === "number" &&
        Number.isFinite(item.prominenceLevel)
          ? Math.min(10, Math.max(1, Math.round(item.prominenceLevel)))
          : 5;

      const addedAt =
        typeof item.addedAt === "number" && Number.isFinite(item.addedAt)
          ? item.addedAt
          : Date.now() + index;

      return { id, name, prominenceLevel, addedAt };
    })
    .filter((item): item is SelectedLogo => item !== null);
}

function normalizePalette(value: unknown): PaletteColor[] {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_PALETTE.map((color) => ({ ...color }));
  }

  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const id = typeof item.id === "string" ? item.id : null;
      const label = typeof item.label === "string" ? item.label : null;
      const hex = typeof item.hex === "string" ? item.hex : null;
      if (!id || !label || !hex) return null;
      return { id, label, hex };
    })
    .filter((item): item is PaletteColor => item !== null);
}

function normalizeProductionChecks(value: unknown): ProductionCheck[] {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_PRODUCTION_CHECKS.map((check) => ({ ...check }));
  }

  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const id = typeof item.id === "string" ? item.id : null;
      const label = typeof item.label === "string" ? item.label : null;
      const status =
        item.status === "pending" ||
        item.status === "checking" ||
        item.status === "validated" ||
        item.status === "warning"
          ? item.status
          : "pending";
      if (!id || !label) return null;
      return { id, label, status };
    })
    .filter((item): item is ProductionCheck => item !== null);
}

function coerceYear(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  return "";
}

function coerceNonEmptyString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

/** Design id + display name — accepts legacy string id or `{ id, name }`. */
export function parseSelectedDesign(
  value: unknown,
): { id: string; name: string } | null {
  if (typeof value === "string" && value.trim()) {
    const id = value.trim();
    const fromCatalog = findCatalogDesignById(id);
    return { id, name: fromCatalog?.name ?? id };
  }

  if (!isRecord(value)) return null;

  const id = typeof value.id === "string" ? value.id.trim() : "";
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!id || !name) return null;
  return { id, name };
}

/**
 * Validates raw bike essentials before restore.
 * Requires id, brand, model, year, and a resolvable previewMode.
 */
export function parseBikeEssentials(rawBike: unknown): {
  id: string;
  brand: string;
  model: string;
  year: string;
  previewMode: "2d" | "3d";
  model3dId?: unknown;
  template2dId?: unknown;
  thumbnailUrl?: unknown;
  availableViews?: unknown;
  pieceIds?: unknown;
  previewUrl?: unknown;
} | null {
  if (!isRecord(rawBike)) return null;

  const id = typeof rawBike.id === "string" ? rawBike.id.trim() : "";
  const brand = typeof rawBike.brand === "string" ? rawBike.brand.trim() : "";
  const model = typeof rawBike.model === "string" ? rawBike.model.trim() : "";
  const year = coerceYear(rawBike.year);

  if (!id || !brand || !model || !year) return null;

  let previewMode: "2d" | "3d" | null =
    rawBike.previewMode === "2d" || rawBike.previewMode === "3d"
      ? rawBike.previewMode
      : null;

  if (!previewMode) {
    const fromCatalog =
      findCatalogBikeById(id) ?? findCatalogBike(brand, model, year);
    previewMode = fromCatalog?.previewMode ?? null;
  }

  if (!previewMode) return null;

  return {
    id,
    brand,
    model,
    year,
    previewMode,
    model3dId: rawBike.model3dId,
    template2dId: rawBike.template2dId,
    thumbnailUrl: rawBike.thumbnailUrl,
    availableViews: rawBike.availableViews,
    pieceIds: rawBike.pieceIds,
    previewUrl: rawBike.previewUrl,
  };
}

function normalizeConfigurationStatus(
  value: unknown,
): ConfigurationStatus | null {
  if (
    value === "draft" ||
    value === "preview_ready" ||
    value === "completed" ||
    value === "finalized"
  ) {
    return value;
  }
  return null;
}

/** Legacy / demo ids that must never be reused against the remote API. */
export function isLegacyMockConfigurationId(id: string): boolean {
  const normalized = id.trim().toUpperCase();
  return (
    normalized === "RAW-DEMO" ||
    normalized.startsWith("RAW-DEMO") ||
    normalized === "DEMO" ||
    normalized === "LOCAL" ||
    normalized === "MOCK"
  );
}

/**
 * True when the draft already has a usable JustPrint saved_design triple.
 * Finalized configs must NOT be reused for a new kit.
 */
export function hasValidServerConfiguration(
  state: Pick<
    ConfiguratorState,
    "savedDesignId" | "publicId" | "editToken" | "configurationStatus"
  >,
): boolean {
  if (
    !state.savedDesignId ||
    !state.publicId ||
    !state.editToken ||
    state.configurationStatus === "finalized"
  ) {
    return false;
  }
  if (isLegacyMockConfigurationId(state.savedDesignId)) {
    return false;
  }
  return true;
}

export type MigrateDraftResult =
  | {
      status: "ok";
      state: ConfiguratorState;
      /** Server credentials were stripped (incomplete, mock, or finalized). */
      serverCleared: boolean;
      wasFinalized: boolean;
    }
  | { status: "discard"; reason: "invalid_shape" | "missing_essentials" };

/**
 * Migrates and validates a raw localStorage draft.
 * Incompatible essentials → discard. Incomplete server triple → clear server, keep client.
 */
export function migrateDraft(raw: unknown): MigrateDraftResult {
  if (!isRecord(raw)) {
    return { status: "discard", reason: "invalid_shape" };
  }

  const rawHasBike = isRecord(raw.bike);
  const rawHasDesign =
    raw.selectedDesign != null &&
    raw.selectedDesign !== "" &&
    !(isRecord(raw.selectedDesign) && Object.keys(raw.selectedDesign).length === 0);

  const bikeEssentials = rawHasBike ? parseBikeEssentials(raw.bike) : null;
  const selectedDesign = rawHasDesign
    ? parseSelectedDesign(raw.selectedDesign)
    : null;

  // Claimed bike/design that fail validation → incompatible draft.
  if (rawHasBike && !bikeEssentials) {
    return { status: "discard", reason: "missing_essentials" };
  }
  if (rawHasDesign && !selectedDesign) {
    return { status: "discard", reason: "missing_essentials" };
  }

  // Nothing usable to restore.
  if (!bikeEssentials && !selectedDesign) {
    const logos = normalizeSelectedLogos(raw.selectedLogos);
    const riderName = typeof raw.riderName === "string" ? raw.riderName : "";
    if (!riderName && logos.length === 0 && normalizeStep(raw.currentStep) <= 1) {
      return { status: "discard", reason: "missing_essentials" };
    }
    // Logos / name without bike+design is not a coherent remote draft.
    return { status: "discard", reason: "missing_essentials" };
  }

  const raceNumber = coerceNonEmptyString(raw.raceNumber);
  // Race number is required once personalization-level data exists; otherwise default.
  const resolvedRaceNumber =
    raceNumber ??
    (typeof raw.raceNumber === "undefined" || raw.raceNumber === null
      ? "17"
      : null);
  if (!resolvedRaceNumber) {
    return { status: "discard", reason: "missing_essentials" };
  }

  const normalizedBike = bikeEssentials
    ? resolveBikeSelection({
        id: bikeEssentials.id,
        brand: bikeEssentials.brand,
        model: bikeEssentials.model,
        year: bikeEssentials.year,
        previewMode: bikeEssentials.previewMode,
        model3dId: bikeEssentials.model3dId,
        template2dId: bikeEssentials.template2dId,
        thumbnailUrl: bikeEssentials.thumbnailUrl,
        availableViews: bikeEssentials.availableViews,
        pieceIds: bikeEssentials.pieceIds,
        previewUrl: bikeEssentials.previewUrl,
      })
    : null;

  if (bikeEssentials && !normalizedBike?.id) {
    return { status: "discard", reason: "missing_essentials" };
  }

  if (
    normalizedBike &&
    (!normalizedBike.brand ||
      !normalizedBike.model ||
      !normalizedBike.year ||
      !normalizedBike.previewMode)
  ) {
    return { status: "discard", reason: "missing_essentials" };
  }

  const base = createInitialState();
  const selectedLogos = normalizeSelectedLogos(raw.selectedLogos);
  const configurationStatus = normalizeConfigurationStatus(
    raw.configurationStatus,
  );

  // Prefer savedDesignId (schema ≥ 3); fall back to legacy configurationId.
  const savedDesignIdRaw =
    typeof raw.savedDesignId === "string" && raw.savedDesignId.trim()
      ? raw.savedDesignId.trim()
      : typeof raw.configurationId === "string" && raw.configurationId.trim()
        ? raw.configurationId.trim()
        : null;
  const publicId =
    typeof raw.publicId === "string" && raw.publicId.trim()
      ? raw.publicId.trim()
      : null;
  const editToken =
    typeof raw.editToken === "string" && raw.editToken.trim()
      ? raw.editToken.trim()
      : null;

  const rawSchemaVersion =
    typeof raw.draftSchemaVersion === "number" &&
    Number.isFinite(raw.draftSchemaVersion)
      ? raw.draftSchemaVersion
      : 0;

  const wasFinalized = configurationStatus === "finalized";
  const hasFullServerTriple = Boolean(
    savedDesignIdRaw &&
      publicId &&
      editToken &&
      !isLegacyMockConfigurationId(savedDesignIdRaw),
  );

  // Schema < 3 belongs to the old storefront_configurations flow — never reuse
  // those ids against saved-designs. Also clear incomplete / mock / finalized.
  const keepServer =
    rawSchemaVersion >= CURRENT_DRAFT_SCHEMA_VERSION &&
    hasFullServerTriple &&
    !wasFinalized &&
    Boolean(normalizedBike && selectedDesign);

  const migrated: ConfiguratorState = {
    ...base,
    draftSchemaVersion: CURRENT_DRAFT_SCHEMA_VERSION,
    currentStep: normalizeStep(raw.currentStep),
    bike: normalizedBike,
    selectedDesign: selectedDesign?.id ?? null,
    riderName: typeof raw.riderName === "string" ? raw.riderName : "",
    raceNumber: resolvedRaceNumber,
    plateColor:
      typeof raw.plateColor === "string" ? raw.plateColor : base.plateColor,
    numberColor:
      typeof raw.numberColor === "string" ? raw.numberColor : base.numberColor,
    nameColor:
      typeof raw.nameColor === "string" ? raw.nameColor : base.nameColor,
    palette: normalizePalette(raw.palette),
    selectedLogos,
    previewView:
      raw.previewView === "left" ||
      raw.previewView === "front" ||
      raw.previewView === "right" ||
      raw.previewView === "top"
        ? raw.previewView
        : "left",
    productionChecks: normalizeProductionChecks(raw.productionChecks),
    savedDesignId: keepServer ? savedDesignIdRaw : null,
    publicId: keepServer ? publicId : null,
    editToken: keepServer ? editToken : null,
    configurationStatus: keepServer
      ? (configurationStatus ?? "draft")
      : null,
    lastSavedAt:
      keepServer && typeof raw.lastSavedAt === "string"
        ? raw.lastSavedAt
        : null,
    synchronizationStatus: "idle",
    draftRestored: true,
    returnToFinalPreview: false,
  };

  const serverCleared =
    !keepServer &&
    Boolean(savedDesignIdRaw || publicId || editToken || wasFinalized);

  if (wasFinalized) {
    // Keep a summary of the last order; start a fresh local draft from the same choices.
    try {
      saveCompletedConfiguration({
        summary: buildCompletionSummary(migrated),
        publicId,
        configurationId: savedDesignIdRaw,
        savedDesignId: savedDesignIdRaw,
        source: "finalized-draft-migration",
      });
    } catch {
      // Ignore summary persistence errors.
    }
  }

  return {
    status: "ok",
    state: migrated,
    serverCleared,
    wasFinalized,
  };
}

export function hasDraftProgress(state: Pick<
  ConfiguratorState,
  | "currentStep"
  | "bike"
  | "selectedDesign"
  | "riderName"
  | "selectedLogos"
  | "savedDesignId"
  | "publicId"
>): boolean {
  return (
    state.currentStep > 1 ||
    Boolean(state.bike) ||
    Boolean(state.selectedDesign) ||
    Boolean(state.riderName) ||
    state.selectedLogos.length > 0 ||
    Boolean(state.savedDesignId) ||
    Boolean(state.publicId)
  );
}

/** Persist draft — editToken is stored for resume, never logged by callers. */
export function saveDraft(state: ConfiguratorState): void {
  if (!isBrowser()) return;
  if (!hasDraftProgress(state)) {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    return;
  }

  const {
    draftRestored: _draftRestored,
    incompatibleDraftReset: _incompatibleReset,
    returnToFinalPreview: _returnFlag,
    synchronizationStatus: _sync,
    ...persisted
  } = state;
  void _draftRestored;
  void _incompatibleReset;
  void _returnFlag;
  void _sync;

  try {
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        ...persisted,
        draftSchemaVersion: CURRENT_DRAFT_SCHEMA_VERSION,
      }),
    );
  } catch {
    // Ignore quota / private mode errors.
  }
}

export type LoadDraftResult =
  | { status: "empty" }
  | { status: "restored"; state: ConfiguratorState }
  | { status: "incompatible_reset" };

export function loadDraft(): LoadDraftResult {
  if (!isBrowser()) return { status: "empty" };

  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return { status: "empty" };

    const parsed: unknown = JSON.parse(raw);
    const migrated = migrateDraft(parsed);

    if (migrated.status === "discard") {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      return { status: "incompatible_reset" };
    }

    if (!hasDraftProgress(migrated.state)) {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      return { status: "empty" };
    }

    // Rewrite storage with the migrated schema so incomplete server ids never linger.
    saveDraft({ ...migrated.state, draftRestored: false });

    return { status: "restored", state: migrated.state };
  } catch {
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore.
    }
    return { status: "incompatible_reset" };
  }
}

/**
 * Clears the local draft only — never deletes a remote JustPrint configuration.
 */
export function clearDraft(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(DRAFT_STORAGE_KEY);
}

/**
 * After a successful add-to-cart / finalize, clear the draft so the next kit
 * cannot reuse the finalized configuration.
 */
export function clearDraftAfterFinalize(): void {
  clearDraft();
}

export function saveCompletedConfiguration(payload: unknown): void {
  if (!isBrowser()) return;

  try {
    // Never persist editToken in completed payloads.
    const safePayload = sanitizeCompletedPayload(payload);
    window.localStorage.setItem(
      COMPLETED_STORAGE_KEY,
      JSON.stringify({
        savedAt: new Date().toISOString(),
        payload: safePayload,
      }),
    );
  } catch {
    // Ignore storage errors.
  }
}

function sanitizeCompletedPayload(payload: unknown): unknown {
  if (!isRecord(payload)) return payload;
  const clone: Record<string, unknown> = { ...payload };
  delete clone.editToken;
  if (isRecord(clone.message)) {
    const message = { ...clone.message };
    delete message.editToken;
    clone.message = message;
  }
  if (isRecord(clone.shopifySummary)) {
    const summary = { ...clone.shopifySummary };
    delete summary.editToken;
    clone.shopifySummary = summary;
  }
  return clone;
}

/** Public display id — prefer publicId, never editToken. */
export function getDisplayConfigurationId(
  state: Pick<ConfiguratorState, "publicId" | "savedDesignId">,
): string | null {
  return state.publicId ?? state.savedDesignId;
}
