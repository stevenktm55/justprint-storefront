import {
  createInitialState,
  DEFAULT_PRODUCTION_CHECKS,
  type BikeSelection,
  type CheckStatus,
  type ConfiguratorState,
  type ConfiguratorStep,
  type PaletteColor,
  type PreviewView,
  type ProductionCheck,
  type SelectedLogo,
} from "@/types/configurator";
import type {
  ConfigurationStatus,
  SynchronizationStatus,
} from "@/types/justprint";
import {
  clampProminenceLevel,
} from "@/lib/logo-prominence";

export type ConfiguratorAction =
  | { type: "HYDRATE_DRAFT"; payload: ConfiguratorState }
  | { type: "INCOMPATIBLE_DRAFT_RESET" }
  | { type: "DISMISS_RESTORE_NOTICE" }
  | { type: "DISMISS_INCOMPATIBLE_DRAFT_NOTICE" }
  | { type: "RESET" }
  | { type: "SET_STEP"; payload: ConfiguratorStep }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "SET_BIKE"; payload: BikeSelection | null }
  | { type: "SET_DESIGN"; payload: string }
  | { type: "SET_RIDER_NAME"; payload: string }
  | { type: "SET_RACE_NUMBER"; payload: string }
  | { type: "SET_PLATE_COLOR"; payload: string }
  | { type: "SET_NUMBER_COLOR"; payload: string }
  | { type: "SET_NAME_COLOR"; payload: string }
  | { type: "SET_PALETTE_COLOR"; payload: { id: string; hex: string } }
  | { type: "TOGGLE_LOGO"; payload: { id: string; name: string } }
  | {
      type: "SET_LOGO_PROMINENCE";
      payload: { id: string; prominenceLevel: number };
    }
  | { type: "ADD_CUSTOM_LOGO"; payload: SelectedLogo }
  | { type: "SET_PREVIEW_VIEW"; payload: PreviewView }
  | { type: "SET_PRODUCTION_CHECKS"; payload: ProductionCheck[] }
  | {
      type: "UPDATE_CHECK_STATUS";
      payload: { id: string; status: CheckStatus };
    }
  | {
      type: "SET_SERVER_CONFIGURATION";
      payload: {
        savedDesignId: string;
        publicId: string;
        editToken: string;
        status: ConfigurationStatus;
        lastSavedAt?: string | null;
      };
    }
  | { type: "SET_SAVED_DESIGN_ID"; payload: string }
  | { type: "SET_PUBLIC_ID"; payload: string }
  | { type: "SET_CONFIGURATION_STATUS"; payload: ConfigurationStatus }
  | { type: "SET_LAST_SAVED_AT"; payload: string | null }
  | { type: "SET_SYNCHRONIZATION_STATUS"; payload: SynchronizationStatus }
  | { type: "CLEAR_SERVER_CONFIGURATION" }
  | { type: "APPLY_DESIGN_PALETTE"; payload: PaletteColor[] }
  | { type: "SET_RETURN_TO_FINAL_PREVIEW"; payload: boolean }
  | { type: "START_DESIGN_CHANGE_FROM_PREVIEW" }
  | { type: "FINISH_DESIGN_CHANGE_FROM_PREVIEW" };

function clampStep(step: number): ConfiguratorStep {
  if (step < 1) return 1;
  if (step > 5) return 5;
  return step as ConfiguratorStep;
}

function applyProminenceLevel(
  logos: SelectedLogo[],
  logoId: string,
  rawLevel: number,
): SelectedLogo[] {
  const level = clampProminenceLevel(rawLevel);

  return logos.map((logo) => {
    if (logo.id === logoId) {
      return { ...logo, prominenceLevel: level };
    }
    if (level === 10 && logo.prominenceLevel === 10) {
      return { ...logo, prominenceLevel: 9 };
    }
    return logo;
  });
}

export function configuratorReducer(
  state: ConfiguratorState,
  action: ConfiguratorAction,
): ConfiguratorState {
  switch (action.type) {
    case "HYDRATE_DRAFT":
      return {
        ...action.payload,
        returnToFinalPreview: false,
        draftRestored: true,
        incompatibleDraftReset: false,
      };

    case "INCOMPATIBLE_DRAFT_RESET":
      return {
        ...createInitialState(),
        incompatibleDraftReset: true,
      };

    case "DISMISS_RESTORE_NOTICE":
      return { ...state, draftRestored: false };

    case "DISMISS_INCOMPATIBLE_DRAFT_NOTICE":
      return { ...state, incompatibleDraftReset: false };

    case "RESET":
      return createInitialState();

    case "SET_STEP":
      return { ...state, currentStep: action.payload };

    case "SET_RETURN_TO_FINAL_PREVIEW":
      return { ...state, returnToFinalPreview: action.payload };

    case "START_DESIGN_CHANGE_FROM_PREVIEW":
      return {
        ...state,
        returnToFinalPreview: true,
        currentStep: 2,
      };

    case "FINISH_DESIGN_CHANGE_FROM_PREVIEW":
      return {
        ...state,
        returnToFinalPreview: false,
        currentStep: 5,
      };

    case "NEXT_STEP":
      return { ...state, currentStep: clampStep(state.currentStep + 1) };

    case "PREV_STEP":
      return { ...state, currentStep: clampStep(state.currentStep - 1) };

    case "SET_BIKE":
      return { ...state, bike: action.payload };

    case "SET_DESIGN":
      return { ...state, selectedDesign: action.payload };

    case "SET_RIDER_NAME":
      return { ...state, riderName: action.payload };

    case "SET_RACE_NUMBER":
      return { ...state, raceNumber: action.payload };

    case "SET_PLATE_COLOR":
      return { ...state, plateColor: action.payload };

    case "SET_NUMBER_COLOR":
      return { ...state, numberColor: action.payload };

    case "SET_NAME_COLOR":
      return { ...state, nameColor: action.payload };

    case "SET_PALETTE_COLOR":
      return {
        ...state,
        palette: state.palette.map((color) =>
          color.id === action.payload.id
            ? { ...color, hex: action.payload.hex }
            : color,
        ),
      };

    case "APPLY_DESIGN_PALETTE":
      return { ...state, palette: action.payload };

    case "TOGGLE_LOGO": {
      const exists = state.selectedLogos.some(
        (logo) => logo.id === action.payload.id,
      );

      if (exists) {
        return {
          ...state,
          selectedLogos: state.selectedLogos.filter(
            (logo) => logo.id !== action.payload.id,
          ),
        };
      }

      return {
        ...state,
        selectedLogos: [
          ...state.selectedLogos,
          {
            id: action.payload.id,
            name: action.payload.name,
            prominenceLevel: 5,
            addedAt: Date.now(),
          },
        ],
      };
    }

    case "SET_LOGO_PROMINENCE":
      return {
        ...state,
        selectedLogos: applyProminenceLevel(
          state.selectedLogos,
          action.payload.id,
          action.payload.prominenceLevel,
        ),
      };

    case "ADD_CUSTOM_LOGO":
      return {
        ...state,
        selectedLogos: [
          ...state.selectedLogos,
          {
            ...action.payload,
            prominenceLevel: clampProminenceLevel(
              action.payload.prominenceLevel || 5,
            ),
            addedAt: action.payload.addedAt || Date.now(),
          },
        ],
      };

    case "SET_PREVIEW_VIEW":
      return { ...state, previewView: action.payload };

    case "SET_PRODUCTION_CHECKS":
      return { ...state, productionChecks: action.payload };

    case "UPDATE_CHECK_STATUS":
      return {
        ...state,
        productionChecks: state.productionChecks.map((check) =>
          check.id === action.payload.id
            ? { ...check, status: action.payload.status }
            : check,
        ),
      };

    case "SET_SAVED_DESIGN_ID":
      return { ...state, savedDesignId: action.payload };

    case "SET_SERVER_CONFIGURATION":
      return {
        ...state,
        savedDesignId: action.payload.savedDesignId,
        publicId: action.payload.publicId,
        editToken: action.payload.editToken,
        configurationStatus: action.payload.status,
        lastSavedAt: action.payload.lastSavedAt ?? state.lastSavedAt,
        synchronizationStatus:
          action.payload.status === "finalized" ? "finalized" : state.synchronizationStatus,
      };

    case "SET_PUBLIC_ID":
      return { ...state, publicId: action.payload };

    case "SET_CONFIGURATION_STATUS":
      return { ...state, configurationStatus: action.payload };

    case "SET_LAST_SAVED_AT":
      return { ...state, lastSavedAt: action.payload };

    case "SET_SYNCHRONIZATION_STATUS":
      return { ...state, synchronizationStatus: action.payload };

    case "CLEAR_SERVER_CONFIGURATION":
      return {
        ...state,
        savedDesignId: null,
        publicId: null,
        editToken: null,
        configurationStatus: null,
        lastSavedAt: null,
        synchronizationStatus: "idle",
      };

    default:
      return state;
  }
}

export { createInitialState, DEFAULT_PRODUCTION_CHECKS };
