"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { getTenantConfig } from "@/tenants";
import { tenantThemeStyle } from "@/lib/tenant-theme";
import type {
  StorefrontTenantConfig,
  StorefrontTenantFeatures,
} from "@/types/tenant";

export interface StorefrontTenantTheme {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  activeColor: string;
}

interface StorefrontTenantContextValue {
  tenant: StorefrontTenantConfig;
  shopId: string;
  theme: StorefrontTenantTheme;
  features: StorefrontTenantFeatures;
  allowedParentOrigins: string[];
}

const StorefrontTenantContext =
  createContext<StorefrontTenantContextValue | null>(null);

export function StorefrontTenantProvider({
  shopId,
  children,
}: {
  shopId: string;
  children: ReactNode;
}) {
  const tenant = getTenantConfig(shopId);

  if (!tenant) {
    throw new Error(
      `StorefrontTenantProvider: unknown shop "${shopId}". Resolve the shop before mounting the provider.`,
    );
  }

  const value = useMemo<StorefrontTenantContextValue>(
    () => ({
      tenant,
      shopId: tenant.id,
      theme: {
        primaryColor: tenant.primaryColor,
        backgroundColor: tenant.backgroundColor,
        textColor: tenant.textColor,
        buttonColor: tenant.primaryColor,
        activeColor: tenant.primaryColor,
      },
      features: tenant.features,
      allowedParentOrigins: tenant.allowedParentOrigins,
    }),
    [tenant],
  );

  return (
    <StorefrontTenantContext.Provider value={value}>
      <div
        className="min-h-[100dvh]"
        data-shop={tenant.id}
        style={tenantThemeStyle(tenant)}
      >
        {children}
      </div>
    </StorefrontTenantContext.Provider>
  );
}

export function useStorefrontTenant(): StorefrontTenantContextValue {
  const context = useContext(StorefrontTenantContext);
  if (!context) {
    throw new Error(
      "useStorefrontTenant must be used within a StorefrontTenantProvider",
    );
  }
  return context;
}
