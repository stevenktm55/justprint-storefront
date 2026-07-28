"use client";

import { Maximize2 } from "lucide-react";
import { JustPrintEmbeddedPreview } from "@/components/configurator/JustPrintEmbeddedPreview";
import { ViewerAnchor } from "@/components/configurator/ViewerAnchor";
import { useConfigurator } from "@/context/ConfiguratorContext";
import { usePersistentStorefrontViewer } from "@/context/PersistentStorefrontViewerContext";
import {
  getBikePreviewMode,
  previewModeHelpText,
} from "@/lib/bike-preview";
import { isJustPrintMockMode } from "@/lib/justprint-client";
import { shouldUsePersistent3dViewer } from "@/lib/justprint/preview-embed";
import type { PreviewView } from "@/types/configurator";

const VIEWS: { id: PreviewView; label: string }[] = [
  { id: "front", label: "Face" },
  { id: "left", label: "Gauche" },
  { id: "right", label: "Droite" },
  { id: "top", label: "Dessus" },
];

export function DesktopPreview() {
  const { state, dispatch } = useConfigurator();
  const { expandViewer, viewerStatus, isExpanded } =
    usePersistentStorefrontViewer();
  const mode = getBikePreviewMode(state.bike);
  const remote = !isJustPrintMockMode();
  const persistent3d = shouldUsePersistent3dViewer({
    isMockMode: isJustPrintMockMode(),
    previewMode: mode,
  });

  const statusHint =
    viewerStatus === "ready" || viewerStatus === "model-ready"
      ? "Aperçu prêt"
      : "Préparation de la moto…";

  return (
    <aside className="lg:sticky lg:top-4 lg:self-start">
      <div className="rm-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--rm-text-muted)]">
            Prévisualisation
          </p>
          {persistent3d ? (
            <button
              type="button"
              onClick={expandViewer}
              className="inline-flex h-8 items-center gap-1 rounded-[var(--rm-radius-sm)] px-2 text-[11px] font-semibold text-[var(--rm-text-muted)]"
              aria-label="Agrandir l’aperçu"
            >
              <Maximize2 size={14} />
              Agrandir
            </button>
          ) : null}
        </div>

        {persistent3d ? (
          <div className="relative h-[320px] overflow-hidden rounded-[var(--rm-radius-sm)] border border-[var(--rm-border)] bg-[var(--rm-surface)]">
            <ViewerAnchor className="h-full w-full" label="Aperçu 3D desktop" />
            {isExpanded ? (
              <div className="pointer-events-none absolute inset-0 z-[1] flex flex-col items-center justify-center gap-1 bg-[var(--rm-surface)] text-xs text-[var(--rm-text-muted)]">
                <span>Aperçu agrandi</span>
                <span className="text-[10px]">{statusHint}</span>
              </div>
            ) : null}
          </div>
        ) : (
          <JustPrintEmbeddedPreview
            configurationId={state.savedDesignId}
            previewMode={mode}
            engineMode="full"
            interactive={mode === "2d"}
          />
        )}

        <p className="mt-2 text-xs leading-relaxed text-[var(--rm-text-muted)]">
          {persistent3d
            ? statusHint
            : remote
              ? "Aperçu JustPrint synchronisé avec ton saved_design (même source que le PDF)."
              : previewModeHelpText(mode)}
        </p>
        {mode === "3d" ? (
          <div
            className="mt-3 grid grid-cols-4 gap-2"
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
                className={`min-h-11 rounded-[var(--rm-radius-sm)] px-1 text-xs font-semibold ${
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
          <p className="mt-3 text-xs font-semibold text-[var(--rm-text-muted)]">
            Vue générale · Agrandir une pièce
          </p>
        )}
      </div>
    </aside>
  );
}
