"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Maximize2 } from "lucide-react";
import { JustPrintEmbeddedPreview } from "@/components/configurator/JustPrintEmbeddedPreview";
import { useConfigurator } from "@/context/ConfiguratorContext";
import { getBikePreviewMode } from "@/lib/bike-preview";
import type { ConfiguratorStep } from "@/types/configurator";

interface StickyMobilePreviewProps {
  visible: boolean;
}

export function StickyMobilePreview({ visible }: StickyMobilePreviewProps) {
  const { state } = useConfigurator();
  const [collapsedByStep, setCollapsedByStep] = useState<
    Partial<Record<ConfiguratorStep, boolean>>
  >({});
  const [expanded, setExpanded] = useState(false);
  const mode = getBikePreviewMode(state.bike);

  const collapsed = collapsedByStep[state.currentStep] ?? false;

  const toggleCollapsed = () => {
    setCollapsedByStep((prev) => ({
      ...prev,
      [state.currentStep]: !collapsed,
    }));
  };

  if (!visible) return null;

  return (
    <>
      <div className="sticky top-0 z-20 shrink-0 border-b border-[var(--rm-border)] bg-[var(--rm-bg)] lg:hidden">
        <div className="flex items-center justify-between gap-2 px-4 pt-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--rm-text-muted)]">
            Aperçu live · {mode === "3d" ? "3D" : "2D"}
          </p>
          <div className="flex items-center gap-1">
            {mode === "2d" && !collapsed ? (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="inline-flex h-9 items-center gap-1 rounded-[var(--rm-radius-sm)] px-2 text-[11px] font-semibold text-[var(--rm-text-muted)]"
                aria-label="Agrandir l’aperçu 2D"
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
            <div className="h-[188px] overflow-hidden rounded-[var(--rm-radius-sm)] border border-[var(--rm-border)] bg-[var(--rm-surface)] sm:h-[200px]">
              <JustPrintEmbeddedPreview
                configurationId={state.savedDesignId}
                previewMode={mode}
                fillHeight
                showBadge={false}
                compact={mode === "2d"}
                className="h-full"
              />
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

      {expanded ? (
        <div className="fixed inset-0 z-[90] flex h-[100dvh] flex-col bg-[var(--rm-bg)] lg:hidden">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--rm-border)] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <p className="text-sm font-bold uppercase tracking-wide">
              Gabarit 2D
            </p>
            <button
              type="button"
              className="rm-btn-secondary h-10 min-h-10 w-auto px-3 text-sm"
              onClick={() => setExpanded(false)}
            >
              Fermer
            </button>
          </div>
          <div className="min-h-0 flex-1 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="h-full overflow-hidden rounded-[var(--rm-radius)] border border-[var(--rm-border)]">
              <JustPrintEmbeddedPreview
                configurationId={state.savedDesignId}
                previewMode={mode}
                fillHeight
                interactive
                className="h-full"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
