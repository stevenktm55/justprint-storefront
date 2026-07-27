"use client";

import { ArrowLeft, X } from "lucide-react";
import { useStorefrontTenant } from "@/context/StorefrontTenantContext";

interface ConfiguratorHeaderProps {
  onBack: () => void;
  onQuit: () => void;
}

export function ConfiguratorHeader({ onBack, onQuit }: ConfiguratorHeaderProps) {
  const { tenant } = useStorefrontTenant();

  return (
    <header className="flex h-[var(--rm-header-h)] shrink-0 items-center justify-between border-b border-[var(--rm-border)] bg-[var(--rm-surface)] px-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--rm-radius-sm)] hover:bg-[var(--rm-bg)]"
        aria-label="Retour"
      >
        <ArrowLeft size={20} />
      </button>

      <p className="font-display text-lg font-extrabold tracking-[0.12em]">
        {tenant.logoText}
      </p>

      <button
        type="button"
        onClick={onQuit}
        className="inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-[var(--rm-radius-sm)] px-2 text-sm font-semibold hover:bg-[var(--rm-bg)]"
        aria-label="Quitter"
      >
        <X size={18} />
        <span className="hidden sm:inline">Quitter</span>
      </button>
    </header>
  );
}
