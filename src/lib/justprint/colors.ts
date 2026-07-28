/**
 * Helpers couleurs Storefront — sélection depuis les bibliothèques bootstrap,
 * jamais de recalcul CMJN, jamais de palettes codées en dur en remote.
 */

import type { PaletteColor } from "@/types/configurator";
import type {
  StorefrontColorLibrary,
  StorefrontColorSelection,
  StorefrontColorSlot,
  StorefrontDesign,
  StorefrontLibraryColor,
} from "@/types/justprint";

export function normalizeHex(hex: string | null | undefined): string {
  if (!hex || typeof hex !== "string") return "#000000";
  const t = hex.trim();
  if (!t) return "#000000";
  const withHash = t.startsWith("#") ? t : `#${t}`;
  const body = withHash.slice(1);
  if (body.length === 3) {
    return `#${body
      .split("")
      .map((c) => c + c)
      .join("")
      .toLowerCase()}`;
  }
  return `#${body.slice(0, 8).toLowerCase()}`;
}

export function displayHex(hex: string | null | undefined): string {
  const n = normalizeHex(hex);
  // Prefer 6-digit for CSS when 8-digit alpha is full opacity.
  if (n.length === 9 && n.slice(7).toLowerCase() === "ff") {
    return n.slice(0, 7);
  }
  return n.length >= 7 ? n.slice(0, 7) : n;
}

/** Bibliothèques actives, triées, avec couleurs actives ordonnées. */
export function getActiveColorLibraries(
  libraries: StorefrontColorLibrary[] | null | undefined,
): StorefrontColorLibrary[] {
  if (!libraries?.length) return [];
  return [...libraries]
    .filter((lib) => lib.active !== false)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .map((lib) => ({
      ...lib,
      colors: [...(lib.colors ?? [])]
        .filter((c) => c.active !== false)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    }))
    .filter((lib) => lib.colors.length > 0 || libraries.length === 1);
}

export function findLibraryColorById(
  libraries: StorefrontColorLibrary[],
  colorId: string | null | undefined,
): { library: StorefrontColorLibrary; color: StorefrontLibraryColor } | null {
  if (!colorId) return null;
  for (const library of getActiveColorLibraries(libraries)) {
    const color = library.colors.find((c) => c.id === colorId);
    if (color) return { library, color };
  }
  // Also search inactive libraries for archived draft restore.
  for (const library of libraries) {
    const color = library.colors.find((c) => c.id === colorId);
    if (color) return { library, color };
  }
  return null;
}

export function findLibraryColorByHex(
  libraries: StorefrontColorLibrary[],
  hex: string | null | undefined,
): { library: StorefrontColorLibrary; color: StorefrontLibraryColor } | null {
  if (!hex) return null;
  const target = normalizeHex(hex);
  for (const library of getActiveColorLibraries(libraries)) {
    const color = library.colors.find(
      (c) => normalizeHex(c.hex) === target,
    );
    if (color) return { library, color };
  }
  return null;
}

export function libraryColorToSelection(
  color: StorefrontLibraryColor,
  libraryId?: string | null,
): StorefrontColorSelection {
  return {
    colorId: color.id,
    hex: normalizeHex(color.hex),
    name: color.name,
    cmyk: color.cmyk ?? null,
    libraryId: libraryId ?? null,
  };
}

export function paletteColorToSelection(
  color: PaletteColor,
): StorefrontColorSelection {
  return {
    colorId: color.colorId ?? null,
    hex: normalizeHex(color.hex),
    name: color.name ?? null,
    cmyk: color.cmyk ?? null,
    libraryId: color.libraryId ?? null,
  };
}

export function selectionToPaletteColor(
  slot: StorefrontColorSlot,
  selection: StorefrontColorSelection,
  opts?: { archived?: boolean; libraryId?: string | null },
): PaletteColor {
  return {
    id: slot.key,
    label: slot.label,
    hex: normalizeHex(selection.hex),
    colorId: selection.colorId ?? null,
    libraryId: opts?.libraryId ?? selection.libraryId ?? null,
    name: selection.name ?? null,
    cmyk: selection.cmyk ?? null,
    archived: opts?.archived ?? false,
    isPlate: Boolean(slot.isPlate),
  };
}

export function slotDefaultToPaletteColor(
  slot: StorefrontColorSlot,
): PaletteColor {
  const dv = slot.defaultValue;
  const hex = normalizeHex(dv?.hex ?? slot.defaultHex ?? "#ffffff");
  return {
    id: slot.key,
    label: slot.label,
    hex,
    colorId: dv?.colorId ?? null,
    libraryId: dv?.libraryId ?? null,
    name: dv?.name ?? null,
    cmyk: dv?.cmyk ?? null,
    archived: false,
    isPlate: Boolean(slot.isPlate),
  };
}

/** Slots du design sélectionné (fallback moto). */
export function resolveDesignColorSlots(
  design: StorefrontDesign | null | undefined,
  bikeSlots?: StorefrontColorSlot[] | null,
): StorefrontColorSlot[] {
  if (design?.colorSlots && design.colorSlots.length > 0) {
    return design.colorSlots;
  }
  return bikeSlots ?? [];
}

/**
 * Construit la palette initiale depuis les slots du design.
 * N’utilise les défauts que si aucune valeur sauvegardée n’existe.
 */
export function buildPaletteFromSlots(
  slots: StorefrontColorSlot[],
): PaletteColor[] {
  return slots
    .filter((slot) => !slot.isPlate)
    .map((slot) => slotDefaultToPaletteColor(slot));
}

export function resolvePlateFromSlots(
  slots: StorefrontColorSlot[],
): PaletteColor | null {
  const plate = slots.find((slot) => slot.isPlate);
  return plate ? slotDefaultToPaletteColor(plate) : null;
}

/**
 * Fusionne un brouillon sauvegardé avec les slots / bibliothèques actuelles.
 * Conserve les choix du brouillon ; marque « archivée » si colorId introuvable.
 */
export function hydratePaletteFromSaved(
  slots: StorefrontColorSlot[],
  saved: {
    colors?: Record<string, string> | null;
    colorSelections?: Record<string, StorefrontColorSelection> | null;
    palette?: PaletteColor[] | null;
  },
  libraries: StorefrontColorLibrary[],
): { palette: PaletteColor[]; plate: PaletteColor | null } {
  const plateSlot = slots.find((s) => s.isPlate) ?? null;
  const colorSlots = slots.filter((s) => !s.isPlate);

  const resolveSlot = (slot: StorefrontColorSlot): PaletteColor => {
    const fromPalette = saved.palette?.find((p) => p.id === slot.key);
    const selection = saved.colorSelections?.[slot.key];
    const hexOnly = saved.colors?.[slot.key];

    if (fromPalette?.colorId) {
      const found = findLibraryColorById(libraries, fromPalette.colorId);
      if (found) {
        return {
          ...selectionToPaletteColor(
            slot,
            libraryColorToSelection(found.color, found.library.id),
          ),
          label: slot.label,
          isPlate: Boolean(slot.isPlate),
        };
      }
      return {
        ...fromPalette,
        label: slot.label,
        archived: true,
        isPlate: Boolean(slot.isPlate),
      };
    }

    if (selection?.colorId) {
      const found = findLibraryColorById(libraries, selection.colorId);
      if (found) {
        return selectionToPaletteColor(
          slot,
          libraryColorToSelection(found.color, found.library.id),
        );
      }
      return selectionToPaletteColor(slot, selection, { archived: true });
    }

    if (selection?.hex) {
      const found = findLibraryColorByHex(libraries, selection.hex);
      if (found) {
        return selectionToPaletteColor(
          slot,
          libraryColorToSelection(found.color, found.library.id),
        );
      }
      return selectionToPaletteColor(slot, selection, {
        archived: Boolean(selection.colorId),
      });
    }

    if (fromPalette?.hex) {
      const found = findLibraryColorByHex(libraries, fromPalette.hex);
      if (found) {
        return selectionToPaletteColor(
          slot,
          libraryColorToSelection(found.color, found.library.id),
        );
      }
      return {
        ...fromPalette,
        label: slot.label,
        archived: Boolean(fromPalette.colorId),
        isPlate: Boolean(slot.isPlate),
      };
    }

    if (hexOnly) {
      const found = findLibraryColorByHex(libraries, hexOnly);
      if (found) {
        return selectionToPaletteColor(
          slot,
          libraryColorToSelection(found.color, found.library.id),
        );
      }
      return {
        id: slot.key,
        label: slot.label,
        hex: normalizeHex(hexOnly),
        name: null,
        colorId: null,
        archived: false,
        isPlate: Boolean(slot.isPlate),
      };
    }

    return slotDefaultToPaletteColor(slot);
  };

  const palette = colorSlots.map(resolveSlot);
  const plate = plateSlot ? resolveSlot(plateSlot) : null;
  return { palette, plate };
}

/** CSS background sûr même si HEX manquant (CMJN seul). */
export function swatchBackground(color: {
  hex?: string | null;
  name?: string | null;
}): string {
  if (color.hex && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color.hex.trim())) {
    return displayHex(color.hex);
  }
  return "#cccccc";
}
