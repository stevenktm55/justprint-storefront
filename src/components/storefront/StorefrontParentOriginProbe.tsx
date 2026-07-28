"use client";

import { useEffect } from "react";

/**
 * Dev only — journalise l’origine courante et le referrer pour identifier
 * le parent supérieur (RawMoto publié, preview Shopify, éditeur de thème).
 * Aucun log en production.
 */
export function StorefrontParentOriginProbe() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const ancestors =
      typeof window !== "undefined" && "ancestorOrigins" in location
        ? Array.from(location.ancestorOrigins)
        : [];

    console.info("[StorefrontParentOriginProbe]", {
      "window.location.origin": window.location.origin,
      "document.referrer": document.referrer || "(empty)",
      ancestorOrigins: ancestors,
    });
  }, []);

  return null;
}
