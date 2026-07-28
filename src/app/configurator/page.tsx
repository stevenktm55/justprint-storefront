"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ConfiguratorShell } from "@/components/configurator/ConfiguratorShell";
import { ShopErrorScreen } from "@/components/storefront/ShopErrorScreen";
import { StorefrontParentOriginProbe } from "@/components/storefront/StorefrontParentOriginProbe";
import { ConfiguratorProvider } from "@/context/ConfiguratorContext";
import { PersistentStorefrontViewerProvider } from "@/context/PersistentStorefrontViewerContext";
import { StorefrontProvider } from "@/context/StorefrontContext";
import { StorefrontTenantProvider } from "@/context/StorefrontTenantContext";
import { resolveShopParam } from "@/tenants";

function ConfiguratorFallback() {
  return (
    <div className="flex h-[100dvh] items-center justify-center bg-[var(--rm-bg)] text-sm text-[var(--rm-text-muted)]">
      Chargement du configurateur…
    </div>
  );
}

function ConfiguratorPageContent() {
  const searchParams = useSearchParams();
  const resolution = resolveShopParam(searchParams.get("shop"));

  if (!resolution.ok) {
    return (
      <ShopErrorScreen reason={resolution.reason} shopId={resolution.shopId} />
    );
  }

  return (
    <StorefrontTenantProvider shopId={resolution.shopId}>
      <ConfiguratorProvider>
        <StorefrontProvider>
          <PersistentStorefrontViewerProvider>
            <StorefrontParentOriginProbe />
            <ConfiguratorShell />
          </PersistentStorefrontViewerProvider>
        </StorefrontProvider>
      </ConfiguratorProvider>
    </StorefrontTenantProvider>
  );
}

export default function ConfiguratorPage() {
  return (
    <Suspense fallback={<ConfiguratorFallback />}>
      <ConfiguratorPageContent />
    </Suspense>
  );
}
