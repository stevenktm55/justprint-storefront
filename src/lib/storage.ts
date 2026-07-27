import type {
  ConfiguratorState,
  ConfiguratorStep,
  PaletteColor,
  ProductionCheck,
  SelectedLogo,
} from "@/types/configurator";
import {
  createInitialState,
  DEFAULT_PALETTE,
  DEFAULT_PRODUCTION_CHECKS,
} from "@/types/configurator";
import type {
  ConfigurationStatus,
  SynchronizationStatus,
} from "@/types/justprint";
import { resolveBikeSelection } from "@/lib/bike-preview";

export const DRAFT_STORAGE_KEY = "rawmoto-configurator-draft";
export const COMPLETED_STORAGE_KEY = "rawmoto-configurator-completed";

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

function normalizeBike(rawBike: unknown) {
  if (!isRecord(rawBike)) return null;

  const brand = typeof rawBike.brand === "string" ? rawBike.brand : "";
  const model = typeof rawBike.model === "string" ? rawBike.model : "";
  const year =
    typeof rawBike.year === "string"
      ? rawBike.year
      : typeof rawBike.year === "number"
        ? String(rawBike.year)
        : "";

  return resolveBikeSelection({
    id: typeof rawBike.id === "string" ? rawBike.id : undefined,
    brand,
    model,
    year,
    previewMode: rawBike.previewMode,
    model3dId: rawBike.model3dId,
    template2dId: rawBike.template2dId,
    thumbnailUrl: rawBike.thumbnailUrl,
    availableViews: rawBike.availableViews,
    pieceIds: rawBike.pieceIds,
    previewUrl: rawBike.previewUrl,
  });
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

function normalizeSynchronizationStatus(
  value: unknown,
): SynchronizationStatus {
  if (
    value === "idle" ||
    value === "creating" ||
    value === "saving" ||
    value === "saved" ||
    value === "finalizing" ||
    value === "finalized" ||
    value === "error"
  ) {
    return value;
  }
  return "idle";
}

/**
 * True when the draft already has a usable JustPrint server triple.
 * Finalized configs must NOT be reused for a new kit.
 */
export function hasValidServerConfiguration(
  state: Pick<
    ConfiguratorState,
    "configurationId" | "publicId" | "editToken" | "configurationStatus"
  >,
): boolean {
  return Boolean(
    state.configurationId &&
      state.publicId &&
      state.editToken &&
      state.configurationStatus !== "finalized",
  );
}

export function migrateDraft(raw: unknown): ConfiguratorState | null {
  if (!isRecord(raw)) return null;

  const base = createInitialState();
  const normalizedBike = normalizeBike(raw.bike);

  const selectedLogos = normalizeSelectedLogos(raw.selectedLogos);

  const configurationStatus = normalizeConfigurationStatus(
    raw.configurationStatus,
  );

  // Legacy drafts only had configurationId (mock id) — keep local progress,
  // but clear incomplete server triples so remote create can run later.
  const configurationId =
    typeof raw.configurationId === "string" ? raw.configurationId : null;
  const publicId = typeof raw.publicId === "string" ? raw.publicId : null;
  const editToken = typeof raw.editToken === "string" ? raw.editToken : null;

  const hasFullServerTriple = Boolean(
    configurationId && publicId && editToken,
  );

  const migrated: ConfiguratorState = {
    ...base,
    currentStep: normalizeStep(raw.currentStep),
    bike: normalizedBike,
    selectedDesign:
      typeof raw.selectedDesign === "string" ? raw.selectedDesign : null,
    riderName: typeof raw.riderName === "string" ? raw.riderName : "",
    raceNumber:
      typeof raw.raceNumber === "string" && raw.raceNumber.trim()
        ? raw.raceNumber
        : base.raceNumber,
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
    configurationId: hasFullServerTriple ? configurationId : null,
    publicId: hasFullServerTriple ? publicId : null,
    editToken: hasFullServerTriple ? editToken : null,
    configurationStatus: hasFullServerTriple
      ? (configurationStatus ?? "draft")
      : null,
    lastSavedAt:
      typeof raw.lastSavedAt === "string" ? raw.lastSavedAt : null,
    synchronizationStatus:
      configurationStatus === "finalized"
        ? "finalized"
        : normalizeSynchronizationStatus(raw.synchronizationStatus),
    draftRestored: true,
    returnToFinalPreview: false,
  };

  // Finalized configs must not seed a new kit — drop server link, keep choices.
  if (migrated.configurationStatus === "finalized") {
    migrated.configurationId = null;
    migrated.publicId = null;
    migrated.editToken = null;
    migrated.configurationStatus = null;
    migrated.lastSavedAt = null;
    migrated.synchronizationStatus = "idle";
  }

  return migrated;
}

export function hasDraftProgress(state: Pick<
  ConfiguratorState,
  | "currentStep"
  | "bike"
  | "selectedDesign"
  | "riderName"
  | "selectedLogos"
  | "configurationId"
  | "publicId"
>): boolean {
  return (
    state.currentStep > 1 ||
    Boolean(state.bike) ||
    Boolean(state.selectedDesign) ||
    Boolean(state.riderName) ||
    state.selectedLogos.length > 0 ||
    Boolean(state.configurationId) ||
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
    returnToFinalPreview: _returnFlag,
    synchronizationStatus: _sync,
    ...persisted
  } = state;
  void _draftRestored;
  void _returnFlag;
  void _sync;

  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function loadDraft(): ConfiguratorState | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    const migrated = migrateDraft(parsed);
    if (!migrated || !hasDraftProgress(migrated)) {
      return null;
    }

    return migrated;
  } catch {
    return null;
  }
}

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
  state: Pick<ConfiguratorState, "publicId" | "configurationId">,
): string | null {
  return state.publicId ?? state.configurationId;
}
