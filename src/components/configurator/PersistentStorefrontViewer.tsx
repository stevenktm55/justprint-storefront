"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Maximize2, X } from "lucide-react";
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
  getViewerDisplayMode,
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
      return "Préparation de ton aperçu…";
  }
}

interface AnchorBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

const GESTURE_HINT_SESSION_KEY = "rm-viewer-gesture-hint-seen";

function buildCompactStyle(box: AnchorBox): CSSProperties {
  return {
    top: box.top,
    left: box.left,
    width: Math.max(box.width, 1),
    height: Math.max(box.height, 1),
    minHeight: Math.max(box.height, 1),
    // Explicit resets out of background mode — do not rely on class absence.
    right: "auto",
    bottom: "auto",
    opacity: 1,
    visibility: "visible",
    transform: "none",
    pointerEvents: "auto",
    zIndex: 35,
  };
}

function buildBackgroundStyle(): CSSProperties {
  return {
    position: "fixed",
    top: 0,
    left: -10000,
    right: "auto",
    bottom: "auto",
    width: 320,
    height: 220,
    minHeight: 220,
    opacity: 0,
    visibility: "hidden",
    transform: "none",
    pointerEvents: "none",
    zIndex: 0,
  };
}

function buildFullStyle(): CSSProperties {
  return {
    position: "fixed",
    inset: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100dvh",
    minHeight: "100dvh",
    opacity: 1,
    visibility: "visible",
    transform: "none",
    pointerEvents: "auto",
    zIndex: 90,
  };
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
  const [lastCompactBox, setLastCompactBox] = useState<AnchorBox | null>(null);
  const [sessionSrc, setSessionSrc] = useState<string | null>(null);
  const [iframeReadyForMessages, setIframeReadyForMessages] = useState(false);
  const [showGestureHint, setShowGestureHint] = useState(false);

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

  const viewerDisplayMode = getViewerDisplayMode({
    currentStep: state.currentStep,
    isExpanded,
    active,
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
    if (!active || !hasAnchor) {
      return;
    }

    // Keep last known box while fullscreen so compact restores instantly.
    if (viewerDisplayMode !== "compact") {
      return;
    }

    const sync = () => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const next: AnchorBox = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
      setAnchorBox(next);
      setLastCompactBox(next);
    };

    // Measure synchronously so the first compact paint is not off-screen.
    sync();

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

  const dismissGestureHint = useCallback(() => {
    setShowGestureHint(false);
    try {
      sessionStorage.setItem(GESTURE_HINT_SESSION_KEY, "1");
    } catch {
      // Ignore quota / private mode.
    }
  }, []);

  // Show the compact gesture tip once per session (deferred to satisfy lint / avoid hydration mismatch).
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        if (sessionStorage.getItem(GESTURE_HINT_SESSION_KEY) !== "1") {
          setShowGestureHint(true);
        }
      } catch {
        setShowGestureHint(true);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  // Auto-hide the compact gesture tip after a few seconds (also dismissed on Agrandir).
  useEffect(() => {
    if (viewerDisplayMode !== "compact" || !showGestureHint) return;
    const timer = window.setTimeout(() => dismissGestureHint(), 4500);
    return () => window.clearTimeout(timer);
  }, [viewerDisplayMode, showGestureHint, dismissGestureHint]);

  const postToViewer = useCallback(
    (message: JustPrintViewerOutboundMessage) => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      win.postMessage(message, getJustPrintOrigin());
    },
    [],
  );

  const notifyDisplayMode = useCallback(
    (mode: StorefrontViewerDisplayMode) => {
      postToViewer({
        type: "JUSTPRINT_SET_DISPLAY_MODE",
        mode,
      });
      lastPostedDisplayModeRef.current = mode;
      // Help JustPrint re-read real container dimensions after CSS settle.
      try {
        iframeRef.current?.contentWindow?.dispatchEvent(new Event("resize"));
      } catch {
        // Cross-origin may block — postMessage mode change is enough.
      }
    },
    [postToViewer],
  );

  // SET_DISPLAY_MODE after container geometry updates (double rAF).
  useEffect(() => {
    if (!src || !iframeReadyForMessages) return;
    if (lastPostedDisplayModeRef.current === viewerDisplayMode) return;

    let cancelled = false;
    let innerId = 0;
    const outerId = requestAnimationFrame(() => {
      innerId = requestAnimationFrame(() => {
        if (cancelled) return;
        notifyDisplayMode(viewerDisplayMode);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(outerId);
      cancelAnimationFrame(innerId);
    };
  }, [
    src,
    iframeReadyForMessages,
    viewerDisplayMode,
    notifyDisplayMode,
    anchorBox,
  ]);

  // LOAD / REFRESH saved design — never change iframe src.
  // version must be an integer ≥ 1 (viewer rejects ISO timestamps / editToken).
  useEffect(() => {
    if (!src || !iframeReadyForMessages) return;
    const savedDesignId = state.savedDesignId;
    if (!savedDesignId) return;

    const version = state.synchronizationVersion;
    if (!Number.isFinite(version) || version < 1) return;

    if (loadedDesignIdRef.current !== savedDesignId) {
      postToViewer({
        type: "JUSTPRINT_LOAD_SAVED_DESIGN",
        savedDesignId,
        version,
      });
      loadedDesignIdRef.current = savedDesignId;
      lastSyncVersionRef.current = String(version);
      bumpMetric("loadSavedDesignMessages");
      if (IS_DEV) {
        console.info("[PersistentStorefrontViewer] LOAD_SAVED_DESIGN", {
          savedDesignId,
          version,
        });
      }
      return;
    }

    if (lastSyncVersionRef.current !== String(version)) {
      postToViewer({
        type: "JUSTPRINT_REFRESH_SAVED_DESIGN",
        savedDesignId,
        version,
      });
      lastSyncVersionRef.current = String(version);
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
    state.synchronizationVersion,
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
          if (IS_DEV) {
            console.info(
              "[PersistentStorefrontViewer] MODEL_PRELOADED",
              preloadStartedAtRef.current != null
                ? `${Math.round(performance.now() - preloadStartedAtRef.current)}ms`
                : "",
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
          if (IS_DEV) {
            const textureMs =
              preloadStartedAtRef.current != null
                ? Math.round(performance.now() - preloadStartedAtRef.current)
                : null;
            console.info(`[PersistentStorefrontViewer] ${msg.type}`, {
              version: "version" in msg ? msg.version : null,
              textureMs,
              iframeMounts: metrics.iframeMounts,
              srcChanges: metrics.srcChanges,
            });
          }
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

  // Dev instrumentation — dimensions + mount/src counters.
  useEffect(() => {
    if (!IS_DEV || !src) return;
    const container = document.querySelector(
      "[data-persistent-storefront-viewer]",
    );
    const iframe = iframeRef.current;
    const cRect = container?.getBoundingClientRect();
    const iRect = iframe?.getBoundingClientRect();
    console.info("[PersistentStorefrontViewer] display", {
      displayMode: viewerDisplayMode,
      currentStep: state.currentStep,
      container: cRect
        ? { w: Math.round(cRect.width), h: Math.round(cRect.height) }
        : null,
      iframe: iRect
        ? { w: Math.round(iRect.width), h: Math.round(iRect.height) }
        : null,
      metrics,
    });
  }, [
    src,
    viewerDisplayMode,
    state.currentStep,
    anchorBox,
    metrics,
    viewerStatus,
  ]);

  if (!src) return null;

  const showPreparingOverlay =
    viewerStatus === "idle" ||
    viewerStatus === "preloading" ||
    viewerStatus === "applying-design";

  const compactBox = anchorBox ?? lastCompactBox;

  let containerStyle: CSSProperties;
  if (viewerDisplayMode === "full") {
    containerStyle = buildFullStyle();
  } else if (viewerDisplayMode === "compact" && compactBox) {
    containerStyle = buildCompactStyle(compactBox);
  } else if (viewerDisplayMode === "compact") {
    // Compact requested but box not measured yet — never fall back to off-screen.
    containerStyle = {
      position: "fixed",
      top: 0,
      left: 0,
      right: "auto",
      bottom: "auto",
      width: "100%",
      height: "var(--viewer-compact-height)",
      minHeight: 240,
      opacity: 0,
      visibility: "hidden",
      transform: "none",
      pointerEvents: "none",
      zIndex: 35,
    };
  } else {
    containerStyle = buildBackgroundStyle();
  }

  return (
    <div
      data-persistent-storefront-viewer=""
      data-display-mode={viewerDisplayMode}
      data-viewer-status={viewerStatus}
      className="viewer-persistent"
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
              requestAnimationFrame(() => {
                notifyDisplayMode(viewerDisplayMode);
              });
            });
          }}
        />

        {viewerDisplayMode === "compact" ? (
          <>
            <button
              type="button"
              className="viewer-expand-button pointer-events-auto absolute right-2 top-2 z-[3] inline-flex h-8 items-center gap-1 rounded-[var(--rm-radius-sm)] bg-black/55 px-2 text-[11px] font-semibold text-white"
              aria-label="Agrandir l’aperçu 3D"
              onClick={() => {
                dismissGestureHint();
                expandViewer();
              }}
            >
              <Maximize2 size={14} />
              Agrandir
            </button>
            {showGestureHint ? (
              <p className="pointer-events-none absolute inset-x-0 bottom-2 z-[2] px-3 text-center text-[10px] font-medium text-white/85 drop-shadow">
                Fais glisser pour tourner · Pince pour zoomer
              </p>
            ) : null}
          </>
        ) : null}

        {showPreparingOverlay ? (
          <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-[#e9e9e6]/80 text-xs text-[var(--rm-text-muted)]">
            {statusLabel(viewerStatus)}
          </div>
        ) : null}

        {viewerStatus === "error" ? (
          <div className="absolute inset-x-0 bottom-0 z-[2] bg-[var(--rm-warning-bg,#FFF4E5)] px-3 py-2 text-xs text-[var(--rm-text)]">
            {viewerError ?? statusLabel("error")}
          </div>
        ) : null}
      </div>

      {IS_DEV ? (
        <div className="pointer-events-none absolute left-1 top-1 z-[3] rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] text-white">
          {viewerDisplayMode} m:{metrics.iframeMounts} src:{metrics.srcChanges}{" "}
          load:{metrics.loadSavedDesignMessages} full:{metrics.fullOpens}
        </div>
      ) : null}
    </div>
  );
}
