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
  createSavedDesign,
  finalizeSavedDesign,
  getStorefrontBootstrap,
  isJustPrintError,
  updateSavedDesign,
} from "@/lib/justprint-client";
import { logSavedDesignSync } from "@/lib/justprint/sync-log";
import { hasValidServerConfiguration, saveDraft } from "@/lib/storage";
import type { ConfiguratorState } from "@/types/configurator";
import type {
  ConfigurationStatus,
  FinalizeSavedDesignResponse,
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
  ensureSavedDesign: (state: ConfiguratorState) => Promise<string | null>;
  /** @deprecated Prefer ensureSavedDesign */
  ensureConfiguration: (state: ConfiguratorState) => Promise<string | null>;
  /** Flush pending save, then finalize. Returns publicId on success. */
  finalizeForCart: (
    state: ConfiguratorState,
  ) => Promise<FinalizeSavedDesignResponse>;
}

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

const SYNC_DEBOUNCE_MS = 700;

function toConfigurationStatus(
  status: string | ConfigurationStatus | null | undefined,
): ConfigurationStatus {
  if (
    status === "draft" ||
    status === "preview_ready" ||
    status === "completed" ||
    status === "finalized"
  ) {
    return status;
  }
  return "draft";
}

function buildSyncSignature(state: ConfiguratorState): string {
  return JSON.stringify({
    savedDesignId: state.savedDesignId,
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
  const debounceTimerRef = useRef<number | null>(null);
  const syncPausedRef = useRef(false);
  const serverCredentialsRef = useRef<{
    savedDesignId: string;
    publicId: string;
    editToken: string;
  } | null>(null);

  useEffect(() => {
    latestStateRef.current = state;
    if (
      state.savedDesignId &&
      state.publicId &&
      state.editToken &&
      state.configurationStatus !== "finalized"
    ) {
      serverCredentialsRef.current = {
        savedDesignId: state.savedDesignId,
        publicId: state.publicId,
        editToken: state.editToken,
      };
    } else if (!state.savedDesignId) {
      serverCredentialsRef.current = null;
    }

    // After « Recommencer à zéro » (or empty state), allow a fresh remote create.
    if (!state.bike && !state.selectedDesign && !state.savedDesignId) {
      createAttemptedKeyRef.current = null;
      lastSyncedSignatureRef.current = null;
      createPromiseRef.current = null;
      creatingRef.current = false;
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
        logSavedDesignSync({
          step: "bootstrap",
          endpoint: "/api/storefront/bootstrap",
          status: 200,
          ok: true,
          bikeId: data.bikes[0]?.id ?? null,
          designId: data.designs[0]?.id ?? null,
        });
        setBootstrap(data);
        setBootstrapStatus("ready");
      } catch (error) {
        if (cancelled) return;
        const message = isJustPrintError(error)
          ? error.userMessage
          : "Impossible de charger le catalogue JustPrint.";
        logSavedDesignSync({
          step: "bootstrap",
          endpoint: "/api/storefront/bootstrap",
          status: isJustPrintError(error) ? error.status : null,
          ok: false,
          message,
        });
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

  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current != null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const performSave = useCallback(
    async (draftState: ConfiguratorState): Promise<boolean> => {
      if (
        !draftState.savedDesignId ||
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
        const result = await updateSavedDesign(
          draftState.savedDesignId,
          draftState.editToken,
          buildPatchConfigurationBody(draftState, snapshotContext),
        );
        logSavedDesignSync({
          step: "patch",
          endpoint: `/api/storefront/saved-designs/${draftState.savedDesignId}`,
          status: 200,
          ok: true,
          bikeId: draftState.bike.id,
          designId: draftState.selectedDesign,
          raceNumberPresent: Boolean(draftState.raceNumber.trim()),
          savedDesignIdPresent: true,
        });
        lastSyncedSignatureRef.current = signature;
        const savedAt = result.updatedAt;
        dispatch({ type: "SET_LAST_SAVED_AT", payload: savedAt });
        dispatch({
          type: "SET_CONFIGURATION_STATUS",
          payload: toConfigurationStatus(result.status),
        });
        if (result.publicId) {
          dispatch({ type: "SET_PUBLIC_ID", payload: result.publicId });
        }
        setSync("saved");
        saveDraft({
          ...draftState,
          publicId: result.publicId || draftState.publicId,
          configurationStatus: toConfigurationStatus(result.status),
          lastSavedAt: savedAt,
          synchronizationStatus: "saved",
        });
        return true;
      } catch (error) {
        const message = isJustPrintError(error)
          ? `Échec de la sauvegarde (PATCH) : ${error.userMessage}`
          : "Échec de la sauvegarde JustPrint (PATCH). Tes choix locaux sont conservés.";
        logSavedDesignSync({
          step: "patch",
          endpoint: `/api/storefront/saved-designs/${draftState.savedDesignId}`,
          status: isJustPrintError(error) ? error.status : null,
          ok: false,
          bikeId: draftState.bike.id,
          designId: draftState.selectedDesign,
          raceNumberPresent: Boolean(draftState.raceNumber.trim()),
          savedDesignIdPresent: true,
          message,
        });
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

  const ensureSavedDesign = useCallback(
    async (draftState: ConfiguratorState): Promise<string | null> => {
      if (hasValidServerConfiguration(draftState)) {
        serverCredentialsRef.current = {
          savedDesignId: draftState.savedDesignId!,
          publicId: draftState.publicId!,
          editToken: draftState.editToken!,
        };
        return draftState.savedDesignId;
      }

      if (serverCredentialsRef.current) {
        return serverCredentialsRef.current.savedDesignId;
      }

      if (!draftState.bike || !draftState.selectedDesign) {
        return null;
      }

      if (createPromiseRef.current) {
        return createPromiseRef.current;
      }

      if (creatingRef.current) {
        return draftState.savedDesignId;
      }

      creatingRef.current = true;
      setSync("creating");
      setSyncError(null);

      const promise = (async (): Promise<string | null> => {
        try {
          const created = await createSavedDesign(
            buildCreateConfigurationBody(draftState, snapshotContext),
          );
          const savedDesignId = created.configurationId;

          logSavedDesignSync({
            step: "create",
            endpoint: "/api/storefront/saved-designs",
            status: 201,
            ok: true,
            bikeId: draftState.bike?.id ?? null,
            designId: draftState.selectedDesign,
            raceNumberPresent: Boolean(draftState.raceNumber.trim()),
            savedDesignIdPresent: Boolean(savedDesignId),
          });

          serverCredentialsRef.current = {
            savedDesignId,
            publicId: created.publicId,
            editToken: created.editToken,
          };

          dispatch({
            type: "SET_SERVER_CONFIGURATION",
            payload: {
              savedDesignId,
              publicId: created.publicId,
              editToken: created.editToken,
              status: toConfigurationStatus(created.status),
              lastSavedAt: created.createdAt,
            },
          });

          lastSyncedSignatureRef.current = buildSyncSignature({
            ...draftState,
            savedDesignId,
            publicId: created.publicId,
            editToken: created.editToken,
          });

          saveDraft({
            ...draftState,
            savedDesignId,
            publicId: created.publicId,
            editToken: created.editToken,
            configurationStatus: toConfigurationStatus(created.status),
            lastSavedAt: created.createdAt,
            synchronizationStatus: "saved",
          });

          setSync("saved");
          return savedDesignId;
        } catch (error) {
          const message = isJustPrintError(error)
            ? `Échec de la création du saved_design : ${error.userMessage}`
            : "Impossible de créer le saved_design JustPrint.";
          logSavedDesignSync({
            step: "create",
            endpoint: "/api/storefront/saved-designs",
            status: isJustPrintError(error) ? error.status : null,
            ok: false,
            bikeId: draftState.bike?.id ?? null,
            designId: draftState.selectedDesign,
            raceNumberPresent: Boolean(draftState.raceNumber.trim()),
            savedDesignIdPresent: false,
            message,
          });
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

    void ensureSavedDesign(state);
  }, [bootstrapStatus, ensureSavedDesign, state]);

  // Debounced auto-save after draft exists.
  useEffect(() => {
    if (bootstrapStatus !== "ready") return;
    if (syncPausedRef.current) return;
    if (!hasValidServerConfiguration(state)) return;
    if (state.configurationStatus === "finalized") return;

    const signature = buildSyncSignature(state);
    if (signature === lastSyncedSignatureRef.current) {
      return;
    }

    clearDebounceTimer();
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      void runSaveLoop();
    }, SYNC_DEBOUNCE_MS);

    return () => {
      clearDebounceTimer();
    };
  }, [bootstrapStatus, clearDebounceTimer, runSaveLoop, state]);

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
    if (
      !hasValidServerConfiguration(current) &&
      current.bike &&
      current.selectedDesign
    ) {
      void ensureSavedDesign(current);
      return;
    }
    void runSaveLoop();
  }, [ensureSavedDesign, runSaveLoop, setSync]);

  const finalizeForCart = useCallback(
    async (
      draftState: ConfiguratorState,
    ): Promise<FinalizeSavedDesignResponse> => {
      syncPausedRef.current = true;
      clearDebounceTimer();

      try {
        if (
          !hasValidServerConfiguration(draftState) &&
          !serverCredentialsRef.current
        ) {
          const createdId = await ensureSavedDesign(draftState);
          if (!createdId || !serverCredentialsRef.current) {
            throw new Error(
              "Échec de la création du saved_design avant finalisation.",
            );
          }
        }

        // Wait for any in-flight debounce / save, then force a last full patch.
        await waitForSaveIdle();

        const credentials = serverCredentialsRef.current;
        const latest = latestStateRef.current;
        const savedDesignId =
          credentials?.savedDesignId ?? latest.savedDesignId;
        const editToken = credentials?.editToken ?? latest.editToken;

        if (
          !savedDesignId ||
          !editToken ||
          !latest.bike ||
          !latest.selectedDesign
        ) {
          const missing = [
            !latest.bike ? "moto" : null,
            !latest.selectedDesign ? "design" : null,
            !savedDesignId ? "savedDesignId" : null,
            !editToken ? "jeton d’édition" : null,
          ]
            .filter(Boolean)
            .join(", ");
          throw new Error(
            `Impossible de finaliser : champ(s) manquant(s) — ${missing}.`,
          );
        }

        setSync("saving");
        setSyncError(null);

        try {
          await updateSavedDesign(
            savedDesignId,
            editToken,
            buildPatchConfigurationBody(latest, snapshotContext),
          );
          logSavedDesignSync({
            step: "patch",
            endpoint: `/api/storefront/saved-designs/${savedDesignId}`,
            status: 200,
            ok: true,
            bikeId: latest.bike.id,
            designId: latest.selectedDesign,
            raceNumberPresent: Boolean(latest.raceNumber.trim()),
            savedDesignIdPresent: true,
            message: "last-patch-before-finalize",
          });
        } catch (error) {
          const message = isJustPrintError(error)
            ? `Échec du dernier PATCH avant finalisation : ${error.userMessage}`
            : "Échec du dernier PATCH avant finalisation.";
          logSavedDesignSync({
            step: "patch",
            endpoint: `/api/storefront/saved-designs/${savedDesignId}`,
            status: isJustPrintError(error) ? error.status : null,
            ok: false,
            bikeId: latest.bike.id,
            designId: latest.selectedDesign,
            raceNumberPresent: Boolean(latest.raceNumber.trim()),
            savedDesignIdPresent: true,
            message,
          });
          setSyncError(message);
          setSync("error");
          throw new Error(message);
        }

        setSync("finalizing");

        let finalized: FinalizeSavedDesignResponse;
        try {
          finalized = await finalizeSavedDesign(savedDesignId, editToken);
          logSavedDesignSync({
            step: "finalize",
            endpoint: `/api/storefront/saved-designs/${savedDesignId}/finalize`,
            status: 200,
            ok: true,
            bikeId: latest.bike.id,
            designId: latest.selectedDesign,
            raceNumberPresent: Boolean(latest.raceNumber.trim()),
            savedDesignIdPresent: true,
          });
        } catch (error) {
          const message = isJustPrintError(error)
            ? `Échec de la finalisation : ${error.userMessage}`
            : "Échec de la finalisation JustPrint.";
          logSavedDesignSync({
            step: "finalize",
            endpoint: `/api/storefront/saved-designs/${savedDesignId}/finalize`,
            status: isJustPrintError(error) ? error.status : null,
            ok: false,
            bikeId: latest.bike.id,
            designId: latest.selectedDesign,
            raceNumberPresent: Boolean(latest.raceNumber.trim()),
            savedDesignIdPresent: true,
            message,
          });
          setSyncError(message);
          setSync("error");
          throw new Error(message);
        }

        dispatch({
          type: "SET_SERVER_CONFIGURATION",
          payload: {
            savedDesignId: finalized.configurationId,
            publicId: finalized.publicId,
            editToken,
            status: "finalized",
            lastSavedAt: new Date().toISOString(),
          },
        });
        setSync("finalized");
        serverCredentialsRef.current = null;

        return finalized;
      } finally {
        syncPausedRef.current = false;
      }
    },
    [
      clearDebounceTimer,
      dispatch,
      ensureSavedDesign,
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
      ensureSavedDesign,
      ensureConfiguration: ensureSavedDesign,
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
      ensureSavedDesign,
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
