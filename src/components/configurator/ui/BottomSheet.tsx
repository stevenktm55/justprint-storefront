"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function BottomSheet({
  open,
  title,
  onClose,
  children,
  footer,
}: BottomSheetProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-[var(--rm-radius)] border border-[var(--rm-border)] bg-[var(--rm-surface)] sm:rounded-[var(--rm-radius)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--rm-border)] px-4 py-3">
          <h2 id={titleId} className="font-display text-xl font-bold">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--rm-radius-sm)] text-[var(--rm-text)] hover:bg-[var(--rm-bg)]"
            aria-label="Fermer la fenêtre"
          >
            <X size={20} />
          </button>
        </div>
        <div className="rm-scroll flex-1 px-4 py-4">{children}</div>
        {footer ? (
          <div className="border-t border-[var(--rm-border)] px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
