"use client";

import { Bike3DPreview } from "@/components/configurator/Bike3DPreview";
import { Kit2DPreview } from "@/components/configurator/Kit2DPreview";
import { getBikePreviewMode } from "@/lib/bike-preview";
import type {
  BikeSelection,
  ConfiguratorState,
  DesignOption,
  PaletteColor,
  SelectedLogo,
} from "@/types/configurator";
import { createInitialState } from "@/types/configurator";

export interface ConfiguratorPreviewProps {
  bike: BikeSelection | null;
  selectedDesign: string | null;
  riderName: string;
  raceNumber: string;
  palette: PaletteColor[];
  selectedLogos: SelectedLogo[];
  /** Full state fallback so existing screens can pass `state` only. */
  state?: ConfiguratorState;
  plateColor?: string;
  numberColor?: string;
  nameColor?: string;
  previewView?: ConfiguratorState["previewView"];
  compact?: boolean;
  fillHeight?: boolean;
  showBadge?: boolean;
  interactive?: boolean;
  designs?: DesignOption[];
}

function buildStateFromProps(
  props: ConfiguratorPreviewProps,
): ConfiguratorState {
  if (props.state) {
    return {
      ...props.state,
      bike: props.bike ?? props.state.bike,
      selectedDesign: props.selectedDesign ?? props.state.selectedDesign,
      riderName: props.riderName ?? props.state.riderName,
      raceNumber: props.raceNumber ?? props.state.raceNumber,
      palette: props.palette ?? props.state.palette,
      selectedLogos: props.selectedLogos ?? props.state.selectedLogos,
      plateColor: props.plateColor ?? props.state.plateColor,
      numberColor: props.numberColor ?? props.state.numberColor,
      nameColor: props.nameColor ?? props.state.nameColor,
      previewView: props.previewView ?? props.state.previewView,
    };
  }

  // Minimal state shell when only discrete fields are provided.
  return {
    ...createInitialState(),
    currentStep: 5,
    bike: props.bike,
    selectedDesign: props.selectedDesign,
    riderName: props.riderName,
    raceNumber: props.raceNumber,
    plateColor: props.plateColor ?? "#FFFFFF",
    numberColor: props.numberColor ?? "#111111",
    nameColor: props.nameColor ?? "#FFFFFF",
    palette: props.palette,
    selectedLogos: props.selectedLogos,
    previewView: props.previewView ?? "left",
    productionChecks: [],
  };
}

/**
 * Unified preview entry point — picks 3D bike mock or 2D kit template
 * from `bike.previewMode` so screens never branch themselves.
 */
export function ConfiguratorPreview(props: ConfiguratorPreviewProps) {
  const {
    compact = false,
    fillHeight = false,
    showBadge = true,
    interactive = false,
  } = props;

  const state = buildStateFromProps(props);
  const mode = getBikePreviewMode(state.bike);

  if (mode === "3d") {
    return (
      <Bike3DPreview
        state={state}
        compact={compact}
        fillHeight={fillHeight}
        showBadge={showBadge}
      />
    );
  }

  return (
    <Kit2DPreview
      state={state}
      compact={compact}
      fillHeight={fillHeight}
      showBadge={showBadge}
      interactive={interactive}
    />
  );
}
