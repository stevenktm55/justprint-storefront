"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  displayHex,
  getActiveColorLibraries,
  swatchBackground,
} from "@/lib/justprint/colors";
import type { StorefrontColorLibrary, StorefrontLibraryColor } from "@/types/justprint";

export interface ColorSwatchSelection {
  hex: string;
  colorId?: string | null;
  name?: string | null;
  archived?: boolean;
}

interface ColorSwatchProps {
  id: string;
  label: string;
  selection: ColorSwatchSelection;
  libraries: StorefrontColorLibrary[];
  open: boolean;
  onToggle: () => void;
  onChange: (color: StorefrontLibraryColor, library: StorefrontColorLibrary) => void;
}

export function ColorSwatch({
  id,
  label,
  selection,
  libraries,
  open,
  onToggle,
  onChange,
}: ColorSwatchProps) {
  const activeLibraries = useMemo(
    () => getActiveColorLibraries(libraries),
    [libraries],
  );
  const [activeLibraryId, setActiveLibraryId] = useState<string | null>(null);

  const resolvedLibraryId =
    activeLibraryId &&
    activeLibraries.some((lib) => lib.id === activeLibraryId)
      ? activeLibraryId
      : activeLibraries[0]?.id ?? null;

  const activeLibrary =
    activeLibraries.find((lib) => lib.id === resolvedLibraryId) ?? null;

  const displayName = selection.archived
    ? selection.name
      ? `${selection.name} · Couleur archivée`
      : "Couleur archivée"
    : selection.name?.trim() ||
      (selection.hex ? displayHex(selection.hex).toUpperCase() : "—");

  const bg = swatchBackground(selection);

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
          style={{ backgroundColor: bg }}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{label}</span>
          <span className="block truncate text-xs text-[var(--rm-text-muted)]">
            {displayName}
            {selection.hex
              ? ` · ${displayHex(selection.hex).toUpperCase()}`
              : ""}
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
          {activeLibraries.length === 0 ? (
            <p className="text-xs text-[var(--rm-text-muted)]">
              Aucune bibliothèque de couleurs configurée.
            </p>
          ) : (
            <>
              {activeLibraries.length > 1 ? (
                <div
                  className="mb-3 flex gap-1.5 overflow-x-auto pb-1"
                  role="tablist"
                  aria-label="Bibliothèques"
                >
                  {activeLibraries.map((library) => {
                    const selected = library.id === resolvedLibraryId;
                    return (
                      <button
                        key={library.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => setActiveLibraryId(library.id)}
                        className={`shrink-0 rounded-[var(--rm-radius-sm)] px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap ${
                          selected
                            ? "bg-[var(--rm-accent)] text-white"
                            : "border border-[var(--rm-border)] bg-[var(--rm-surface)]"
                        }`}
                      >
                        {library.name}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {!activeLibrary || activeLibrary.colors.length === 0 ? (
                <p className="text-xs text-[var(--rm-text-muted)]">
                  Cette bibliothèque ne contient aucune couleur.
                </p>
              ) : (
                <div className="grid grid-cols-8 gap-1.5">
                  {activeLibrary.colors.map((color) => {
                    const selected = Boolean(
                      (selection.colorId != null &&
                        selection.colorId === color.id) ||
                        (!selection.colorId &&
                          selection.hex &&
                          displayHex(selection.hex).toLowerCase() ===
                            displayHex(color.hex).toLowerCase()),
                    );
                    return (
                      <button
                        key={color.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        aria-label={color.name}
                        title={color.name}
                        onClick={() => onChange(color, activeLibrary)}
                        className={`aspect-square rounded-[var(--rm-radius-sm)] border ${
                          selected
                            ? "border-[var(--rm-accent)] ring-2 ring-[var(--rm-accent)]"
                            : "border-[var(--rm-border)]"
                        }`}
                        style={{
                          backgroundColor: swatchBackground(color),
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
