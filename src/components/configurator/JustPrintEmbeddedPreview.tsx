"use client";

import { useEffect, useRef, useState } from "react";
import { ConfiguratorPreview } from "@/components/configurator/ConfiguratorPreview";
import { useConfigurator } from "@/context/ConfiguratorContext";
import { useStorefront } from "@/context/StorefrontContext";
import {
  getJustPrintOrigin,
  isJustPrintMockMode,
} from "@/lib/justprint-client";
import {
  buildStorefrontPreviewEmbedUrl,
  resolveRemotePreviewKind,
} from "@/lib/justprint/preview-embed";
import type { PreviewMode } from "@/types/configurator";
import type { JustPrintPreviewMessage } from "@/types/justprint";

export type EmbeddedPreviewEngineMode = "full" | "lite";

export type EmbeddedPreviewUiStatus =
  | "preparing"
  | "loading"
  | "ready"
  | "updating"
  | "error"
  | "unsupported";

export interface JustPrintEmbeddedPreviewProps {
  configurationId: string | null;
  previewMode: PreviewMode;
  /** full = iframe moteur ; lite = vignette sans 2ᵉ instance 3D. */
  engineMode?: EmbeddedPreviewEngineMode;
  compact?: boolean;
  className?: string;
  fillHeight?: boolean;
  showBadge?: boolean;
  interactive?: boolean;
  showStatus?: boolean;
  onExpandRequest?: () => void;
}

function isJustPrintPreviewMessage(
  data: unknown,
): data is JustPrintPreviewMessage {
  if (typeof data !== "object" || data === null) return false;
  const record = data as Record<string, unknown>;
  return (
    record.type === "JUSTPRINT_PREVIEW_READY" ||
    record.type === "JUSTPRINT_PREVIEW_UPDATED" ||
    record.type === "JUSTPRINT_PREVIEW_ERROR"
  );
}

function statusLabel(status: EmbeddedPreviewUiStatus): string {
  switch (status) {
    case "preparing":
    case "loading":
    case "updating":
      return "Préparation de l’aperçu…";
    case "ready":
      return "Aperçu à jour";
    case "error":
      return "Impossible d’actualiser l’aperçu";
    case "unsupported":
      return "Aperçu distant non disponible pour cette configuration";
  }
}

function deriveUiStatus(args: {
  kind: ReturnType<typeof resolveRemotePreviewKind>;
  syncStatus: string;
  iframeReady: boolean;
  iframeError: string | null;
}): EmbeddedPreviewUiStatus {
  if (args.kind === "unsupported") return "unsupported";
  if (args.kind === "preparing" || args.kind === "mock_local") {
    return args.kind === "preparing" ? "preparing" : "ready";
  }
  if (args.iframeError) return "error";
  if (args.syncStatus === "saving" || args.syncStatus === "creating") {
    return "updating";
  }
  if (args.iframeReady) return "ready";
  return "loading";
}

function LiteRemotePreview({
  riderName,
  raceNumber,
  palette,
  status,
  onExpandRequest,
  fillHeight,
  className,
}: {
  riderName: string;
  raceNumber: string;
  palette: { id: string; hex: string; label: string }[];
  status: EmbeddedPreviewUiStatus;
  onExpandRequest?: () => void;
  fillHeight?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative flex flex-col justify-center gap-3 bg-[var(--rm-surface)] px-4 py-3 ${
        fillHeight ? "h-full" : ""
      } ${className ?? ""}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--rm-text-muted)]">
        Aperçu JustPrint
      </p>
      <p className="font-display text-lg font-extrabold leading-none">
        #{raceNumber || "00"}
        {riderName ? (
          <span className="ml-2 text-sm font-semibold text-[var(--rm-text-muted)]">
            {riderName}
          </span>
        ) : null}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {palette.slice(0, 6).map((color) => (
          <span
            key={color.id}
            className="h-5 w-5 rounded-full border border-[var(--rm-border)]"
            style={{ backgroundColor: color.hex }}
            title={color.label}
          />
        ))}
      </div>
      <p className="text-[11px] text-[var(--rm-text-muted)]">
        {statusLabel(status)}
      </p>
      {onExpandRequest ? (
        <button
          type="button"
          onClick={onExpandRequest}
          className="rm-btn-secondary h-10 min-h-10 w-full text-sm"
        >
          Agrandir l’aperçu
        </button>
      ) : null}
    </div>
  );
}

/**
 * Pont d’aperçu unique JustPrint.
 * - mock → ConfiguratorPreview local
 * - remote + pilote supporté → iframe `/embed/storefront-preview/:uuid`
 * - remote 2D → même embed (mode 2d)
 * - remote non supporté → message propre, sans faux rendu
 *
 * Messages entrants : origine JustPrint uniquement + event.source = iframe.
 */
export function JustPrintEmbeddedPreview({
  configurationId,
  previewMode,
  engineMode = "full",
  compact = false,
  className,
  fillHeight = false,
  showBadge = true,
  interactive = false,
  showStatus = true,
  onExpandRequest,
}: JustPrintEmbeddedPreviewProps) {
  const { state } = useConfigurator();
  const { syncStatus, retrySync } = useStorefront();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const allowedOrigin = getJustPrintOrigin();

  const kind = resolveRemotePreviewKind({
    isMockMode: isJustPrintMockMode(),
    bikeId: state.bike?.id,
    designId: state.selectedDesign,
    previewMode,
    savedDesignId: configurationId,
  });

  const previewVersion = state.lastSavedAt ?? "0";
  const sessionKey = `${configurationId ?? "none"}:${previewMode}:${previewVersion}`;
  const parentOrigin =
    typeof window !== "undefined" ? window.location.origin : "";

  const [trackedSessionKey, setTrackedSessionKey] = useState(sessionKey);
  const [iframeReady, setIframeReady] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  // Reset iframe handshake when the saved_design version changes.
  if (trackedSessionKey !== sessionKey) {
    setTrackedSessionKey(sessionKey);
    setIframeReady(false);
    setIframeError(null);
  }

  const uiStatus = deriveUiStatus({
    kind,
    syncStatus,
    iframeReady,
    iframeError,
  });

  const useRemoteIframe =
    engineMode === "full" &&
    (kind === "remote_iframe" || kind === "remote_2d") &&
    Boolean(configurationId);

  useEffect(() => {
    if (!useRemoteIframe) return;

    function onMessage(event: MessageEvent) {
      if (event.origin !== allowedOrigin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (!isJustPrintPreviewMessage(event.data)) return;
      if (
        configurationId &&
        event.data.configurationId !== configurationId
      ) {
        return;
      }

      if (event.data.type === "JUSTPRINT_PREVIEW_READY") {
        setIframeReady(true);
        setIframeError(null);
      } else if (event.data.type === "JUSTPRINT_PREVIEW_UPDATED") {
        setIframeReady(true);
        setIframeError(null);
      } else if (event.data.type === "JUSTPRINT_PREVIEW_ERROR") {
        setIframeReady(false);
        setIframeError(event.data.message || "Erreur d’aperçu JustPrint");
      }
    }

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [allowedOrigin, configurationId, useRemoteIframe]);

  if (kind === "mock_local") {
    return (
      <div className={className}>
        <ConfiguratorPreview
          state={state}
          bike={state.bike}
          selectedDesign={state.selectedDesign}
          riderName={state.riderName}
          raceNumber={state.raceNumber}
          palette={state.palette}
          selectedLogos={state.selectedLogos}
          compact={compact}
          fillHeight={fillHeight}
          showBadge={showBadge}
          interactive={interactive}
        />
      </div>
    );
  }

  if (kind === "unsupported") {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-[var(--rm-surface)] px-4 py-8 text-center ${
          fillHeight ? "h-full" : "min-h-[200px]"
        } ${className ?? ""}`}
      >
        <p className="text-sm font-semibold text-[var(--rm-text)]">
          {statusLabel("unsupported")}
        </p>
        <p className="max-w-sm text-xs text-[var(--rm-text-muted)]">
          L’aperçu distant JustPrint est activé pour Yamaha 450 YZF 2025 ·
          CLASSIC (3D). Ta configuration reste enregistrée.
        </p>
      </div>
    );
  }

  if (kind === "preparing" || !configurationId) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-[var(--rm-surface)] px-4 py-8 text-center ${
          fillHeight ? "h-full" : "min-h-[200px]"
        } ${className ?? ""}`}
      >
        <p className="text-sm text-[var(--rm-text-muted)]">
          {statusLabel("preparing")}
        </p>
      </div>
    );
  }

  if (engineMode === "lite") {
    return (
      <LiteRemotePreview
        riderName={state.riderName}
        raceNumber={state.raceNumber}
        palette={state.palette}
        status={uiStatus}
        onExpandRequest={onExpandRequest}
        fillHeight={fillHeight}
        className={className}
      />
    );
  }

  const src = buildStorefrontPreviewEmbedUrl({
    savedDesignId: configurationId,
    editToken: state.editToken,
    version: `${previewVersion}:${reloadNonce}`,
    parentOrigin: parentOrigin || undefined,
    view: state.previewView,
  });

  return (
    <div
      className={`relative overflow-hidden bg-[var(--rm-surface)] ${
        fillHeight ? "h-full" : ""
      } ${className ?? ""}`}
    >
      <iframe
        ref={iframeRef}
        key={`${sessionKey}:${reloadNonce}`}
        title={`Aperçu JustPrint ${previewMode.toUpperCase()}`}
        src={src}
        className="h-full min-h-[200px] w-full border-0"
        allow="fullscreen"
      />
      {uiStatus === "loading" ||
      uiStatus === "updating" ||
      uiStatus === "preparing" ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[var(--rm-surface)]/80 text-xs text-[var(--rm-text-muted)]">
          {statusLabel(uiStatus)}
        </div>
      ) : null}
      {uiStatus === "error" ? (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-[var(--rm-warning-bg,#FFF4E5)] px-3 py-2 text-xs text-[var(--rm-text)]">
          <span>{iframeError ?? statusLabel("error")}</span>
          <button
            type="button"
            className="shrink-0 font-semibold underline"
            onClick={() => {
              setIframeReady(false);
              setIframeError(null);
              setReloadNonce((n) => n + 1);
              retrySync();
            }}
          >
            Réessayer
          </button>
        </div>
      ) : null}
      {showStatus && uiStatus === "ready" ? (
        <p className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
          {statusLabel("ready")}
        </p>
      ) : null}
    </div>
  );
}
