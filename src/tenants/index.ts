import { rawmotoTenantConfig } from "@/tenants/rawmoto";
import { isAppDevelopment } from "@/lib/app-env";
import type { ShopResolution, StorefrontTenantConfig } from "@/types/tenant";

const TENANTS: Record<string, StorefrontTenantConfig> = {
  [rawmotoTenantConfig.id]: rawmotoTenantConfig,
};

export function listTenantIds(): string[] {
  return Object.keys(TENANTS);
}

/**
 * Central tenant lookup. Returns null for unknown shop ids.
 * Never falls back to another shop's configuration.
 */
export function getTenantConfig(
  shopId: string,
): StorefrontTenantConfig | null {
  const normalized = shopId.trim().toLowerCase();
  if (!normalized) return null;
  return TENANTS[normalized] ?? null;
}

function getDefaultShopId(): string {
  const fromEnv = process.env.NEXT_PUBLIC_DEFAULT_SHOP?.trim().toLowerCase();
  if (fromEnv && getTenantConfig(fromEnv)) {
    return fromEnv;
  }
  return rawmotoTenantConfig.id;
}

/**
 * Resolves `?shop=` for the configurator route.
 *
 * - Development: missing param → default shop (rawmoto)
 * - Production: missing param → error (never auto-load another shop)
 * - Unknown shop → error in all environments
 */
export function resolveShopParam(shopParam: string | null): ShopResolution {
  const trimmed = shopParam?.trim() ?? "";

  if (!trimmed) {
    if (isAppDevelopment()) {
      return {
        ok: true,
        shopId: getDefaultShopId(),
        fromDefault: true,
      };
    }
    return { ok: false, reason: "missing", shopId: null };
  }

  const shopId = trimmed.toLowerCase();
  if (!getTenantConfig(shopId)) {
    return { ok: false, reason: "unknown", shopId };
  }

  return { ok: true, shopId, fromDefault: false };
}

export { rawmotoTenantConfig };
