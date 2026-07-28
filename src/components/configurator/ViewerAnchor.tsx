"use client";

import { useEffect, useRef } from "react";
import { usePersistentStorefrontViewer } from "@/context/PersistentStorefrontViewerContext";

interface ViewerAnchorProps {
  className?: string;
  /** Accessible label for the empty layout slot. */
  label?: string;
}

/**
 * Emplacement layout pour le viewer 3D persistant (compact).
 * Ne monte jamais d’iframe — uniquement une boîte de dimensions valides
 * que PersistentStorefrontViewer suit via getBoundingClientRect.
 */
export function ViewerAnchor({
  className,
  label = "Emplacement aperçu 3D",
}: ViewerAnchorProps) {
  const { registerAnchor } = usePersistentStorefrontViewer();
  const localRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = localRef.current;
    registerAnchor(el);
    return () => {
      registerAnchor(null);
    };
  }, [registerAnchor]);

  return (
    <div
      ref={localRef}
      className={className}
      role="presentation"
      aria-label={label}
      data-viewer-anchor=""
    />
  );
}
