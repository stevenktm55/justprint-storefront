import type { CSSProperties } from "react";
import type { StorefrontTenantConfig } from "@/types/tenant";

/**
 * Maps tenant brand colors onto the existing `--rm-*` CSS variables
 * so the RawMoto visual system stays intact while remaining multi-tenant.
 */
export function tenantThemeStyle(
  tenant: StorefrontTenantConfig,
): CSSProperties {
  const primary = tenant.primaryColor;
  const accentHover =
    primary.toLowerCase() === "#ff5a00" ? "#e64f00" : primary;
  const accentSoft =
    primary.toLowerCase() === "#ff5a00" ? "#fff0e8" : `${primary}14`;

  return {
    ["--rm-bg" as string]: tenant.backgroundColor,
    ["--rm-text" as string]: tenant.textColor,
    ["--rm-accent" as string]: primary,
    ["--rm-accent-hover" as string]: accentHover,
    ["--rm-accent-soft" as string]: accentSoft,
    // Buttons + active selection states follow the primary brand color
    ["--rm-button" as string]: primary,
    ["--rm-active" as string]: primary,
    ["--background" as string]: tenant.backgroundColor,
    ["--foreground" as string]: tenant.textColor,
    backgroundColor: tenant.backgroundColor,
    color: tenant.textColor,
  };
}
