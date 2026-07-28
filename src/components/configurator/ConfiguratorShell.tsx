"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ConfiguratorHeader } from "@/components/configurator/ConfiguratorHeader";
import { DesktopPreview } from "@/components/configurator/DesktopPreview";
import { ProgressBar } from "@/components/configurator/ProgressBar";
import {
  IncompatibleDraftNotice,
  RestoreDraftNotice,
} from "@/components/configurator/RestoreDraftNotice";
import { StickyActionBar } from "@/components/configurator/StickyActionBar";
import { StickyMobilePreview } from "@/components/configurator/StickyMobilePreview";
import { PersistentStorefrontViewer } from "@/components/configurator/PersistentStorefrontViewer";
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
  buildAddToCartSummary,
  buildShopifyCartSummary,
  cartReadyIssueMessage,
  formatBikeLabel,
  getCartReadyIssue,
  getDesignName,
} from "@/lib/cart-summary";
import { addGarageBike, loadGarageBikes } from "@/lib/garage";
import { justPrintClient, isJustPrintError } from "@/lib/justprint-client";
import {
  clearDraftAfterFinalize,
  getDisplayConfigurationId,
  saveCompletedConfiguration,
  saveDraft,
} from "@/lib/storage";
import {
  canAcceptParentMessage,
  isEmbeddedInIframe,
  isJustPrintCartErrorMessage,
  notifyParentAddToCart,
  readShopifyQueryParams,
} from "@/lib/shopify-bridge";
import { useIsLargeScreen } from "@/lib/use-media-query";
import type {
  ConfiguratorStep,
  JustPrintAddToCartMessage,
  ShopifyCartSummary,
} from "@/types/configurator";
import type { SynchronizationStatus } from "@/types/justprint";

const PRIMARY_LABELS: Record<ConfiguratorStep, string> = {
  1: "Voir les designs",
  2: "Personnaliser ce design",
  3: "Ajouter mes logos",
  4: "Voir mon kit final",
  5: "Ajouter au panier",
};

const OUTSIDE_IFRAME_CART_MESSAGE =
  "Ouvre le configurateur depuis la boutique RawMoto pour ajouter ce kit au panier.";


function SyncStatusBadge({
  status,
  onRetry,
}: {
  status: SynchronizationStatus;
  onRetry: () => void;
}) {
  if (status === "idle" || status === "finalized") return null;

  if (status === "creating" || status === "saving" || status === "finalizing") {
    const label =
      status === "creating"
        ? "Création…"
        : status === "finalizing"
          ? "Finalisation…"
          : "Sauvegarde…";
    return (
      <p className="text-[11px] font-medium text-[var(--rm-text-muted)]">
        {label}
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
    dismissIncompatibleDraftNotice,
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
    finalizeForCart,
    shopId,
  } = useStorefront();
  const { tenant, allowedParentOrigins } = useStorefrontTenant();
  const searchParams = useSearchParams();
  const isLargeScreen = useIsLargeScreen();
  const [quitOpen, setQuitOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [outsideIframeOpen, setOutsideIframeOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cartSummary, setCartSummary] = useState<ShopifyCartSummary>(() =>
    buildShopifyCartSummary(
      state,
      state.savedDesignId ?? "—",
      state.publicId ?? "—",
    ),
  );

  const shopifyParams = useMemo(
    () => readShopifyQueryParams(searchParams),
    [searchParams],
  );

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!canAcceptParentMessage(event.origin, allowedParentOrigins)) {
        return;
      }

      if (!isJustPrintCartErrorMessage(event.data)) {
        return;
      }

      setAddingToCart(false);
      setActionError(
        event.data.message ||
          "Impossible d’ajouter ce kit au panier. Tu peux réessayer.",
      );
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [allowedParentOrigins]);

  const showStickyMobilePreview =
    state.currentStep === 2 ||
    state.currentStep === 3 ||
    state.currentStep === 4;

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

  const handleAddToCart = useCallback(async () => {
    if (addingToCart) return;

    setActionError(null);

    const readyIssue = getCartReadyIssue(state);
    if (readyIssue) {
      setActionError(cartReadyIssueMessage(readyIssue));
      return;
    }

    if (!isEmbeddedInIframe()) {
      setOutsideIframeOpen(true);
      return;
    }

    setAddingToCart(true);

    try {
      const finalized = await finalizeForCart(state);
      const savedDesignId = finalized.configurationId;
      const publicId = finalized.publicId;

      if (!savedDesignId) {
        throw new Error(
          "Échec de la finalisation : JustPrint n’a pas renvoyé de savedDesignId.",
        );
      }
      if (!publicId) {
        throw new Error(
          "Échec de la finalisation : JustPrint n’a pas renvoyé de publicId.",
        );
      }

      const variantId = shopifyParams.variant;
      const summary = buildAddToCartSummary({
        ...state,
        publicId,
        savedDesignId,
        configurationStatus: "finalized",
      });
      const shopifySummary = buildShopifyCartSummary(
        {
          ...state,
          publicId,
          savedDesignId,
          configurationStatus: "finalized",
        },
        savedDesignId,
        publicId,
        variantId,
      );

      // configurationId = UUID saved_designs ; publicId = JP-RM-… ; jamais editToken.
      const message: JustPrintAddToCartMessage = {
        type: "JUSTPRINT_ADD_TO_CART",
        configurationId: savedDesignId,
        publicId,
        source: "justprint-storefront",
        summary,
      };

      saveCompletedConfiguration({
        message,
        shopifySummary,
        publicId,
        savedDesignId,
      });
      clearDraftAfterFinalize();
      setCartSummary(shopifySummary);

      notifyParentAddToCart(message, allowedParentOrigins);
    } catch (error) {
      // Ne pas envoyer de postMessage Shopify si la finalisation échoue.
      const message = isJustPrintError(error)
        ? error.userMessage
        : error instanceof Error && error.message
          ? error.message
          : "Impossible de finaliser le saved_design. Tes choix sont conservés.";
      setActionError(message);
      setAddingToCart(false);
    }
  }, [
    addingToCart,
    allowedParentOrigins,
    finalizeForCart,
    shopifyParams.variant,
    state,
  ]);

  const handlePrimaryAction = useCallback(async () => {
    if (!canProceed) return;

    if (state.currentStep === 5) {
      await handleAddToCart();
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
        const savedDesignId = await ensureConfiguration(state);

        if (savedDesignId) {
          await justPrintClient.generatePreview({
            ...state,
            savedDesignId,
          });
        } else {
          await justPrintClient.generatePreview(state);
        }

        await justPrintClient.runProductionChecks(state);
        await justPrintClient.saveDraft(
          {
            ...state,
            savedDesignId: savedDesignId ?? state.savedDesignId,
          },
          { shopId, locale: "fr" },
        );

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
    handleAddToCart,
    shopId,
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
    void justPrintClient
      .saveDraft(state, { shopId, locale: "fr" })
      .catch(() => {
        // Local draft is already saved — remote failure is non-blocking.
      });
    setQuitOpen(true);
  }, [shopId, state]);

  const handleSaveDraft = useCallback(async () => {
    setSaving(true);
    setActionError(null);
    try {
      await ensureConfiguration(state);
      saveDraft(state);
      await justPrintClient.saveDraft(state, { shopId, locale: "fr" });
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
  }, [ensureConfiguration, shopId, state]);

  const primaryLabel =
    state.currentStep === 2 && state.returnToFinalPreview
      ? "Voir mon kit final"
      : PRIMARY_LABELS[state.currentStep];

  const primaryBusy = loading || addingToCart;
  const loadingLabel =
    state.currentStep === 4
      ? "Préparation de ton kit…"
      : state.currentStep === 5 || addingToCart
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
      <IncompatibleDraftNotice
        visible={isHydrated && state.incompatibleDraftReset && !state.draftRestored}
        onDismiss={dismissIncompatibleDraftNotice}
      />

      {/* Une seule iframe 3D montée ici ; sticky / desktop / final = ancres CSS. */}
      <PersistentStorefrontViewer />
      <StickyMobilePreview visible={showStickyMobilePreview && !isLargeScreen} />

      <div className="mx-auto flex min-h-0 w-full max-w-[var(--rm-max-width)] flex-1 flex-col overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6 lg:px-4 lg:pt-4">
        <main className="rm-scroll min-h-0 flex-1 px-4 py-4 lg:pr-0">
          {state.currentStep === 1 ? <BikeStep /> : null}
          {state.currentStep === 2 ? <DesignStep /> : null}
          {state.currentStep === 3 ? <PersonalizationStep /> : null}
          {state.currentStep === 4 ? <LogosStep /> : null}
          {state.currentStep === 5 ? (
            <PreviewStep
              onAddToCart={() => void handleAddToCart()}
              addingToCart={addingToCart}
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

        {state.currentStep < 5 && isLargeScreen ? <DesktopPreview /> : null}
      </div>

      <StickyActionBar
        label={primaryLabel}
        onClick={() => void handlePrimaryAction()}
        disabled={!canProceed || addingToCart}
        loading={primaryBusy}
        loadingLabel={loadingLabel}
        secondaryLabel={state.currentStep === 5 ? "Sauvegarder" : undefined}
        onSecondaryClick={
          state.currentStep === 5 ? () => void handleSaveDraft() : undefined
        }
        secondaryLoading={saving}
        secondaryDisabled={primaryBusy}
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
        open={outsideIframeOpen}
        title="Ajout au panier"
        onClose={() => setOutsideIframeOpen(false)}
        footer={
          <button
            type="button"
            className="rm-btn-primary"
            onClick={() => setOutsideIframeOpen(false)}
          >
            Compris
          </button>
        }
      >
        <p className="text-sm leading-relaxed">{OUTSIDE_IFRAME_CART_MESSAGE}</p>
        <div className="mt-4 rounded-[var(--rm-radius)] border border-[var(--rm-border)] bg-[var(--rm-bg)] px-3">
          <SummaryRow label="Moto" value={cartSummary.bikeLabel} />
          <SummaryRow label="Design" value={cartSummary.designName} />
          <SummaryRow
            label="Pilote"
            value={`${cartSummary.riderName || "—"} · #${cartSummary.raceNumber || "—"}`}
          />
          <SummaryRow
            label="Logos"
            value={String(cartSummary.selectedLogoCount)}
          />
          <SummaryRow
            label="Identifiant"
            value={
              getDisplayConfigurationId(state) ??
              cartSummary.publicId ??
              cartSummary.configurationId
            }
          />
        </div>
        <p className="mt-3 text-sm text-[var(--rm-text-muted)]">
          Ton brouillon local est conservé.
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
          Ces paramètres sont transmis au parent Shopify via postMessage.
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
          Résumé panier : {formatBikeLabel(state.bike)} /{" "}
          {getDesignName(state.selectedDesign)}
        </p>
      </BottomSheet>
    </div>
  );
}
