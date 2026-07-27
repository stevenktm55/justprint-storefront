"use client";

import { RotateCcw } from "lucide-react";

interface RestoreDraftNoticeProps {
  visible: boolean;
  onDismiss: () => void;
  onReset: () => void;
}

export function RestoreDraftNotice({
  visible,
  onDismiss,
  onReset,
}: RestoreDraftNoticeProps) {
  if (!visible) return null;

  return (
    <div
      className="mx-4 mt-3 rounded-[var(--rm-radius)] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3"
      role="status"
    >
      <p className="text-sm font-medium">
        Ta configuration précédente a été restaurée
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-11 rounded-[var(--rm-radius-sm)] bg-[var(--rm-bg)] px-3 text-sm font-semibold"
        >
          Continuer
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--rm-radius-sm)] px-3 text-sm font-semibold text-[var(--rm-text-muted)]"
        >
          <RotateCcw size={14} />
          Recommencer à zéro
        </button>
      </div>
    </div>
  );
}
