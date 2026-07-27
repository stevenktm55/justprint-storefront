"use client";

import { ChevronDown } from "lucide-react";
import { COLOR_LIBRARY, findLibraryColorName } from "@/data/colors";

interface ColorSwatchProps {
  id: string;
  label: string;
  hex: string;
  open: boolean;
  onToggle: () => void;
  onChange: (hex: string) => void;
}

export function ColorSwatch({
  id,
  label,
  hex,
  open,
  onToggle,
  onChange,
}: ColorSwatchProps) {
  return (
    <div className="rm-card overflow-hidden">
      <button
        type="button"
        id={`color-trigger-${id}`}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`color-library-${id}`}
        className="flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        <span
          className="h-10 w-10 shrink-0 rounded-[var(--rm-radius-sm)] border border-[var(--rm-border)]"
          style={{ backgroundColor: hex }}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{label}</span>
          <span className="block truncate text-xs text-[var(--rm-text-muted)]">
            {findLibraryColorName(hex)} · {hex.toUpperCase()}
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-[var(--rm-text-muted)] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div
          id={`color-library-${id}`}
          role="listbox"
          aria-label={`Bibliothèque de couleurs — ${label}`}
          className="border-t border-[var(--rm-border)] bg-[var(--rm-bg)] px-3 py-3"
        >
          <div className="grid grid-cols-8 gap-1.5">
            {COLOR_LIBRARY.map((color) => {
              const selected = color.hex.toUpperCase() === hex.toUpperCase();
              return (
                <button
                  key={color.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  aria-label={color.name}
                  title={color.name}
                  onClick={() => onChange(color.hex.toUpperCase())}
                  className={`aspect-square rounded-[var(--rm-radius-sm)] border ${
                    selected
                      ? "border-[var(--rm-accent)] ring-2 ring-[var(--rm-accent)]"
                      : "border-[var(--rm-border)]"
                  }`}
                  style={{ backgroundColor: color.hex }}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
