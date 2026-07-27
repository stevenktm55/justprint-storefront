"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ConfiguratorHeader } from "@/components/configurator/ConfiguratorHeader";
import { DesktopPreview } from "@/components/configurator/DesktopPreview";
import { ProgressBar } from "@/components/configurator/ProgressBar";
import { RestoreDraftNotice } from "@/components/configurator/RestoreDraftNotice";
import { StickyActionBar } from "@/components/configurator/StickyActionBar";
import { StickyMobilePreview } from "@/components/configurator/StickyMobilePreview";
import { BottomSheet } from "@/components/configurator/ui/BottomSheet";
import { SummaryRow } from "@/components/configurator/ui/SummaryRow";
import {
  BikeStep,
  canProceedFromBike,
} from "@/components/configurator/steps/BikeStep";
import {
  DesignStep,
  canProceedFromDesign,
} from "@/components/configurator/steps/DesignStep";
import {
  PersonalizationStep,
  canProceedFromPersonalization,
} from "@/components/configurator/steps/PersonalizationStep";
import { LogosStep } from "@/components/configurator/steps/LogosStep";
import { PreviewStep } from "@/components/configurator/steps/PreviewStep";
import { useConfigurator } from "@/context/ConfiguratorContext";
import { useStorefront } from "@/context/StorefrontContext";
import { useStorefrontTenant } from "@/context/StorefrontTenantContext";
import {
  buildCompletionSummary,
  buildShopifyCartSummary,
  formatBikeLabel,
  getDesignName,
} from "@/lib/cart-summary";
import { generateConfigurationId } from "@/lib/configuration-id";
import { addGarageBike, loadGarageBikes } from "@/lib/garage";
import { justPrintClient, isJustPrintError } from "@/lib/justprint-client";
import { saveDraft, saveCompletedConfiguration } from "@/lib/storage";
import {
  notifyParentConfigurationCompleted,
  readShopifyQueryParams,
} from "@/lib/shopify-bridge";
import type {
  ConfigurationCompletionSummary,
  ConfiguratorStep,
  JustPrintCompletionMessage,
} from "@/types/configurator";

const PRIMARY_LABELS: Record<ConfiguratorStep, string> = {
  1: "Voir les designs",
  2: "Personnaliser ce design",
  3: "Ajouter mes logos",
  4: "Voir mon kit final",
  5: "Ajouter au panier — Démo",
};

function SyncStatusBadge({
  status,
  onRetry,
}: {
  status: "idle" | "saving" | "saved" | "error";
  onRetry: () => void;
}) {
  if (status === "idle") return null;

  if (status === "saving") {
    return (
      <p className="text-[11px] font-medium text-[var(--rm-text-muted)]">
        Sauvegarde…
      </p>
    );
  }

  if (status === "saved") {
    return (
      <p className="text-[11px] font-medium text-[var(--rm-success)]">
        Sauvegardé
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={onRetry}
      className="text-[11px] font-medium text-[var(--rm-accent)] underline-offset-2 hover:underline"
    >
      Erreur de sauvegarde — Réessayer
    </button>
  );
}

export function ConfiguratorShell() {
  const {
    state,
    dispatch,
    goNext,
    goPrev,
    resetConfiguration,
    dismissRestoreNotice,
    isHydrated,
  } = useConfigurator();
  const {
    bootstrapStatus,
    bootstrapError,
    reloadBootstrap,
    syncStatus,
    syncError,
    clearSyncError,
    retrySync,
    ensureConfiguration,
  } = useStorefront();
  const { tenant, allowedParentOrigins } = useStorefrontTenant();
  const searchParams = useSearchParams();
  const [quitOpen, setQuitOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cartSummary, setCartSummary] = useState(() =>
    buildShopifyCartSummary(state, state.configurationId ?? "—"),
  );
  const [completionSummary, setCompletionSummary] =
    useState<ConfigurationCompletionSummary | null>(null);

  const shopifyParams = useMemo(
    () => readShopifyQueryParams(searchParams),
    [searchParams],
  );

  const showStickyMobilePreview =
    state.currentStep === 3 || state.currentStep === 4;

  const canProceed = useMemo(() => {
    switch (state.currentStep) {
      case 1:
        return canProceedFromBike(state.bike);
      case 2:
        return canProceedFromDesign(state.selectedDesign);
      case 3:
        return canProceedFromPersonalization(state.raceNumber);
      case 4:
      case 5:
        return true;
      default:
        return false;
    }
  }, [state]);

  const handleAddToCartDemo = useCallback(async () => {
    setLoading(true);
    setActionError(null);

    try {
      const configurationId =
        state.configurationId ??
        (await ensureConfiguration(state)) ??
        generateConfigurationId();

      if (!state.configurationId) {
        dispatch({ type: "SET_CONFIGURATION_ID", payload: configurationId });
      }

      const completion = await justPrintClient.completeConfigurationFromState({
        ...state,
        configurationId,
      });

      const summary = buildCompletionSummary({
        ...state,
        configurationId,
      });
      const shopifySummary = buildShopifyCartSummary(
        { ...state, configurationId },
        configurationId,
      );

      const message: JustPrintCompletionMessage = {
        type: "JUSTPRINT_CONFIGURATION_COMPLETED",
        configurationId: completion.configurationId,
        variantId: null,
        previewUrl: completion.previewUrl,
        previewMode: completion.previewMode,
        productionStatus: "ready",
        source: "rawmoto-local-demo",
        summary,
      };

      saveCompletedConfiguration({
        message,
        shopifySummary,
      });
      saveDraft({ ...state, configurationId });
      setCartSummary(shopifySummary);
      setCompletionSummary(summary);

      notifyParentConfigurationCompleted(message, allowedParentOrigins);
      setSuccessOpen(true);
    } catch (error) {
      const message = isJustPrintError(error)
        ? error.userMessage
        : "Impossible de finaliser la configuration. Tes choix sont conservés.";
      setActionError(message);
    } finally {
      setLoading(false);
    }
  }, [allowedParentOrigins, dispatch, ensureConfiguration, state]);

  const handlePrimaryAction = useCallback(async () => {
    if (!canProceed) return;

    if (state.currentStep === 5) {
      await handleAddToCartDemo();
      return;
    }

    if (state.currentStep === 2 && state.returnToFinalPreview) {
      await ensureConfiguration(state);
      dispatch({ type: "FINISH_DESIGN_CHANGE_FROM_PREVIEW" });
      return;
    }

    setLoading(true);
    setActionError(null);

    try {
      if (state.currentStep === 1 && state.bike) {
        addGarageBike(loadGarageBikes(), state.bike);
        await justPrintClient.getCompatibleDesigns(state.bike);
      }

      if (state.currentStep === 2 && state.bike && state.selectedDesign) {
        await ensureConfiguration(state);
      }

      if (state.currentStep === 4) {
        const configurationId = await ensureConfiguration(state);

        if (configurationId) {
          await justPrintClient.generatePreview({
            ...state,
            configurationId,
          });
        } else {
          await justPrintClient.generatePreview(state);
        }

        await justPrintClient.runProductionChecks(state);
        await justPrintClient.saveDraft({
          ...state,
          configurationId: configurationId ?? state.configurationId,
        });

        dispatch({
          type: "SET_PRODUCTION_CHECKS",
          payload: state.productionChecks.map((check) => ({
            ...check,
            status: "validated",
          })),
        });
      }

      goNext();
    } catch (error) {
      const message = isJustPrintError(error)
        ? error.userMessage
        : "JustPrint est indisponible. Tes choix locaux sont conservés.";
      setActionError(message);
      // Still allow progression in the local flow when possible.
      if (state.currentStep !== 4) {
        goNext();
      }
    } finally {
      setLoading(false);
    }
  }, [
    canProceed,
    dispatch,
    ensureConfiguration,
    goNext,
    handleAddToCartDemo,
    state,
  ]);

  const handleBack = useCallback(() => {
    if (state.returnToFinalPreview && state.currentStep === 2) {
      dispatch({ type: "FINISH_DESIGN_CHANGE_FROM_PREVIEW" });
      return;
    }

    if (state.currentStep === 1) {
      setLeaveConfirmOpen(true);
      return;
    }
    goPrev();
  }, [dispatch, goPrev, state.currentStep, state.returnToFinalPreview]);

  const handleQuit = useCallback(() => {
    saveDraft(state);
    void justPrintClient.saveDraft(state).catch(() => {
      // Local draft is already saved — remote failure is non-blocking.
    });
    setQuitOpen(true);
  }, [state]);

  const handleSaveDraft = useCallback(async () => {
    setSaving(true);
    setActionError(null);
    try {
      saveDraft(state);
      await justPrintClient.saveDraft(state);
      setSaveOpen(true);
    } catch (error) {
      const message = isJustPrintError(error)
        ? error.userMessage
        : "Erreur de sauvegarde JustPrint. Le brouillon local est conservé.";
      setActionError(message);
      setSaveOpen(true);
    } finally {
      setSaving(false);
    }
  }, [state]);

  const primaryLabel =
    state.currentStep === 2 && state.returnToFinalPreview
      ? "Voir mon kit final"
      : PRIMARY_LABELS[state.currentStep];

  const loadingLabel =
    state.currentStep === 4
      ? "Préparation de ton kit…"
      : state.currentStep === 5
        ? "Ajout au panier…"
        : "Chargement…";

  if (bootstrapStatus === "loading" || bootstrapStatus === "idle") {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-[var(--rm-bg)] px-6 text-center">
        <p className="font-display text-2xl font-extrabold">{tenant.name}</p>
        <p className="text-sm text-[var(--rm-text-muted)]">
          Chargement du catalogue…
        </p>
      </div>
    );
  }

  if (bootstrapStatus === "error") {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-[var(--rm-bg)] px-6 text-center">
        <p className="font-display text-2xl font-extrabold">{tenant.name}</p>
        <p className="max-w-sm text-sm text-[var(--rm-text-muted)]">
          {bootstrapError ??
            "Impossible de charger les données JustPrint."}
        </p>
        <button
          type="button"
          className="rm-btn-primary max-w-xs"
          onClick={reloadBootstrap}
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--rm-bg)]">
      {process.env.NODE_ENV === "development" ? (
        <div className="flex h-[var(--rm-banner-h)] shrink-0 items-center justify-center bg-[var(--rm-text)] px-3 text-center text-[11px] font-medium text-white">
          Démo locale {tenant.name} — aucune commande réelle ne sera créée
        </div>
      ) : null}

      <ConfiguratorHeader onBack={handleBack} onQuit={handleQuit} />
      <ProgressBar currentStep={state.currentStep} />

      <div className="flex items-center justify-between gap-3 px-4 py-1">
        <SyncStatusBadge status={syncStatus} onRetry={retrySync} />
        {syncError || actionError ? (
          <button
            type="button"
            onClick={() => {
              clearSyncError();
              setActionError(null);
              if (syncStatus === "error") retrySync();
            }}
            className="ml-auto max-w-[70%] truncate text-right text-[11px] text-[var(--rm-accent)]"
            title={syncError ?? actionError ?? undefined}
          >
            {syncError ?? actionError}
          </button>
        ) : (
          <span />
        )}
      </div>

      <RestoreDraftNotice
        visible={isHydrated && state.draftRestored}
        onDismiss={dismissRestoreNotice}
        onReset={resetConfiguration}
      />

      <StickyMobilePreview visible={showStickyMobilePreview} />

      <div className="mx-auto flex min-h-0 w-full max-w-[var(--rm-max-width)] flex-1 flex-col overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6 lg:px-4 lg:pt-4">
        <main className="rm-scroll min-h-0 flex-1 px-4 py-4 lg:pr-0">
          {state.currentStep === 1 ? <BikeStep /> : null}
          {state.currentStep === 2 ? <DesignStep /> : null}
          {state.currentStep === 3 ? <PersonalizationStep /> : null}
          {state.currentStep === 4 ? <LogosStep /> : null}
          {state.currentStep === 5 ? (
            <PreviewStep
              onAddToCart={() => void handleAddToCartDemo()}
              addingToCart={loading && state.currentStep === 5}
              onSave={() => void handleSaveDraft()}
              saving={saving}
            />
          ) : null}

          <div className="mt-8 pb-2 lg:pb-6">
            <button
              type="button"
              onClick={() => setDebugOpen(true)}
              className="text-xs text-[var(--rm-text-muted)] underline-offset-2 hover:underline"
            >
              Debug URL params
            </button>
          </div>
        </main>

        {state.currentStep < 5 ? <DesktopPreview /> : null}
      </div>

      <StickyActionBar
        label={primaryLabel}
        onClick={() => void handlePrimaryAction()}
        disabled={!canProceed}
        loading={loading}
        loadingLabel={loadingLabel}
        secondaryLabel={state.currentStep === 5 ? "Sauvegarder" : undefined}
        onSecondaryClick={
          state.currentStep === 5 ? () => void handleSaveDraft() : undefined
        }
        secondaryLoading={saving}
        secondaryDisabled={loading}
      />

      <BottomSheet
        open={quitOpen || saveOpen}
        title="Configuration sauvegardée"
        onClose={() => {
          setQuitOpen(false);
          setSaveOpen(false);
        }}
        footer={
          <button
            type="button"
            className="rm-btn-primary"
            onClick={() => {
              setQuitOpen(false);
              setSaveOpen(false);
            }}
          >
            Continuer
          </button>
        }
      >
        <p className="text-sm leading-relaxed">
          Ta configuration a été sauvegardée.
          {actionError ? (
            <>
              {" "}
              <span className="text-[var(--rm-text-muted)]">
                ({actionError})
              </span>
            </>
          ) : null}
        </p>
      </BottomSheet>

      <BottomSheet
        open={leaveConfirmOpen}
        title="Quitter le configurateur ?"
        onClose={() => setLeaveConfirmOpen(false)}
        footer={
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="rm-btn-primary"
              onClick={() => {
                saveDraft(state);
                setLeaveConfirmOpen(false);
                setQuitOpen(true);
              }}
            >
              Sauvegarder et quitter
            </button>
            <button
              type="button"
              className="rm-btn-secondary"
              onClick={() => setLeaveConfirmOpen(false)}
            >
              Rester
            </button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-[var(--rm-text-muted)]">
          Tu es à la première étape. Confirme si tu veux quitter.
        </p>
      </BottomSheet>

      <BottomSheet
        open={successOpen}
        title="Ajouté au panier — Démo"
        onClose={() => setSuccessOpen(false)}
        footer={
          <button
            type="button"
            className="rm-btn-primary"
            onClick={() => setSuccessOpen(false)}
          >
            Fermer
          </button>
        }
      >
        <p className="text-sm leading-relaxed">
          Démo réussie. Aucune commande Shopify réelle n’a été créée.
        </p>
        <div className="mt-4 rounded-[var(--rm-radius)] border border-[var(--rm-border)] bg-[var(--rm-bg)] px-3">
          <SummaryRow label="Moto" value={cartSummary.bikeLabel} />
          <SummaryRow label="Design" value={cartSummary.designName} />
          <SummaryRow
            label="Pilote"
            value={`${cartSummary.riderName || "—"} · #${cartSummary.raceNumber || "—"}`}
          />
          <SummaryRow
            label="Logos"
            value={
              completionSummary && completionSummary.logos.length > 0
                ? completionSummary.logos
                    .map(
                      (logo) =>
                        `${logo.name} — ${logo.prominenceLabel}`,
                    )
                    .join(" · ")
                : String(cartSummary.selectedLogoCount)
            }
          />
          <SummaryRow
            label="Identifiant"
            value={cartSummary.configurationId}
          />
        </div>
        <p className="mt-3 text-sm text-[var(--rm-text-muted)]">
          Un événement{" "}
          <code className="rounded bg-[var(--rm-bg)] px-1">
            JUSTPRINT_CONFIGURATION_COMPLETED
          </code>{" "}
          a été envoyé via postMessage.
        </p>
      </BottomSheet>

      <BottomSheet
        open={debugOpen}
        title="Paramètres URL (debug)"
        onClose={() => setDebugOpen(false)}
        footer={
          <button
            type="button"
            className="rm-btn-primary"
            onClick={() => setDebugOpen(false)}
          >
            Fermer
          </button>
        }
      >
        <p className="mb-3 text-sm text-[var(--rm-text-muted)]">
          Ces paramètres seront utilisés plus tard pour Shopify / JustPrint.
        </p>
        <dl className="space-y-2 font-mono text-sm">
          {(
            Object.entries(shopifyParams) as [
              keyof typeof shopifyParams,
              string | null,
            ][]
          ).map(([key, value]) => (
            <div
              key={key}
              className="flex justify-between gap-3 border-b border-[var(--rm-border)] py-2"
            >
              <dt className="text-[var(--rm-text-muted)]">{key}</dt>
              <dd>{value ?? "null"}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-[var(--rm-text-muted)]">
          Exemple panier futur : {formatBikeLabel(state.bike)} /{" "}
          {getDesignName(state.selectedDesign)}
        </p>
      </BottomSheet>
    </div>
  );
}
