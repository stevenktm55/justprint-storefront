"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useConfigurator } from "@/context/ConfiguratorContext";
import { useStorefrontTenant } from "@/context/StorefrontTenantContext";
import { getBikePreviewMode } from "@/lib/bike-preview";
import {
  createConfiguration,
  getStorefrontBootstrap,
  isJustPrintError,
  updateConfiguration,
} from "@/lib/justprint-client";
import type { ConfiguratorState } from "@/types/configurator";
import type {
  StorefrontBootstrap,
  StorefrontDesign,
  StorefrontLogo,
  StorefrontLogoCategory,
  StorefrontBike,
  SyncStatus,
} from "@/types/justprint";

export type BootstrapStatus = "idle" | "loading" | "ready" | "error";

interface StorefrontContextValue {
  bootstrap: StorefrontBootstrap | null;
  bootstrapStatus: BootstrapStatus;
  bootstrapError: string | null;
  reloadBootstrap: () => void;
  bikes: StorefrontBike[];
  designs: StorefrontDesign[];
  logoCategories: StorefrontLogoCategory[];
  logos: StorefrontLogo[];
  shopId: string;
  syncStatus: SyncStatus;
  syncError: string | null;
  clearSyncError: () => void;
  retrySync: () => void;
  ensureConfiguration: (
    state: ConfiguratorState,
  ) => Promise<string | null>;
}

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

const SYNC_DEBOUNCE_MS = 650;

function personalizationFromState(state: ConfiguratorState) {
  return {
    riderName: state.riderName,
    raceNumber: state.raceNumber,
    plateColor: state.plateColor,
    numberColor: state.numberColor,
    nameColor: state.nameColor,
    palette: state.palette,
  };
}

function logosFromState(state: ConfiguratorState) {
  return state.selectedLogos.map((logo) => ({
    id: logo.id,
    name: logo.name,
    prominenceLevel: logo.prominenceLevel,
    addedAt: logo.addedAt,
  }));
}

export function StorefrontProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useConfigurator();
  const { shopId, features } = useStorefrontTenant();
  const [bootstrap, setBootstrap] = useState<StorefrontBootstrap | null>(null);
  const [bootstrapStatus, setBootstrapStatus] =
    useState<BootstrapStatus>("idle");
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapNonce, setBootstrapNonce] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const creatingRef = useRef(false);
  const lastSyncedSignatureRef = useRef<string | null>(null);

  const reloadBootstrap = useCallback(() => {
    setBootstrapNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setBootstrapStatus("loading");
      setBootstrapError(null);

      try {
        const data = await getStorefrontBootstrap(shopId);
        if (cancelled) return;
        setBootstrap(data);
        setBootstrapStatus("ready");
      } catch (error) {
        if (cancelled) return;
        const message = isJustPrintError(error)
          ? error.userMessage
          : "Impossible de charger le catalogue JustPrint.";
        setBootstrapError(message);
        setBootstrapStatus("error");
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [bootstrapNonce, shopId]);

  const ensureConfiguration = useCallback(
    async (draftState: ConfiguratorState): Promise<string | null> => {
      if (draftState.configurationId) {
        return draftState.configurationId;
      }

      if (!draftState.bike || !draftState.selectedDesign) {
        return null;
      }

      if (creatingRef.current) {
        return draftState.configurationId;
      }

      creatingRef.current = true;
      try {
        const draft = await createConfiguration({
          shopId,
          bikeId: draftState.bike.id,
          designId: draftState.selectedDesign,
          previewMode: getBikePreviewMode(draftState.bike),
          personalization: personalizationFromState(draftState),
          logos: logosFromState(draftState),
        });
        dispatch({ type: "SET_CONFIGURATION_ID", payload: draft.id });
        lastSyncedSignatureRef.current = null;
        return draft.id;
      } catch (error) {
        const message = isJustPrintError(error)
          ? error.userMessage
          : "Impossible de créer la configuration JustPrint.";
        setSyncError(message);
        setSyncStatus("error");
        return null;
      } finally {
        creatingRef.current = false;
      }
    },
    [dispatch, shopId],
  );

  useEffect(() => {
    if (bootstrapStatus !== "ready") return;
    if (!state.configurationId) return;
    if (!state.bike || !state.selectedDesign) return;

    const signature = JSON.stringify({
      configurationId: state.configurationId,
      bikeId: state.bike.id,
      designId: state.selectedDesign,
      personalization: personalizationFromState(state),
      logos: logosFromState(state),
      previewMode: getBikePreviewMode(state.bike),
    });

    if (signature === lastSyncedSignatureRef.current) {
      return;
    }

    let cancelled = false;
    setSyncStatus("saving");
    setSyncError(null);

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          await updateConfiguration({
            configurationId: state.configurationId!,
            bikeId: state.bike!.id,
            designId: state.selectedDesign!,
            previewMode: getBikePreviewMode(state.bike),
            personalization: personalizationFromState(state),
            logos: logosFromState(state),
            status: "draft",
          });
          if (cancelled) return;
          lastSyncedSignatureRef.current = signature;
          setSyncStatus("saved");
        } catch (error) {
          if (cancelled) return;
          const message = isJustPrintError(error)
            ? error.userMessage
            : "Erreur de sauvegarde JustPrint. Tes choix locaux sont conservés.";
          setSyncError(message);
          setSyncStatus("error");
        }
      })();
    }, SYNC_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [bootstrapStatus, state]);

  const clearSyncError = useCallback(() => {
    setSyncError(null);
    if (syncStatus === "error") {
      setSyncStatus("idle");
    }
  }, [syncStatus]);

  const retrySync = useCallback(() => {
    lastSyncedSignatureRef.current = null;
    setSyncError(null);
    setSyncStatus("idle");
  }, []);

  const value = useMemo<StorefrontContextValue>(
    () => ({
      bootstrap,
      bootstrapStatus,
      bootstrapError,
      reloadBootstrap,
      bikes: bootstrap?.bikes ?? [],
      designs: bootstrap?.designs ?? [],
      logoCategories: features.enableLogoLibrary
        ? (bootstrap?.logoCategories ?? [])
        : [],
      logos: features.enableLogoLibrary ? (bootstrap?.logos ?? []) : [],
      shopId,
      syncStatus,
      syncError,
      clearSyncError,
      retrySync,
      ensureConfiguration,
    }),
    [
      bootstrap,
      bootstrapStatus,
      bootstrapError,
      reloadBootstrap,
      features.enableLogoLibrary,
      shopId,
      syncStatus,
      syncError,
      clearSyncError,
      retrySync,
      ensureConfiguration,
    ],
  );

  return (
    <StorefrontContext.Provider value={value}>
      {children}
    </StorefrontContext.Provider>
  );
}

export function useStorefront(): StorefrontContextValue {
  const context = useContext(StorefrontContext);
  if (!context) {
    throw new Error("useStorefront must be used within a StorefrontProvider");
  }
  return context;
}
