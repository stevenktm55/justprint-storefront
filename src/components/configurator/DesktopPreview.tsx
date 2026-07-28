"use client";

import { JustPrintEmbeddedPreview } from "@/components/configurator/JustPrintEmbeddedPreview";
import { useConfigurator } from "@/context/ConfiguratorContext";
import {
  getBikePreviewMode,
  previewModeHelpText,
} from "@/lib/bike-preview";
import { isJustPrintMockMode } from "@/lib/justprint-client";
import type { PreviewView } from "@/types/configurator";

const VIEWS: { id: PreviewView; label: string }[] = [
  { id: "front", label: "Face" },
  { id: "left", label: "Gauche" },
  { id: "right", label: "Droite" },
  { id: "top", label: "Dessus" },
];

export function DesktopPreview() {
  const { state, dispatch } = useConfigurator();
  const mode = getBikePreviewMode(state.bike);
  const remote = !isJustPrintMockMode();

  return (
    <aside className="lg:sticky lg:top-4 lg:self-start">
      <div className="rm-card p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--rm-text-muted)]">
          Prévisualisation
        </p>
        <JustPrintEmbeddedPreview
          configurationId={state.savedDesignId}
          previewMode={mode}
          engineMode="full"
          interactive={mode === "2d"}
        />
        <p className="mt-2 text-xs leading-relaxed text-[var(--rm-text-muted)]">
          {remote
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
