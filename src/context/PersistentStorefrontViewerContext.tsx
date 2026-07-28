"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type {
  StorefrontViewerDisplayMode,
  StorefrontViewerRuntimeConfiguration,
  StorefrontViewerStatus,
} from "@/types/justprint";

export interface ViewerDevMetrics {
  iframeMounts: number;
  srcChanges: number;
  loadSavedDesignMessages: number;
  fullOpens: number;
}

/** Payload prêt pour JUSTPRINT_APPLY_RUNTIME_CONFIG (jamais d’editToken). */
export type ViewerRuntimeApplyPayload = {
  savedDesignId: string;
  version: number;
  configuration: StorefrontViewerRuntimeConfiguration;
};

interface PersistentStorefrontViewerContextValue {
  viewerStatus: StorefrontViewerStatus;
  viewerDisplayMode: StorefrontViewerDisplayMode;
  viewerError: string | null;
  /** True when the user forced fullscreen via Agrandir. */
  isExpanded: boolean;
  expandViewer: () => void;
  collapseViewer: () => void;
  setViewerStatus: (status: StorefrontViewerStatus) => void;
  setViewerDisplayMode: (mode: StorefrontViewerDisplayMode) => void;
  setViewerError: (message: string | null) => void;
  registerAnchor: (element: HTMLElement | null) => void;
  anchorRef: RefObject<HTMLElement | null>;
  hasAnchor: boolean;
  metrics: ViewerDevMetrics;
  bumpMetric: (key: keyof ViewerDevMetrics) => void;
  /** Dernière config runtime à pousser vers l’iframe (postMessage). */
  viewerRuntimeApply: ViewerRuntimeApplyPayload | null;
  pushViewerRuntimeApply: (payload: ViewerRuntimeApplyPayload) => void;
  clearViewerRuntimeApply: () => void;
}

const PersistentStorefrontViewerContext =
  createContext<PersistentStorefrontViewerContextValue | null>(null);

export function PersistentStorefrontViewerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [viewerStatus, setViewerStatus] =
    useState<StorefrontViewerStatus>("idle");
  const [viewerDisplayMode, setViewerDisplayMode] =
    useState<StorefrontViewerDisplayMode>("background");
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasAnchor, setHasAnchor] = useState(false);
  const [viewerRuntimeApply, setViewerRuntimeApply] =
    useState<ViewerRuntimeApplyPayload | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const [metrics, setMetrics] = useState<ViewerDevMetrics>({
    iframeMounts: 0,
    srcChanges: 0,
    loadSavedDesignMessages: 0,
    fullOpens: 0,
  });

  const registerAnchor = useCallback((element: HTMLElement | null) => {
    anchorRef.current = element;
    setHasAnchor(Boolean(element));
  }, []);

  const expandViewer = useCallback(() => {
    setIsExpanded(true);
    setViewerDisplayMode("full");
    setMetrics((prev) => ({ ...prev, fullOpens: prev.fullOpens + 1 }));
  }, []);

  const collapseViewer = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const bumpMetric = useCallback((key: keyof ViewerDevMetrics) => {
    setMetrics((prev) => ({ ...prev, [key]: prev[key] + 1 }));
  }, []);

  const pushViewerRuntimeApply = useCallback(
    (payload: ViewerRuntimeApplyPayload) => {
      setViewerRuntimeApply(payload);
    },
    [],
  );

  const clearViewerRuntimeApply = useCallback(() => {
    setViewerRuntimeApply(null);
  }, []);

  const value = useMemo(
    () => ({
      viewerStatus,
      viewerDisplayMode,
      viewerError,
      isExpanded,
      expandViewer,
      collapseViewer,
      setViewerStatus,
      setViewerDisplayMode,
      setViewerError,
      registerAnchor,
      anchorRef,
      hasAnchor,
      metrics,
      bumpMetric,
      viewerRuntimeApply,
      pushViewerRuntimeApply,
      clearViewerRuntimeApply,
    }),
    [
      viewerStatus,
      viewerDisplayMode,
      viewerError,
      isExpanded,
      expandViewer,
      collapseViewer,
      registerAnchor,
      hasAnchor,
      metrics,
      bumpMetric,
      viewerRuntimeApply,
      pushViewerRuntimeApply,
      clearViewerRuntimeApply,
    ],
  );

  return (
    <PersistentStorefrontViewerContext.Provider value={value}>
      {children}
    </PersistentStorefrontViewerContext.Provider>
  );
}

export function usePersistentStorefrontViewer() {
  const ctx = useContext(PersistentStorefrontViewerContext);
  if (!ctx) {
    throw new Error(
      "usePersistentStorefrontViewer must be used within PersistentStorefrontViewerProvider",
    );
  }
  return ctx;
}

/** Optional hook — returns null outside the provider. */
export function usePersistentStorefrontViewerOptional() {
  return useContext(PersistentStorefrontViewerContext);
}
