"use client";

import type { ReactNode } from "react";

interface SelectionCardProps {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  badge?: string;
  media?: ReactNode;
  disabled?: boolean;
  /** Hide the title in the text footer (useful when title is already elsewhere). */
  hideTitle?: boolean;
  /** Taller media area for a stronger visual preview. */
  mediaAspectClassName?: string;
  /** Compact white footer under the media. */
  compactFooter?: boolean;
}

export function SelectionCard({
  selected,
  onSelect,
  title,
  description,
  badge,
  media,
  disabled = false,
  hideTitle = false,
  mediaAspectClassName = "aspect-[16/10]",
  compactFooter = false,
}: SelectionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={title}
      className={`rm-card flex w-full flex-col overflow-hidden text-left transition-[border-color,box-shadow] ${
        selected
          ? "border-[var(--rm-active,var(--rm-accent))] ring-2 ring-[var(--rm-active,var(--rm-accent))]"
          : "hover:border-[var(--rm-border-strong)]"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {media ? (
        <div
          className={`relative w-full overflow-hidden bg-[var(--rm-bg)] ${mediaAspectClassName}`}
        >
          {media}
          {badge ? (
            <span className="absolute left-2 top-2 rounded-[var(--rm-radius-sm)] bg-[var(--rm-surface)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--rm-text)]">
              {badge}
            </span>
          ) : null}
          {selected && hideTitle ? (
            <span className="absolute right-2 top-2 rounded-[var(--rm-radius-sm)] bg-[var(--rm-accent)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              Sélectionné
            </span>
          ) : null}
        </div>
      ) : null}
      {description || (!hideTitle && title) ? (
        <div
          className={`flex flex-col ${
            compactFooter ? "gap-0.5 px-2.5 py-2" : "gap-1 p-3"
          }`}
        >
          {!hideTitle ? (
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-lg font-bold leading-tight">
                {title}
              </span>
              {selected ? (
                <span className="shrink-0 text-xs font-bold uppercase text-[var(--rm-accent)]">
                  Sélectionné
                </span>
              ) : null}
            </div>
          ) : null}
          {description ? (
            <p
              className={`leading-snug text-[var(--rm-text-muted)] ${
                compactFooter ? "text-xs" : "text-sm"
              }`}
            >
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
    </button>
  );
}
