/**
 * Construit la configuration publique pour JUSTPRINT_APPLY_RUNTIME_CONFIG.
 * Ne copie jamais d’editToken / secrets.
 */

import type {
  PublicSavedDesignState,
  StorefrontViewerRuntimeConfiguration,
} from "@/types/justprint";

const FORBIDDEN_KEYS = new Set([
  "editToken",
  "editTokenHash",
  "edit_token",
  "edit_token_hash",
  "supabaseKey",
  "serviceRoleKey",
  "shopifySecret",
  "shopifyAccessToken",
  "adminToken",
]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function containsForbiddenKeys(value: unknown, depth = 0): boolean {
  if (depth > 6 || value == null) return false;
  if (Array.isArray(value)) {
    return value.some((item) => containsForbiddenKeys(item, depth + 1));
  }
  if (!isRecord(value)) return false;
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key)) return true;
    if (containsForbiddenKeys(value[key], depth + 1)) return true;
  }
  return false;
}

export function buildViewerRuntimeConfiguration(args: {
  designId: string | null | undefined;
  productId?: string | null | undefined;
  savedDesignState: PublicSavedDesignState | null | undefined;
}): StorefrontViewerRuntimeConfiguration | null {
  const state = args.savedDesignState;
  if (!state || !isRecord(state.values)) return null;
  if (containsForbiddenKeys(state)) return null;

  const currentProductId =
    (typeof state.currentProductId === "string" && state.currentProductId.trim()
      ? state.currentProductId.trim()
      : null) ||
    (typeof args.productId === "string" && args.productId.trim()
      ? args.productId.trim()
      : null);
  const designId =
    typeof args.designId === "string" && args.designId.trim()
      ? args.designId.trim()
      : null;
  if (!currentProductId || !designId) return null;

  return {
    currentProductId,
    designId,
    values: state.values,
    ...(state.textOverrides && isRecord(state.textOverrides)
      ? { textOverrides: state.textOverrides }
      : {}),
    ...(state.logoOverrides && isRecord(state.logoOverrides)
      ? { logoOverrides: state.logoOverrides }
      : {}),
  };
}
