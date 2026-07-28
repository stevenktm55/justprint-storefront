"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Maximize2 } from "lucide-react";
import { JustPrintEmbeddedPreview } from "@/components/configurator/JustPrintEmbeddedPreview";
import { ViewerAnchor } from "@/components/configurator/ViewerAnchor";
import { useConfigurator } from "@/context/ConfiguratorContext";
import { usePersistentStorefrontViewer } from "@/context/PersistentStorefrontViewerContext";
import { getBikePreviewMode } from "@/lib/bike-preview";
import { isJustPrintMockMode } from "@/lib/justprint-client";
import {
  resolveRemotePreviewKind,
  shouldUsePersistent3dViewer,
} from "@/lib/justprint/preview-embed";
import type { ConfiguratorStep } from "@/types/configurator";

interface StickyMobilePreviewProps {
  visible: boolean;
}

/**
 * Vignette sticky (Personnalisation → Logos).
 * Invisible aux étapes Moto / Design — le viewer précharge en mode background.
 * En 3D remote : ancre layout pour le viewer persistant (pas d’iframe ici).
 * En mock / 2D : JustPrintEmbeddedPreview local ou embed legacy.
 */
export function StickyMobilePreview({ visible }: StickyMobilePreviewProps) {
  const { state } = useConfigurator();
  const { expandViewer, viewerStatus, isExpanded } =
    usePersistentStorefrontViewer();
  const [collapsedByStep, setCollapsedByStep] = useState<
    Partial<Record<ConfiguratorStep, boolean>>
  >({});
  const [legacyExpanded, setLegacyExpanded] = useState(false);
  const mode = getBikePreviewMode(state.bike);
  const persistent3d = shouldUsePersistent3dViewer({
    isMockMode: isJustPrintMockMode(),
    previewMode: mode,
  });
  const kind = resolveRemotePreviewKind({
    isMockMode: isJustPrintMockMode(),
    bikeId: state.bike?.id,
    designId: state.selectedDesign,
    previewMode: mode,
    savedDesignId: state.savedDesignId,
  });

  const useLiteStrip =
    !persistent3d &&
    !isJustPrintMockMode() &&
    (kind === "remote_iframe" ||
      kind === "remote_2d" ||
      kind === "preparing");

  const collapsed = collapsedByStep[state.currentStep] ?? false;

  const toggleCollapsed = () => {
    setCollapsedByStep((prev) => ({
      ...prev,
      [state.currentStep]: !collapsed,
    }));
  };

  if (!visible) return null;

  const statusHint =
    viewerStatus === "ready" || viewerStatus === "model-ready"
      ? "Aperçu prêt"
      : "Préparation de ton aperçu…";

  // Persistent 3D — layout slot only; the single iframe lives in PersistentStorefrontViewer.
  if (persistent3d) {
    return (
      <div className="viewer-compact-slot shrink-0 border-b border-[var(--rm-border)]">
        <div className="px-4 pb-2 pt-2">
          <div
            className="viewer-compact relative w-full"
            role="button"
            tabIndex={0}
            aria-label="Agrandir l’aperçu 3D"
            onClick={expandViewer}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                expandViewer();
              }
            }}
          >
            <ViewerAnchor
              className="h-full w-full"
              label="Aperçu 3D compact"
            />
            {isExpanded ? (
              <div className="pointer-events-none absolute inset-0 z-[1] flex flex-col items-center justify-center gap-1 bg-[#e9e9e6] text-xs text-[var(--rm-text-muted)]">
                <span>Aperçu agrandi</span>
                <span className="text-[10px]">{statusHint}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-30 shrink-0 border-b border-[var(--rm-border)] bg-[var(--rm-bg)]">
        <div className="relative z-40 flex items-center justify-between gap-2 px-4 pt-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--rm-text-muted)]">
            {`Aperçu live · ${mode === "3d" ? "3D" : "2D"}`}
          </p>
          <div className="flex items-center gap-1">
            {!collapsed ? (
              <button
                type="button"
                onClick={() => setLegacyExpanded(true)}
                className="inline-flex h-9 items-center gap-1 rounded-[var(--rm-radius-sm)] px-2 text-[11px] font-semibold text-[var(--rm-text-muted)]"
                aria-label="Agrandir l’aperçu"
              >
                <Maximize2 size={14} />
                Agrandir
              </button>
            ) : null}
            <button
              type="button"
              onClick={toggleCollapsed}
              className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--rm-radius-sm)] text-[var(--rm-text-muted)]"
              aria-label={collapsed ? "Développer l’aperçu" : "Réduire l’aperçu"}
              aria-expanded={!collapsed}
            >
              {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          </div>
        </div>

        {!collapsed ? (
          <div className="px-4 pb-2 pt-1">
            <div className="relative h-[140px] overflow-hidden rounded-[var(--rm-radius-sm)] border border-[var(--rm-border)] bg-[var(--rm-surface)] sm:h-[150px]">
              {!legacyExpanded ? (
                <JustPrintEmbeddedPreview
                  configurationId={state.savedDesignId}
                  previewMode={mode}
                  engineMode={useLiteStrip ? "lite" : "full"}
                  fillHeight
                  showBadge={false}
                  showStatus={false}
                  compact={mode === "2d"}
                  className="h-full"
                  onExpandRequest={() => setLegacyExpanded(true)}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[var(--rm-text-muted)]">
                  Aperçu agrandi
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 pb-2">
            {state.palette.slice(0, 4).map((color) => (
              <span
                key={color.id}
                className="h-4 w-4 rounded-full border border-[var(--rm-border)]"
                style={{ backgroundColor: color.hex }}
                title={color.label}
              />
            ))}
            <span className="ml-1 text-xs font-bold">
              #{state.raceNumber || "00"}
              {state.riderName ? ` · ${state.riderName}` : ""}
            </span>
          </div>
        )}
      </div>

      {legacyExpanded ? (
        <div className="fixed inset-0 z-[90] flex h-[100dvh] flex-col bg-[var(--rm-bg)]">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--rm-border)] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <p className="text-sm font-bold uppercase tracking-wide">
              Aperçu {mode === "3d" ? "3D" : "2D"}
            </p>
            <button
              type="button"
              className="rm-btn-secondary h-10 min-h-10 w-auto px-3 text-sm"
              onClick={() => setLegacyExpanded(false)}
            >
              Fermer
            </button>
          </div>
          <div className="min-h-0 flex-1 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="h-full overflow-hidden rounded-[var(--rm-radius)] border border-[var(--rm-border)]">
              <JustPrintEmbeddedPreview
                configurationId={state.savedDesignId}
                previewMode={mode}
                engineMode="full"
                fillHeight
                interactive={mode === "2d"}
                className="h-full"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
