"use client";

import { useEffect, useRef, useState } from "react";
import { ConfiguratorPreview } from "@/components/configurator/ConfiguratorPreview";
import { useConfigurator } from "@/context/ConfiguratorContext";
import {
  getJustPrintEnvironment,
  getJustPrintOrigin,
  isJustPrintMockMode,
} from "@/lib/justprint-client";
import type { PreviewMode } from "@/types/configurator";
import type { JustPrintPreviewMessage } from "@/types/justprint";

export interface JustPrintEmbeddedPreviewProps {
  configurationId: string | null;
  previewMode: PreviewMode;
  compact?: boolean;
  className?: string;
  fillHeight?: boolean;
  showBadge?: boolean;
  interactive?: boolean;
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

/**
 * Preview bridge for JustPrint.
 * - mock: keeps local ConfiguratorPreview (3D / 2D)
 * - remote: iframe toward JustPrint embed when a configurationId exists
 *
 * Incoming postMessage from the JustPrint preview iframe is verified against
 * the JustPrint API origin only — never "*".
 * Parent shop origins are enforced separately via StorefrontTenantConfig.allowedParentOrigins
 * when the host page posts messages into this storefront.
 */
export function JustPrintEmbeddedPreview({
  configurationId,
  previewMode,
  compact = false,
  className,
  fillHeight = false,
  showBadge = true,
  interactive = false,
}: JustPrintEmbeddedPreviewProps) {
  const { state } = useConfigurator();
  const previewSessionKey = `${configurationId ?? "local"}:${previewMode}`;
  const [iframeSession, setIframeSession] = useState<{
    key: string;
    ready: boolean;
    error: string | null;
  }>({ key: previewSessionKey, ready: false, error: null });

  if (iframeSession.key !== previewSessionKey) {
    setIframeSession({
      key: previewSessionKey,
      ready: false,
      error: null,
    });
  }

  const iframeReady = iframeSession.ready;
  const iframeError = iframeSession.error;
  const allowedOriginRef = useRef(getJustPrintOrigin());

  const useRemoteIframe =
    !isJustPrintMockMode() && Boolean(configurationId);

  useEffect(() => {
    if (!useRemoteIframe) return;

    const allowedOrigin = allowedOriginRef.current;

    function onMessage(event: MessageEvent) {
      if (event.origin !== allowedOrigin) {
        return;
      }

      if (!isJustPrintPreviewMessage(event.data)) {
        return;
      }

      if (
        configurationId &&
        event.data.configurationId !== configurationId
      ) {
        return;
      }

      if (event.data.type === "JUSTPRINT_PREVIEW_READY") {
        setIframeSession({
          key: previewSessionKey,
          ready: true,
          error: null,
        });
      } else if (event.data.type === "JUSTPRINT_PREVIEW_UPDATED") {
        setIframeSession({
          key: previewSessionKey,
          ready: true,
          error: null,
        });
      } else if (event.data.type === "JUSTPRINT_PREVIEW_ERROR") {
        setIframeSession({
          key: previewSessionKey,
          ready: false,
          error: event.data.message || "Erreur d’aperçu JustPrint",
        });
      }
    }

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [configurationId, previewSessionKey, useRemoteIframe]);

  if (useRemoteIframe && configurationId) {
    const { apiUrl } = getJustPrintEnvironment();
    const src = `${apiUrl}/embed/preview/${encodeURIComponent(configurationId)}`;

    return (
      <div
        className={`relative overflow-hidden bg-[var(--rm-surface)] ${
          fillHeight ? "h-full" : ""
        } ${className ?? ""}`}
      >
        <iframe
          title={`Aperçu JustPrint ${previewMode.toUpperCase()}`}
          src={src}
          className="h-full min-h-[200px] w-full border-0"
          allow="fullscreen"
        />
        {!iframeReady && !iframeError ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[var(--rm-surface)]/80 text-xs text-[var(--rm-text-muted)]">
            Chargement de l’aperçu JustPrint…
          </div>
        ) : null}
        {iframeError ? (
          <div className="absolute inset-x-0 bottom-0 bg-[var(--rm-warning-bg, #FFF4E5)] px-3 py-2 text-xs text-[var(--rm-text)]">
            {iframeError}
          </div>
        ) : null}
      </div>
    );
  }

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
