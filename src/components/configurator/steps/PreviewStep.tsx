"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  Info,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { JustPrintEmbeddedPreview } from "@/components/configurator/JustPrintEmbeddedPreview";
import { ViewerAnchor } from "@/components/configurator/ViewerAnchor";
import { BottomSheet } from "@/components/configurator/ui/BottomSheet";
import { SummaryRow } from "@/components/configurator/ui/SummaryRow";
import { useConfigurator } from "@/context/ConfiguratorContext";
import { usePersistentStorefrontViewer } from "@/context/PersistentStorefrontViewerContext";
import {
  formatBikeLabel,
  formatLogoProminenceLine,
  formatSelectedColors,
  getDesignName,
} from "@/lib/cart-summary";
import {
  formatPreviewModeLabel,
  getBikePreviewMode,
  previewModeHelpText,
} from "@/lib/bike-preview";
import { isJustPrintMockMode } from "@/lib/justprint-client";
import { shouldUsePersistent3dViewer } from "@/lib/justprint/preview-embed";
import { sortLogosByProminence } from "@/lib/logo-prominence";
import { getDisplayConfigurationId } from "@/lib/storage";
import type { ConfiguratorStep, PreviewView } from "@/types/configurator";

const VIEWS: { id: PreviewView; label: string }[] = [
  { id: "front", label: "Face" },
  { id: "left", label: "Gauche" },
  { id: "right", label: "Droite" },
  { id: "top", label: "Dessus" },
];

interface PreviewStepProps {
  onAddToCart: () => void;
  addingToCart?: boolean;
  onSave: () => void;
  saving?: boolean;
}

export function PreviewStep({
  onAddToCart,
  addingToCart = false,
  onSave,
  saving = false,
}: PreviewStepProps) {
  const { state, dispatch } = useConfigurator();
  const { expandViewer, isExpanded, viewerStatus } =
    usePersistentStorefrontViewer();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const mode = getBikePreviewMode(state.bike);
  const persistent3d = shouldUsePersistent3dViewer({
    isMockMode: isJustPrintMockMode(),
    previewMode: mode,
  });

  const goToStep = (step: ConfiguratorStep) => {
    dispatch({ type: "SET_STEP", payload: step });
  };

  useEffect(() => {
    if (!previewExpanded || persistent3d) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewExpanded(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [previewExpanded, persistent3d]);

  const statusHint =
    viewerStatus === "ready" || viewerStatus === "model-ready"
      ? "Aperçu prêt"
      : "Préparation de la moto…";

  const viewButtons =
    mode === "3d" ? (
      <div
        className="grid grid-cols-4 gap-2"
        role="group"
        aria-label="Angle de vue"
      >
        {VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() =>
              dispatch({ type: "SET_PREVIEW_VIEW", payload: view.id })
            }
            aria-pressed={state.previewView === view.id}
            className={`min-h-11 rounded-[var(--rm-radius-sm)] px-1 text-xs font-semibold sm:text-sm ${
              state.previewView === view.id
                ? "bg-[var(--rm-accent)] text-white"
                : "border border-[var(--rm-border)] bg-[var(--rm-surface)]"
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>
    ) : (
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex min-h-11 items-center rounded-[var(--rm-radius-sm)] bg-[var(--rm-accent)] px-3 text-xs font-semibold text-white sm:text-sm">
          Vue générale
        </span>
        <span className="inline-flex min-h-11 items-center rounded-[var(--rm-radius-sm)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 text-xs font-semibold sm:text-sm">
          Agrandir une pièce
        </span>
      </div>
    );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold leading-none sm:text-4xl">
          Ton kit est prêt
        </h1>
        <p className="mt-2 text-sm text-[var(--rm-text-muted)]">
          {mode === "3d"
            ? "Visualise ton kit directement sur ta moto."
            : "Visualise l’ensemble des pièces de ton kit à plat."}
        </p>
        <p className="mt-1 text-xs text-[var(--rm-text-muted)]">
          {previewModeHelpText(mode)}
        </p>
      </div>

      <div className="relative">
        {persistent3d ? (
          <div className="relative h-[min(52vh,420px)] min-h-[240px] overflow-hidden rounded-[var(--rm-radius)] border border-[var(--rm-border)] bg-[var(--rm-surface)]">
            <ViewerAnchor className="h-full w-full" label="Aperçu 3D final" />
            {isExpanded ? (
              <div className="pointer-events-none absolute inset-0 z-[1] flex flex-col items-center justify-center gap-1 bg-[var(--rm-surface)] text-xs text-[var(--rm-text-muted)]">
                <span>Aperçu agrandi</span>
                <span className="text-[10px]">{statusHint}</span>
              </div>
            ) : null}
          </div>
        ) : !previewExpanded ? (
          <JustPrintEmbeddedPreview
            configurationId={state.savedDesignId}
            previewMode={mode}
            engineMode="full"
            interactive={mode === "2d"}
          />
        ) : (
          <div className="flex min-h-[240px] items-center justify-center rounded-[var(--rm-radius)] border border-[var(--rm-border)] bg-[var(--rm-surface)] text-xs text-[var(--rm-text-muted)]">
            Aperçu agrandi
          </div>
        )}
        <button
          type="button"
          onClick={() =>
            persistent3d ? expandViewer() : setPreviewExpanded(true)
          }
          className="absolute bottom-2 left-2 inline-flex h-10 items-center gap-1.5 rounded-[var(--rm-radius-sm)] bg-black/70 px-2.5 text-xs font-semibold text-white"
          aria-label="Agrandir l’aperçu"
        >
          <Maximize2 size={14} />
          Agrandir
        </button>
      </div>

      {viewButtons}

      <section className="rm-card overflow-hidden">
        <button
          type="button"
          onClick={() => setSummaryOpen((value) => !value)}
          aria-expanded={summaryOpen}
          className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="text-sm font-bold uppercase tracking-wide">
            Récapitulatif
          </span>
          <ChevronDown
            size={18}
            className={`text-[var(--rm-text-muted)] transition-transform ${
              summaryOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {summaryOpen ? (
          <div className="border-t border-[var(--rm-border)] px-4 pb-3">
            <SummaryRow label="Moto" value={formatBikeLabel(state.bike)} />
            <SummaryRow label="Année" value={state.bike?.year ?? "—"} />
            <SummaryRow
              label="Design"
              value={getDesignName(state.selectedDesign)}
            />
            <SummaryRow label="Nom" value={state.riderName || "—"} />
            <SummaryRow label="Numéro" value={state.raceNumber || "—"} />
            <SummaryRow
              label="Couleurs"
              value={
                formatSelectedColors(state).join(" · ") || "—"
              }
            />
            <SummaryRow
              label="Logos"
              value={
                state.selectedLogos.length === 0
                  ? "Aucun"
                  : sortLogosByProminence(state.selectedLogos)
                      .map((logo) => formatLogoProminenceLine(logo))
                      .join(" · ")
              }
            />
            <SummaryRow
              label="Type d’aperçu"
              value={formatPreviewModeLabel(mode)}
            />
            <SummaryRow
              label="Identifiant"
              value={
                getDisplayConfigurationId(state) ?? "En préparation…"
              }
            />
          </div>
        ) : null}
      </section>

      <div className="grid gap-2">
        <button
          type="button"
          className="rm-btn-secondary"
          onClick={() =>
            dispatch({ type: "START_DESIGN_CHANGE_FROM_PREVIEW" })
          }
        >
          Changer de design
        </button>
        <button
          type="button"
          className="rm-btn-secondary"
          onClick={() => goToStep(3)}
        >
          Modifier mes informations
        </button>
        <button
          type="button"
          className="rm-btn-secondary"
          onClick={() => goToStep(4)}
        >
          Modifier mes logos
        </button>
        <button
          type="button"
          className="rm-btn-secondary"
          onClick={() => goToStep(3)}
        >
          Modifier mes couleurs
        </button>
        <button
          type="button"
          className="rm-btn-secondary gap-2"
          onClick={() => setStudioOpen(true)}
        >
          <Info size={16} />
          Modifier dans Studio
        </button>
      </div>

      {!persistent3d && previewExpanded ? (
        <div className="fixed inset-0 z-[100] flex h-[100dvh] flex-col bg-[var(--rm-bg)]">
          <div className="relative flex items-center justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
            <p className="font-display text-sm font-bold tracking-wide text-[var(--rm-text-muted)]">
              APERÇU {mode === "3d" ? "3D" : "2D"}
            </p>
            <button
              type="button"
              onClick={() => setPreviewExpanded(false)}
              className="absolute right-4 top-[max(0.75rem,env(safe-area-inset-top))] inline-flex h-11 items-center gap-1.5 rounded-[var(--rm-radius-sm)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 text-sm font-semibold"
              aria-label="Réduire l’aperçu"
            >
              <Minimize2 size={16} />
              Réduire
            </button>
          </div>

          <div className="min-h-0 flex-1 px-3 pb-2">
            <div className="h-full overflow-hidden rounded-[var(--rm-radius)] border border-[var(--rm-border)] bg-[var(--rm-surface)]">
              <JustPrintEmbeddedPreview
                configurationId={state.savedDesignId}
                previewMode={mode}
                fillHeight
                interactive={mode === "2d"}
                className="h-full"
              />
            </div>
          </div>

          {mode === "3d" ? (
            <div className="px-3 pb-2">{viewButtons}</div>
          ) : null}

          <div className="border-t border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto flex max-w-[var(--rm-max-width)] items-center gap-2">
              <button
                type="button"
                className="rm-btn-secondary h-11 min-h-11 w-auto flex-1 whitespace-nowrap px-3 text-sm"
                onClick={onSave}
                disabled={saving || addingToCart}
              >
                {saving ? "Sauvegarde…" : "Sauvegarder"}
              </button>
              <button
                type="button"
                className="rm-btn-primary h-11 min-h-11 w-auto flex-[1.4] whitespace-nowrap px-3 text-sm"
                onClick={onAddToCart}
                disabled={addingToCart || saving}
              >
                {addingToCart ? "Ajout au panier…" : "Ajouter au panier"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <BottomSheet
        open={studioOpen}
        title="Mode Studio"
        onClose={() => setStudioOpen(false)}
        footer={
          <button
            type="button"
            className="rm-btn-primary"
            onClick={() => setStudioOpen(false)}
          >
            Compris
          </button>
        }
      >
        <p className="text-sm leading-relaxed text-[var(--rm-text-muted)]">
          Le mode Studio permettra plus tard de sélectionner une pièce de la
          moto et de faire des ajustements précis en 2D, sans modifier
          directement le gabarit de production.
        </p>
      </BottomSheet>
    </div>
  );
}
