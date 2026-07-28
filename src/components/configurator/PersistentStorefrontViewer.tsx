"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { X } from "lucide-react";
import { useConfigurator } from "@/context/ConfiguratorContext";
import { usePersistentStorefrontViewer } from "@/context/PersistentStorefrontViewerContext";
import { useStorefront } from "@/context/StorefrontContext";
import { getBikePreviewMode } from "@/lib/bike-preview";
import {
  getJustPrintOrigin,
  isJustPrintMockMode,
} from "@/lib/justprint-client";
import {
  buildStorefrontViewerEmbedUrl,
  shouldUsePersistent3dViewer,
} from "@/lib/justprint/preview-embed";
import type {
  JustPrintPreviewMessage,
  JustPrintViewerOutboundMessage,
  StorefrontViewerDisplayMode,
  StorefrontViewerStatus,
} from "@/types/justprint";

const IS_DEV = process.env.NODE_ENV === "development";

function isJustPrintViewerInboundMessage(
  data: unknown,
): data is JustPrintPreviewMessage {
  if (typeof data !== "object" || data === null) return false;
  const type = (data as { type?: unknown }).type;
  return (
    type === "JUSTPRINT_MODEL_PRELOAD_STARTED" ||
    type === "JUSTPRINT_MODEL_PRELOADED" ||
    type === "JUSTPRINT_SAVED_DESIGN_APPLYING" ||
    type === "JUSTPRINT_PREVIEW_READY" ||
    type === "JUSTPRINT_PREVIEW_UPDATED" ||
    type === "JUSTPRINT_PREVIEW_ERROR"
  );
}

function statusLabel(status: StorefrontViewerStatus): string {
  switch (status) {
    case "ready":
    case "model-ready":
      return "Aperçu prêt";
    case "error":
      return "Impossible de charger l’aperçu 3D";
    default:
      return "Préparation de la moto…";
  }
}

function deriveDisplayMode(args: {
  active: boolean;
  isExpanded: boolean;
  hasAnchor: boolean;
}): StorefrontViewerDisplayMode {
  if (!args.active) return "background";
  if (args.isExpanded) return "full";
  if (args.hasAnchor) return "compact";
  return "background";
}

interface AnchorBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Unique iframe 3D JustPrint pour tout le parcours Storefront.
 * Monté une fois dans ConfiguratorShell — les surfaces sticky / desktop /
 * final / Agrandir ne font que changer le mode CSS + postMessage.
 */
export function PersistentStorefrontViewer() {
  const { state } = useConfigurator();
  const { shopId } = useStorefront();
  const {
    viewerStatus,
    viewerError,
    isExpanded,
    expandViewer,
    collapseViewer,
    setViewerStatus,
    setViewerDisplayMode,
    setViewerError,
    anchorRef,
    hasAnchor,
    metrics,
    bumpMetric,
  } = usePersistentStorefrontViewer();

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const mountedOnceRef = useRef(false);
  const lastSrcRef = useRef<string | null>(null);
  const loadedDesignIdRef = useRef<string | null>(null);
  const lastSyncVersionRef = useRef<string | null>(null);
  const lastPostedDisplayModeRef = useRef<StorefrontViewerDisplayMode | null>(
    null,
  );
  const preloadStartedAtRef = useRef<number | null>(null);
  const [anchorBox, setAnchorBox] = useState<AnchorBox | null>(null);
  const [sessionSrc, setSessionSrc] = useState<string | null>(null);
  const [iframeReadyForMessages, setIframeReadyForMessages] = useState(false);

  const previewMode = getBikePreviewMode(state.bike);
  const active = shouldUsePersistent3dViewer({
    isMockMode: isJustPrintMockMode(),
    previewMode,
  });
  const bikeId = state.bike?.id ?? null;

  const src =
    active && bikeId
      ? buildStorefrontViewerEmbedUrl({ shopId, bikeId })
      : null;

  const viewerDisplayMode = deriveDisplayMode({
    active,
    isExpanded,
    hasAnchor,
  });

  // Adjust local session when the stable bike URL changes (React-recommended pattern).
  if (sessionSrc !== src) {
    setSessionSrc(src);
    setIframeReadyForMessages(false);
  }

  useEffect(() => {
    setViewerDisplayMode(viewerDisplayMode);
  }, [viewerDisplayMode, setViewerDisplayMode]);

  useEffect(() => {
    loadedDesignIdRef.current = null;
    lastSyncVersionRef.current = null;
    lastPostedDisplayModeRef.current = null;

    if (!src) {
      lastSrcRef.current = null;
      setViewerStatus("idle");
      setViewerError(null);
      return;
    }

    if (lastSrcRef.current !== src) {
      bumpMetric("srcChanges");
      lastSrcRef.current = src;
    }

    if (!mountedOnceRef.current) {
      mountedOnceRef.current = true;
      bumpMetric("iframeMounts");
    }

    setViewerStatus("preloading");
    setViewerError(null);
    preloadStartedAtRef.current = performance.now();
  }, [src, bumpMetric, setViewerStatus, setViewerError]);

  // Sync compact container to the layout anchor (no DOM move / no portal).
  useLayoutEffect(() => {
    if (!active || viewerDisplayMode !== "compact" || !hasAnchor) {
      const clearId = requestAnimationFrame(() => setAnchorBox(null));
      return () => cancelAnimationFrame(clearId);
    }

    const sync = () => {
      const el = anchorRef.current;
      if (!el) {
        setAnchorBox(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      setAnchorBox({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };

    const startId = requestAnimationFrame(sync);
    const el = anchorRef.current;
    const ro =
      typeof ResizeObserver !== "undefined" && el
        ? new ResizeObserver(() => {
            requestAnimationFrame(sync);
          })
        : null;
    if (el && ro) ro.observe(el);
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    return () => {
      cancelAnimationFrame(startId);
      ro?.disconnect();
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
    };
  }, [active, viewerDisplayMode, hasAnchor, anchorRef]);

  // Body scroll lock in full mode.
  useEffect(() => {
    if (viewerDisplayMode !== "full") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") collapseViewer();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [viewerDisplayMode, collapseViewer]);

  const postToViewer = useCallback(
    (message: JustPrintViewerOutboundMessage) => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      win.postMessage(message, getJustPrintOrigin());
    },
    [],
  );

  // SET_DISPLAY_MODE after container geometry updates.
  useEffect(() => {
    if (!src || !iframeReadyForMessages) return;
    if (lastPostedDisplayModeRef.current === viewerDisplayMode) return;

    const frame = requestAnimationFrame(() => {
      postToViewer({
        type: "JUSTPRINT_SET_DISPLAY_MODE",
        mode: viewerDisplayMode,
      });
      lastPostedDisplayModeRef.current = viewerDisplayMode;
    });
    return () => cancelAnimationFrame(frame);
  }, [src, iframeReadyForMessages, viewerDisplayMode, postToViewer, anchorBox]);

  // LOAD / REFRESH saved design — never change iframe src.
  useEffect(() => {
    if (!src || !iframeReadyForMessages) return;
    const savedDesignId = state.savedDesignId;
    if (!savedDesignId) return;

    const version = state.lastSavedAt ?? "0";

    if (loadedDesignIdRef.current !== savedDesignId) {
      postToViewer({
        type: "JUSTPRINT_LOAD_SAVED_DESIGN",
        savedDesignId,
        version,
      });
      loadedDesignIdRef.current = savedDesignId;
      lastSyncVersionRef.current = version;
      bumpMetric("loadSavedDesignMessages");
      if (IS_DEV) {
        console.info("[PersistentStorefrontViewer] LOAD_SAVED_DESIGN", {
          savedDesignId,
          version,
        });
      }
      return;
    }

    if (lastSyncVersionRef.current !== version) {
      postToViewer({
        type: "JUSTPRINT_REFRESH_SAVED_DESIGN",
        savedDesignId,
        version,
      });
      lastSyncVersionRef.current = version;
      if (IS_DEV) {
        console.info("[PersistentStorefrontViewer] REFRESH_SAVED_DESIGN", {
          savedDesignId,
          version,
        });
      }
    }
  }, [
    src,
    iframeReadyForMessages,
    state.savedDesignId,
    state.lastSavedAt,
    postToViewer,
    bumpMetric,
  ]);

  // Inbound messages — strict origin + source checks.
  useEffect(() => {
    if (!src) return;
    const allowedOrigin = getJustPrintOrigin();

    function onMessage(event: MessageEvent) {
      if (event.origin !== allowedOrigin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (!isJustPrintViewerInboundMessage(event.data)) return;

      const msg = event.data;
      switch (msg.type) {
        case "JUSTPRINT_MODEL_PRELOAD_STARTED":
          setViewerStatus("preloading");
          setViewerError(null);
          if (preloadStartedAtRef.current == null) {
            preloadStartedAtRef.current = performance.now();
          }
          break;
        case "JUSTPRINT_MODEL_PRELOADED":
          setViewerStatus("model-ready");
          setViewerError(null);
          if (IS_DEV && preloadStartedAtRef.current != null) {
            console.info(
              "[PersistentStorefrontViewer] model preloaded in",
              Math.round(performance.now() - preloadStartedAtRef.current),
              "ms",
            );
          }
          break;
        case "JUSTPRINT_SAVED_DESIGN_APPLYING":
          setViewerStatus("applying-design");
          break;
        case "JUSTPRINT_PREVIEW_READY":
        case "JUSTPRINT_PREVIEW_UPDATED":
          setViewerStatus("ready");
          setViewerError(null);
          break;
        case "JUSTPRINT_PREVIEW_ERROR":
          setViewerStatus("error");
          setViewerError(msg.message || "Erreur d’aperçu JustPrint");
          break;
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [src, setViewerStatus, setViewerError]);

  useEffect(() => {
    if (!IS_DEV) return;
    console.info("[PersistentStorefrontViewer] metrics", metrics);
  }, [metrics]);

  if (!src) return null;

  const showPreparingOverlay =
    viewerStatus === "idle" ||
    viewerStatus === "preloading" ||
    viewerStatus === "applying-design";

  const containerStyle: CSSProperties =
    viewerDisplayMode === "full"
      ? {
          position: "fixed",
          inset: 0,
          zIndex: 90,
          width: "100%",
          height: "100dvh",
          opacity: 1,
          pointerEvents: "auto",
        }
      : viewerDisplayMode === "compact" && anchorBox
        ? {
            position: "fixed",
            top: anchorBox.top,
            left: anchorBox.left,
            width: Math.max(anchorBox.width, 1),
            height: Math.max(anchorBox.height, 1),
            // Below sticky chrome (z-30/40) so Agrandir stays clickable.
            zIndex: 20,
            opacity: 1,
            pointerEvents: "auto",
          }
        : {
            // background — valid size, off-screen, never display:none / 0×0
            position: "fixed",
            top: 0,
            left: -10000,
            width: 320,
            height: 220,
            zIndex: 0,
            opacity: 0,
            pointerEvents: "none",
          };

  return (
    <div
      data-persistent-storefront-viewer=""
      data-display-mode={viewerDisplayMode}
      data-viewer-status={viewerStatus}
      className="overflow-hidden bg-[var(--rm-surface)]"
      style={containerStyle}
    >
      {viewerDisplayMode === "full" ? (
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 border-b border-[var(--rm-border)] bg-[var(--rm-bg)] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <p className="text-sm font-bold uppercase tracking-wide">
            Aperçu 3D
          </p>
          <button
            type="button"
            className="rm-btn-secondary inline-flex h-10 min-h-10 w-auto items-center gap-1.5 px-3 text-sm"
            onClick={collapseViewer}
          >
            <X size={16} />
            Fermer
          </button>
        </div>
      ) : null}

      <div
        className={
          viewerDisplayMode === "full"
            ? "absolute inset-0 pt-[calc(3.25rem+env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)]"
            : "relative h-full w-full"
        }
      >
        <iframe
          ref={iframeRef}
          title="Aperçu 3D JustPrint"
          src={src}
          className="h-full w-full border-0"
          allow="fullscreen"
          onLoad={() => {
            setIframeReadyForMessages(true);
            requestAnimationFrame(() => {
              postToViewer({
                type: "JUSTPRINT_SET_DISPLAY_MODE",
                mode: viewerDisplayMode,
              });
              lastPostedDisplayModeRef.current = viewerDisplayMode;
            });
          }}
        />

        {viewerDisplayMode === "compact" ? (
          <button
            type="button"
            className="absolute inset-0 z-[1] cursor-pointer bg-transparent"
            aria-label="Agrandir l’aperçu 3D"
            onClick={expandViewer}
          />
        ) : null}

        {showPreparingOverlay ? (
          <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-[var(--rm-surface)]/70 text-xs text-[var(--rm-text-muted)]">
            {statusLabel(viewerStatus)}
          </div>
        ) : null}

        {viewerStatus === "ready" || viewerStatus === "model-ready" ? (
          <p className="pointer-events-none absolute bottom-1.5 right-1.5 z-[2] rounded bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
            {statusLabel(viewerStatus)}
          </p>
        ) : null}

        {viewerStatus === "error" ? (
          <div className="absolute inset-x-0 bottom-0 z-[2] bg-[var(--rm-warning-bg,#FFF4E5)] px-3 py-2 text-xs text-[var(--rm-text)]">
            {viewerError ?? statusLabel("error")}
          </div>
        ) : null}
      </div>

      {IS_DEV ? (
        <div className="pointer-events-none absolute left-1 top-1 z-[3] rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] text-white">
          m:{metrics.iframeMounts} src:{metrics.srcChanges} load:
          {metrics.loadSavedDesignMessages} full:{metrics.fullOpens}
        </div>
      ) : null}
    </div>
  );
}
