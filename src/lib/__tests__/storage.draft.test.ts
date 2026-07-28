import { beforeEach, describe, expect, it } from "vitest";
import { setStorefrontCatalog } from "@/lib/justprint/catalog";
import { buildMockStorefrontBootstrap } from "@/lib/justprint/mock-bootstrap";
import {
  CURRENT_DRAFT_SCHEMA_VERSION,
  DRAFT_STORAGE_KEY,
  COMPLETED_STORAGE_KEY,
  clearDraft,
  hasValidServerConfiguration,
  loadDraft,
  migrateDraft,
  saveDraft,
} from "@/lib/storage";
import { createInitialState } from "@/types/configurator";

const validBike = {
  id: "ktm-450-sxf-2025",
  brand: "KTM",
  model: "450 SX-F",
  year: "2025",
  previewMode: "3d" as const,
  model3dId: "jp-3d-ktm-450-sxf-2025",
};

function baseClientDraft(overrides: Record<string, unknown> = {}) {
  return {
    currentStep: 5,
    bike: validBike,
    selectedDesign: "factory-01",
    riderName: "Maginot",
    raceNumber: "17",
    plateColor: "#FFFFFF",
    numberColor: "#111111",
    nameColor: "#FFFFFF",
    palette: [
      { id: "primary", label: "Orange", hex: "#FF5A00" },
      { id: "secondary", label: "Noir", hex: "#111111" },
      { id: "tertiary", label: "Blanc", hex: "#FFFFFF" },
      { id: "accent", label: "Bleu", hex: "#0066FF" },
    ],
    selectedLogos: [],
    previewView: "left",
    productionChecks: [],
    savedDesignId: null,
    publicId: null,
    editToken: null,
    configurationStatus: null,
    lastSavedAt: null,
    ...overrides,
  };
}

describe("migrateDraft / draft schema validation", () => {
  beforeEach(() => {
    setStorefrontCatalog(buildMockStorefrontBootstrap("rawmoto"));
    window.localStorage.clear();
  });

  it("discards an old draft without bike.id", () => {
    const result = migrateDraft(
      baseClientDraft({
        bike: {
          brand: "KTM",
          model: "450 SX-F",
          year: "2025",
          previewMode: "3d",
        },
      }),
    );
    expect(result.status).toBe("discard");
  });

  it("discards an old draft without design.id", () => {
    const result = migrateDraft(
      baseClientDraft({
        selectedDesign: { name: "Factory 01" },
      }),
    );
    expect(result.status).toBe("discard");
  });

  it("clears RAW-DEMO mock configurationId and keeps client choices", () => {
    const result = migrateDraft(
      baseClientDraft({
        configurationId: "RAW-DEMO",
        configurationStatus: "draft",
      }),
    );
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.serverCleared).toBe(true);
    expect(result.state.savedDesignId).toBeNull();
    expect(result.state.publicId).toBeNull();
    expect(result.state.editToken).toBeNull();
    expect(result.state.bike?.id).toBe("ktm-450-sxf-2025");
    expect(result.state.selectedDesign).toBe("factory-01");
    expect(result.state.draftSchemaVersion).toBe(CURRENT_DRAFT_SCHEMA_VERSION);
    expect(hasValidServerConfiguration(result.state)).toBe(false);
  });

  it("clears savedDesignId without editToken", () => {
    const result = migrateDraft(
      baseClientDraft({
        savedDesignId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        publicId: "JP-RM-ABC123",
        editToken: null,
        configurationStatus: "draft",
        draftSchemaVersion: CURRENT_DRAFT_SCHEMA_VERSION,
      }),
    );
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.serverCleared).toBe(true);
    expect(result.state.savedDesignId).toBeNull();
    expect(result.state.publicId).toBeNull();
    expect(result.state.editToken).toBeNull();
    expect(result.state.selectedDesign).toBe("factory-01");
  });

  it("treats finalized drafts as a new local order (no server reuse)", () => {
    const result = migrateDraft(
      baseClientDraft({
        savedDesignId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        publicId: "JP-RM-FIN001",
        editToken: "edit-token-secret",
        configurationStatus: "finalized",
        draftSchemaVersion: CURRENT_DRAFT_SCHEMA_VERSION,
      }),
    );
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.wasFinalized).toBe(true);
    expect(result.serverCleared).toBe(true);
    expect(result.state.savedDesignId).toBeNull();
    expect(result.state.editToken).toBeNull();
    expect(result.state.configurationStatus).toBeNull();
    expect(result.state.bike?.brand).toBe("KTM");
    expect(result.state.raceNumber).toBe("17");
    expect(hasValidServerConfiguration(result.state)).toBe(false);

    const completed = window.localStorage.getItem(COMPLETED_STORAGE_KEY);
    expect(completed).toBeTruthy();
  });

  it("clears legacy schema v2 configuration ids (old configurations flow)", () => {
    const result = migrateDraft(
      baseClientDraft({
        draftSchemaVersion: 2,
        configurationId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        publicId: "JP-RM-LEGACY",
        editToken: "edit-token-secret",
        configurationStatus: "draft",
        lastSavedAt: "2026-07-27T10:00:00.000Z",
      }),
    );
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.serverCleared).toBe(true);
    expect(result.state.savedDesignId).toBeNull();
    expect(result.state.publicId).toBeNull();
    expect(result.state.editToken).toBeNull();
    expect(result.state.draftSchemaVersion).toBe(CURRENT_DRAFT_SCHEMA_VERSION);
    expect(hasValidServerConfiguration(result.state)).toBe(false);
  });

  it("keeps a valid saved_designs draft triple (schema ≥ 3)", () => {
    const result = migrateDraft(
      baseClientDraft({
        draftSchemaVersion: CURRENT_DRAFT_SCHEMA_VERSION,
        savedDesignId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        publicId: "JP-RM-VALID1",
        editToken: "edit-token-secret",
        configurationStatus: "draft",
        lastSavedAt: "2026-07-27T10:00:00.000Z",
      }),
    );
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.serverCleared).toBe(false);
    expect(result.state.savedDesignId).toBe(
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    );
    expect(result.state.publicId).toBe("JP-RM-VALID1");
    expect(result.state.editToken).toBe("edit-token-secret");
    expect(result.state.configurationStatus).toBe("draft");
    expect(hasValidServerConfiguration(result.state)).toBe(true);
  });

  it("accepts legacy selectedDesign object { id, name }", () => {
    const result = migrateDraft(
      baseClientDraft({
        selectedDesign: { id: "racing-01", name: "Racing 01" },
      }),
    );
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.state.selectedDesign).toBe("racing-01");
  });

  it("loadDraft resets incompatible storage and reports notice status", () => {
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify(
        baseClientDraft({
          bike: { brand: "KTM", model: "450 SX-F", year: "2025" },
        }),
      ),
    );

    const loaded = loadDraft();
    expect(loaded.status).toBe("incompatible_reset");
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("loadDraft rewrites migrated draft without incomplete server ids", () => {
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify(
        baseClientDraft({
          configurationId: "RAW-DEMO",
          selectedDesign: { id: "factory-01", name: "Factory 01" },
        }),
      ),
    );

    const loaded = loadDraft();
    expect(loaded.status).toBe("restored");
    if (loaded.status !== "restored") return;

    expect(loaded.state.savedDesignId).toBeNull();
    expect(loaded.state.draftSchemaVersion).toBe(CURRENT_DRAFT_SCHEMA_VERSION);

    const persisted = JSON.parse(
      window.localStorage.getItem(DRAFT_STORAGE_KEY)!,
    ) as Record<string, unknown>;
    expect(persisted.savedDesignId).toBeNull();
    expect(persisted.draftSchemaVersion).toBe(CURRENT_DRAFT_SCHEMA_VERSION);
    expect(persisted.selectedDesign).toBe("factory-01");
  });

  it("clearDraft only removes local storage (recommencer à zéro)", () => {
    const state = {
      ...createInitialState(),
      bike: validBike,
      selectedDesign: "factory-01",
      savedDesignId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      publicId: "JP-RM-X",
      editToken: "token",
      configurationStatus: "draft" as const,
    };
    saveDraft(state);
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeTruthy();

    clearDraft();
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("saveDraft always stamps draftSchemaVersion", () => {
    saveDraft({
      ...createInitialState(),
      currentStep: 3,
      bike: validBike,
      selectedDesign: "factory-01",
      riderName: "Test",
      raceNumber: "42",
    });

    const persisted = JSON.parse(
      window.localStorage.getItem(DRAFT_STORAGE_KEY)!,
    ) as Record<string, unknown>;
    expect(persisted.draftSchemaVersion).toBe(CURRENT_DRAFT_SCHEMA_VERSION);
    expect(persisted.synchronizationStatus).toBeUndefined();
    expect(persisted.draftRestored).toBeUndefined();
  });
});
