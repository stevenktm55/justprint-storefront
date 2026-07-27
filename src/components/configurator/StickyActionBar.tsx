"use client";

interface StickyActionBarProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  secondaryLabel?: string;
  onSecondaryClick?: () => void;
  secondaryDisabled?: boolean;
  secondaryLoading?: boolean;
}

export function StickyActionBar({
  label,
  onClick,
  disabled = false,
  loading = false,
  loadingLabel = "Chargement…",
  secondaryLabel,
  onSecondaryClick,
  secondaryDisabled = false,
  secondaryLoading = false,
}: StickyActionBarProps) {
  const hasSecondary = Boolean(secondaryLabel && onSecondaryClick);

  return (
    <div className="shrink-0 border-t border-[var(--rm-border)] bg-[var(--rm-surface)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div
        className={`mx-auto flex max-w-[var(--rm-max-width)] gap-2 ${
          hasSecondary ? "items-center" : ""
        }`}
      >
        {hasSecondary ? (
          <button
            type="button"
            className="rm-btn-secondary h-11 min-h-11 w-auto flex-1 whitespace-nowrap px-3 text-sm"
            onClick={onSecondaryClick}
            disabled={secondaryDisabled || secondaryLoading || loading}
          >
            {secondaryLoading ? "Sauvegarde…" : secondaryLabel}
          </button>
        ) : null}
        <button
          type="button"
          className={`rm-btn-primary h-11 min-h-11 whitespace-nowrap px-3 text-sm ${
            hasSecondary ? "w-auto flex-[1.4]" : "w-full"
          }`}
          onClick={onClick}
          disabled={disabled || loading || secondaryLoading}
        >
          {loading ? loadingLabel : label}
        </button>
      </div>
    </div>
  );
}
