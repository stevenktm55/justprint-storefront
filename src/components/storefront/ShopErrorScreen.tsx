"use client";

interface ShopErrorScreenProps {
  reason: "missing" | "unknown";
  shopId: string | null;
}

/**
 * Clean error UI when `shop` is missing (production) or unknown.
 * Never loads another tenant as a fallback.
 */
export function ShopErrorScreen({ reason, shopId }: ShopErrorScreenProps) {
  const title =
    reason === "missing"
      ? "Boutique non spécifiée"
      : "Boutique introuvable";

  const description =
    reason === "missing"
      ? "Cette application JustPrint Storefront nécessite le paramètre d’URL shop. Exemple : /configurator?shop=rawmoto"
      : `Aucune configuration n’existe pour la boutique « ${shopId} ». Vérifie le paramètre shop dans l’URL.`;

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#f4f4f2] px-6 text-center text-[#0a0a0a]">
      <p className="font-display text-2xl font-extrabold tracking-wide">
        JustPrint Storefront
      </p>
      <h1 className="font-display text-3xl font-extrabold">{title}</h1>
      <p className="max-w-md text-sm leading-relaxed text-[#5c5c5c]">
        {description}
      </p>
      <p className="max-w-md text-xs text-[#5c5c5c]">
        En développement local, l’absence de <code>shop</code> charge
        automatiquement la boutique par défaut (
        <code>NEXT_PUBLIC_DEFAULT_SHOP</code>).
      </p>
    </div>
  );
}
