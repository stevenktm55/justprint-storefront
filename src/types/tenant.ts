/**
 * Tenant / boutique configuration for JustPrint Storefront.
 * One storefront app, many client shops via `?shop=`.
 */

export interface StorefrontTenantFeatures {
  enable3dPreview: boolean;
  enable2dPreview: boolean;
  enableLogoLibrary: boolean;
  enableCustomLogoUpload: boolean;
  enableAutomaticLogoPlacement: boolean;
  enableShopifyCart: boolean;
  enableCustomerAccounts: boolean;
}

export interface StorefrontTenantConfig {
  id: string;
  name: string;
  logoText: string;
  logoUrl?: string;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  locale: string;
  currency: string;
  configuratorTitle: string;
  configuratorDescription: string;
  allowedParentOrigins: string[];
  features: StorefrontTenantFeatures;
}

export type ShopResolution =
  | { ok: true; shopId: string; fromDefault: boolean }
  | { ok: false; reason: "missing" | "unknown"; shopId: string | null };
