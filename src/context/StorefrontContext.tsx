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
import {
  buildCreateConfigurationBody,
  buildPatchConfigurationBody,
  createConfiguration,
  finalizeConfiguration,
  getStorefrontBootstrap,
  isJustPrintError,
  updateConfiguration,
} from "@/lib/justprint-client";
import { hasValidServerConfiguration, saveDraft } from "@/lib/storage";
import type { ConfiguratorState } from "@/types/configurator";
import type {
  FinalizeConfigurationResponse,
  StorefrontBootstrap,
  StorefrontDesign,
  StorefrontLogo,
  StorefrontLogoCategory,
  StorefrontBike,
  SynchronizationStatus,
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
  syncStatus: SynchronizationStatus;
  syncError: string | null;
  clearSyncError: () => void;
  retrySync: () => void;
  ensureConfiguration: (
    state: ConfiguratorState,
  ) => Promise<string | null>;
  /** Flush pending save, then finalize. Returns publicId on success. */
  finalizeForCart: (
    state: ConfiguratorState,
  ) => Promise<FinalizeConfigurationResponse>;
}

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

const SYNC_DEBOUNCE_MS = 700;

function buildSyncSignature(state: ConfiguratorState): string {
  return JSON.stringify({
    configurationId: state.configurationId,
    bikeId: state.bike?.id ?? null,
    designId: state.selectedDesign,
    riderName: state.riderName,
    raceNumber: state.raceNumber,
    plateColor: state.plateColor,
    numberColor: state.numberColor,
    nameColor: state.nameColor,
    palette: state.palette,
    logos: state.selectedLogos.map((logo) => ({
      id: logo.id,
      name: logo.name,
      prominenceLevel: logo.prominenceLevel,
    })),
  });
}

export function StorefrontProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useConfigurator();
  const { shopId, features, tenant } = useStorefrontTenant();
  const [bootstrap, setBootstrap] = useState<StorefrontBootstrap | null>(null);
  const [bootstrapStatus, setBootstrapStatus] =
    useState<BootstrapStatus>("idle");
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapNonce, setBootstrapNonce] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SynchronizationStatus>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);

  const creatingRef = useRef(false);
  const createPromiseRef = useRef<Promise<string | null> | null>(null);
  const createAttemptedKeyRef = useRef<string | null>(null);
  const lastSyncedSignatureRef = useRef<string | null>(null);
  const saveInFlightRef = useRef(false);
  const saveQueuedRef = useRef(false);
  const latestStateRef = useRef(state);
  const flushResolversRef = useRef<Array<() => void>>([]);
  const serverCredentialsRef = useRef<{
    configurationId: string;
    publicId: string;
    editToken: string;
  } | null>(null);

  useEffect(() => {
    latestStateRef.current = state;
    if (
      state.configurationId &&
      state.publicId &&
      state.editToken &&
      state.configurationStatus !== "finalized"
    ) {
      serverCredentialsRef.current = {
        configurationId: state.configurationId,
        publicId: state.publicId,
        editToken: state.editToken,
      };
    } else if (!state.configurationId) {
      serverCredentialsRef.current = null;
    }
  }, [state]);

  const snapshotContext = useMemo(
    () => ({
      shopId,
      locale: tenant.locale?.startsWith("fr") ? "fr" : "en",
    }),
    [shopId, tenant.locale],
  );

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

  const setSync = useCallback(
    (status: SynchronizationStatus) => {
      setSyncStatus(status);
      dispatch({ type: "SET_SYNCHRONIZATION_STATUS", payload: status });
    },
    [dispatch],
  );

  const performSave = useCallback(
    async (draftState: ConfiguratorState): Promise<boolean> => {
      if (
        !draftState.configurationId ||
        !draftState.editToken ||
        !draftState.bike ||
        !draftState.selectedDesign
      ) {
        return true;
      }

      if (draftState.configurationStatus === "finalized") {
        return true;
      }

      const signature = buildSyncSignature(draftState);
      setSync("saving");
      setSyncError(null);

      try {
        const result = await updateConfiguration(
          draftState.configurationId,
          draftState.editToken,
          buildPatchConfigurationBody(draftState, snapshotContext),
        );
        lastSyncedSignatureRef.current = signature;
        const savedAt = result.updatedAt;
        dispatch({ type: "SET_LAST_SAVED_AT", payload: savedAt });
        dispatch({
          type: "SET_CONFIGURATION_STATUS",
          payload: result.status,
        });
        if (result.publicId) {
          dispatch({ type: "SET_PUBLIC_ID", payload: result.publicId });
        }
        setSync("saved");
        saveDraft({
          ...draftState,
          publicId: result.publicId || draftState.publicId,
          configurationStatus: result.status,
          lastSavedAt: savedAt,
          synchronizationStatus: "saved",
        });
        return true;
      } catch (error) {
        const message = isJustPrintError(error)
          ? error.userMessage
          : "Erreur de sauvegarde JustPrint. Tes choix locaux sont conservés.";
        setSyncError(message);
        setSync("error");
        return false;
      }
    },
    [dispatch, setSync, snapshotContext],
  );

  const runSaveLoop = useCallback(async () => {
    if (saveInFlightRef.current) {
      saveQueuedRef.current = true;
      return;
    }

    saveInFlightRef.current = true;
    try {
      do {
        saveQueuedRef.current = false;
        await performSave(latestStateRef.current);
      } while (saveQueuedRef.current);
    } finally {
      saveInFlightRef.current = false;
      const resolvers = flushResolversRef.current.splice(0);
      for (const resolve of resolvers) {
        resolve();
      }
    }
  }, [performSave]);

  const waitForSaveIdle = useCallback(async () => {
    if (!saveInFlightRef.current && !saveQueuedRef.current) {
      return;
    }
    await new Promise<void>((resolve) => {
      flushResolversRef.current.push(resolve);
    });
  }, []);

  const ensureConfiguration = useCallback(
    async (draftState: ConfiguratorState): Promise<string | null> => {
      if (hasValidServerConfiguration(draftState)) {
        serverCredentialsRef.current = {
          configurationId: draftState.configurationId!,
          publicId: draftState.publicId!,
          editToken: draftState.editToken!,
        };
        return draftState.configurationId;
      }

      if (serverCredentialsRef.current) {
        return serverCredentialsRef.current.configurationId;
      }

      if (!draftState.bike || !draftState.selectedDesign) {
        return null;
      }

      if (createPromiseRef.current) {
        return createPromiseRef.current;
      }

      if (creatingRef.current) {
        return draftState.configurationId;
      }

      creatingRef.current = true;
      setSync("creating");
      setSyncError(null);

      const promise = (async (): Promise<string | null> => {
        try {
          const created = await createConfiguration(
            buildCreateConfigurationBody(draftState, snapshotContext),
          );

          serverCredentialsRef.current = {
            configurationId: created.configurationId,
            publicId: created.publicId,
            editToken: created.editToken,
          };

          dispatch({
            type: "SET_SERVER_CONFIGURATION",
            payload: {
              configurationId: created.configurationId,
              publicId: created.publicId,
              editToken: created.editToken,
              status: created.status,
              lastSavedAt: created.createdAt,
            },
          });

          lastSyncedSignatureRef.current = buildSyncSignature({
            ...draftState,
            configurationId: created.configurationId,
            publicId: created.publicId,
            editToken: created.editToken,
          });

          saveDraft({
            ...draftState,
            configurationId: created.configurationId,
            publicId: created.publicId,
            editToken: created.editToken,
            configurationStatus: created.status,
            lastSavedAt: created.createdAt,
            synchronizationStatus: "saved",
          });

          setSync("saved");
          return created.configurationId;
        } catch (error) {
          const message = isJustPrintError(error)
            ? error.userMessage
            : "Impossible de créer la configuration JustPrint.";
          setSyncError(message);
          setSync("error");
          return null;
        } finally {
          creatingRef.current = false;
          createPromiseRef.current = null;
        }
      })();

      createPromiseRef.current = promise;
      return promise;
    },
    [dispatch, setSync, snapshotContext],
  );

  // Create draft once bike + design are known (including restored drafts).
  useEffect(() => {
    if (bootstrapStatus !== "ready") return;
    if (!state.bike || !state.selectedDesign) return;
    if (hasValidServerConfiguration(state)) return;
    if (state.configurationStatus === "finalized") return;
    if (creatingRef.current || createPromiseRef.current) return;

    const attemptKey = `${state.bike.id}:${state.selectedDesign}`;
    if (createAttemptedKeyRef.current === attemptKey) return;
    createAttemptedKeyRef.current = attemptKey;

    void ensureConfiguration(state);
  }, [
    bootstrapStatus,
    ensureConfiguration,
    state,
  ]);

  // Debounced auto-save after draft exists.
  useEffect(() => {
    if (bootstrapStatus !== "ready") return;
    if (!hasValidServerConfiguration(state)) return;
    if (state.configurationStatus === "finalized") return;

    const signature = buildSyncSignature(state);
    if (signature === lastSyncedSignatureRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      void runSaveLoop();
    }, SYNC_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [bootstrapStatus, runSaveLoop, state]);

  const clearSyncError = useCallback(() => {
    setSyncError(null);
    if (syncStatus === "error") {
      setSync("idle");
    }
  }, [setSync, syncStatus]);

  const retrySync = useCallback(() => {
    lastSyncedSignatureRef.current = null;
    createAttemptedKeyRef.current = null;
    setSyncError(null);
    setSync("idle");

    const current = latestStateRef.current;
    if (!hasValidServerConfiguration(current) && current.bike && current.selectedDesign) {
      void ensureConfiguration(current);
      return;
    }
    void runSaveLoop();
  }, [ensureConfiguration, runSaveLoop, setSync]);

  const finalizeForCart = useCallback(
    async (
      draftState: ConfiguratorState,
    ): Promise<FinalizeConfigurationResponse> => {
      if (!hasValidServerConfiguration(draftState) && !serverCredentialsRef.current) {
        const createdId = await ensureConfiguration(draftState);
        if (!createdId || !serverCredentialsRef.current) {
          throw new Error(
            "Impossible de créer la configuration avant finalisation.",
          );
        }
      }

      // Wait for any in-flight debounce / save, then force a last full patch.
      await waitForSaveIdle();

      const credentials = serverCredentialsRef.current;
      const latest = latestStateRef.current;
      const configurationId =
        credentials?.configurationId ?? latest.configurationId;
      const editToken = credentials?.editToken ?? latest.editToken;

      if (
        !configurationId ||
        !editToken ||
        !latest.bike ||
        !latest.selectedDesign
      ) {
        throw new Error("Configuration incomplète pour la finalisation.");
      }

      setSync("saving");
      setSyncError(null);

      await updateConfiguration(
        configurationId,
        editToken,
        buildPatchConfigurationBody(latest, snapshotContext),
      );

      setSync("finalizing");

      const finalized = await finalizeConfiguration(
        configurationId,
        editToken,
      );

      dispatch({
        type: "SET_SERVER_CONFIGURATION",
        payload: {
          configurationId: finalized.configurationId,
          publicId: finalized.publicId,
          editToken,
          status: "finalized",
          lastSavedAt: new Date().toISOString(),
        },
      });
      setSync("finalized");
      serverCredentialsRef.current = null;

      return finalized;
    },
    [
      dispatch,
      ensureConfiguration,
      setSync,
      snapshotContext,
      waitForSaveIdle,
    ],
  );

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
      finalizeForCart,
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
      finalizeForCart,
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
