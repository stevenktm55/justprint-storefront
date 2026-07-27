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

export function migrateDraft(raw: unknown): ConfiguratorState | null {
  if (!isRecord(raw)) return null;

  const base = createInitialState();
  const normalizedBike = normalizeBike(raw.bike);

  const selectedLogos = normalizeSelectedLogos(raw.selectedLogos);

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
    configurationId:
      typeof raw.configurationId === "string" ? raw.configurationId : null,
    draftRestored: true,
    returnToFinalPreview: false,
  };

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
>): boolean {
  return (
    state.currentStep > 1 ||
    Boolean(state.bike) ||
    Boolean(state.selectedDesign) ||
    Boolean(state.riderName) ||
    state.selectedLogos.length > 0 ||
    Boolean(state.configurationId)
  );
}

export function saveDraft(state: ConfiguratorState): void {
  if (!isBrowser()) return;
  if (!hasDraftProgress(state)) {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    return;
  }

  const { draftRestored: _draftRestored, returnToFinalPreview: _returnFlag, ...persisted } =
    state;
  void _draftRestored;
  void _returnFlag;

  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Ignore quota / private mode errors in demo mode.
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

export function saveCompletedConfiguration(payload: unknown): void {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(
      COMPLETED_STORAGE_KEY,
      JSON.stringify({
        savedAt: new Date().toISOString(),
        payload,
      }),
    );
  } catch {
    // Ignore storage errors in demo mode.
  }
}
