import type { StorefrontTenantConfig } from "@/types/tenant";

/**
 * RawMoto — first JustPrint Storefront tenant.
 * Colors and copy match the current prototype exactly.
 *
 * Parent origins for iframe embedding / postMessage.
 * Shopify myshopify.com domain can be appended later when known.
 */
export const rawmotoTenantConfig: StorefrontTenantConfig = {
  id: "rawmoto",
  name: "RawMoto",
  logoText: "RAWMOTO",
  primaryColor: "#ff5a00",
  backgroundColor: "#f4f4f2",
  textColor: "#0a0a0a",
  locale: "fr-FR",
  currency: "EUR",
  configuratorTitle: "Configurateur de kits déco",
  configuratorDescription:
    "Configure ton kit déco motocross RawMoto en quelques choix simples.",
  allowedParentOrigins: [
    "https://rawmoto.fr",
    "https://www.rawmoto.fr",
    "https://26578d-f2.myshopify.com",
  ],
  features: {
    enable3dPreview: true,
    enable2dPreview: true,
    enableLogoLibrary: true,
    enableCustomLogoUpload: true,
    enableAutomaticLogoPlacement: true,
    enableShopifyCart: false,
    enableCustomerAccounts: false,
  },
};
