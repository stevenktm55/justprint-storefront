"use client";

import { useMemo, useRef, useState } from "react";
import { ColorSwatch } from "@/components/configurator/ui/ColorSwatch";
import { useConfigurator } from "@/context/ConfiguratorContext";
import { useStorefront } from "@/context/StorefrontContext";
import {
  findCatalogDesignById,
  getCatalogColorLibraries,
} from "@/lib/justprint/catalog";
import {
  libraryColorToSelection,
  resolveDesignColorSlots,
  selectionToPaletteColor,
} from "@/lib/justprint/colors";
import { isJustPrintMockMode } from "@/lib/justprint-client";
import type { PaletteColor } from "@/types/configurator";
import type {
  StorefrontColorLibrary,
  StorefrontColorSlot,
  StorefrontLibraryColor,
} from "@/types/justprint";

/** Palette mock locale — uniquement si le bootstrap mock n’a pas de bibliothèque. */
const MOCK_FALLBACK_LIBRARY: StorefrontColorLibrary = {
  id: "mock-local",
  name: "Couleurs RawMoto",
  shopId: "rawmoto",
  active: true,
  colors: [
    { id: "c01", name: "Orange Raw", hex: "#FF5A00", displayOrder: 0, cmyk: { c: 0, m: 72, y: 100, k: 0 }, rgb: { r: 255, g: 90, b: 0 } },
    { id: "c02", name: "Noir Mat", hex: "#111111", displayOrder: 1, cmyk: { c: 0, m: 0, y: 0, k: 93 }, rgb: { r: 17, g: 17, b: 17 } },
    { id: "c03", name: "Blanc Pur", hex: "#FFFFFF", displayOrder: 2, cmyk: { c: 0, m: 0, y: 0, k: 0 }, rgb: { r: 255, g: 255, b: 255 } },
    { id: "c04", name: "Bleu Racing", hex: "#0066FF", displayOrder: 3, cmyk: { c: 100, m: 60, y: 0, k: 0 }, rgb: { r: 0, g: 102, b: 255 } },
    { id: "c05", name: "Rouge Factory", hex: "#E10600", displayOrder: 4, cmyk: { c: 0, m: 97, y: 100, k: 12 }, rgb: { r: 225, g: 6, b: 0 } },
    { id: "c06", name: "Jaune Fluo", hex: "#F5E000", displayOrder: 5, cmyk: { c: 4, m: 0, y: 100, k: 4 }, rgb: { r: 245, g: 224, b: 0 } },
    { id: "c07", name: "Vert Neon", hex: "#39FF14", displayOrder: 6, cmyk: { c: 55, m: 0, y: 92, k: 0 }, rgb: { r: 57, g: 255, b: 20 } },
    { id: "c08", name: "Gris Acier", hex: "#6B7280", displayOrder: 7, cmyk: { c: 16, m: 10, y: 0, k: 50 }, rgb: { r: 107, g: 114, b: 128 } },
  ],
};

export function PersonalizationStep() {
  const { state, dispatch } = useConfigurator();
  const { colorLibraries, syncStatus } = useStorefront();
  const [openPickerId, setOpenPickerId] = useState<string | null>(null);
  const requestSeqRef = useRef(0);

  const design = state.selectedDesign
    ? findCatalogDesignById(state.selectedDesign)
    : null;

  const slots: StorefrontColorSlot[] = useMemo(
    () => resolveDesignColorSlots(design, state.bike?.colorSlots ?? null),
    [design, state.bike?.colorSlots],
  );

  const libraries = useMemo(() => {
    const fromBootstrap =
      colorLibraries.length > 0
        ? colorLibraries
        : getCatalogColorLibraries();
    if (fromBootstrap.length > 0) return fromBootstrap;
    if (isJustPrintMockMode()) return [MOCK_FALLBACK_LIBRARY];
    return [];
  }, [colorLibraries]);

  const togglePicker = (id: string) => {
    setOpenPickerId((current) => (current === id ? null : id));
  };

  const applySlotColor = (
    slot: StorefrontColorSlot,
    color: StorefrontLibraryColor,
    library: StorefrontColorLibrary,
  ) => {
    const selection = libraryColorToSelection(color, library.id);
    const next = selectionToPaletteColor(slot, selection, {
      libraryId: library.id,
    });

    requestSeqRef.current += 1;
    const seq = requestSeqRef.current;

    // Optimistic UI
    dispatch({ type: "SET_SLOT_COLOR", payload: next });
    setOpenPickerId(null);

    if (process.env.NODE_ENV === "development") {
      console.info("[storefront/color]", {
        slot: slot.key,
        colorId: color.id,
        libraryId: library.id,
        seq,
      });
    }
  };

  const plateSlot =
    slots.find((s) => s.isPlate) ??
    ({
      key: "plate",
      label: "Couleur des plaques",
      defaultHex: state.plateColor || "#ffffff",
      isPlate: true,
    } satisfies StorefrontColorSlot);

  const colorSlots = slots.filter((s) => !s.isPlate);

  // Prefer palette entries aligned on slots; fall back to palette as-is.
  const slotRows: Array<{ slot: StorefrontColorSlot; value: PaletteColor }> =
    colorSlots.length > 0
      ? colorSlots.map((slot) => {
          const value =
            state.palette.find((p) => p.id === slot.key) ??
            ({
              id: slot.key,
              label: slot.label,
              hex: slot.defaultHex,
              name: slot.defaultValue?.name ?? null,
              colorId: slot.defaultValue?.colorId ?? null,
              cmyk: slot.defaultValue?.cmyk ?? null,
            } satisfies PaletteColor);
          return { slot, value };
        })
      : state.palette
          .filter((p) => !p.isPlate && p.id !== "plate")
          .map((value) => ({
            slot: {
              key: value.id,
              label: value.label,
              defaultHex: value.hex,
              isPlate: false,
            } satisfies StorefrontColorSlot,
            value,
          }));

  const plateValue: PaletteColor = {
    id: plateSlot.key,
    label: plateSlot.label,
    hex: state.plateColor,
    name:
      state.palette.find((p) => p.isPlate || p.id === "plate")?.name ?? null,
    colorId:
      state.palette.find((p) => p.isPlate || p.id === "plate")?.colorId ?? null,
    cmyk:
      state.palette.find((p) => p.isPlate || p.id === "plate")?.cmyk ?? null,
    archived: state.palette.find((p) => p.isPlate || p.id === "plate")
      ?.archived,
    isPlate: true,
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold leading-none sm:text-4xl">
          Personnalise l’essentiel
        </h1>
        <p className="mt-2 text-sm text-[var(--rm-text-muted)]">
          Numéro, nom et couleurs. Le rendu se met à jour après enregistrement.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rm-field">
          <label htmlFor="race-number">Numéro</label>
          <input
            id="race-number"
            type="text"
            inputMode="numeric"
            maxLength={3}
            value={state.raceNumber}
            onChange={(event) =>
              dispatch({
                type: "SET_RACE_NUMBER",
                payload: event.target.value.replace(/[^\d]/g, "").slice(0, 3),
              })
            }
            placeholder="17"
          />
        </div>

        <div className="rm-field sm:col-span-2">
          <label htmlFor="rider-name">Nom du pilote</label>
          <input
            id="rider-name"
            type="text"
            maxLength={20}
            value={state.riderName}
            onChange={(event) =>
              dispatch({
                type: "SET_RIDER_NAME",
                payload: event.target.value,
              })
            }
            placeholder="MARTIN"
          />
        </div>
      </div>

      <section aria-labelledby="colors-title" className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2
            id="colors-title"
            className="text-sm font-bold uppercase tracking-wide"
          >
            Couleurs
          </h2>
          {syncStatus === "saving" ? (
            <span className="text-[11px] font-semibold text-[var(--rm-text-muted)]">
              Mise à jour…
            </span>
          ) : null}
        </div>

        {state.colorSaveError ? (
          <p
            role="alert"
            className="rounded-[var(--rm-radius-sm)] border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            {state.colorSaveError}
          </p>
        ) : null}

        {libraries.length === 0 ? (
          <p className="text-sm text-[var(--rm-text-muted)]">
            Aucune bibliothèque de couleurs n’est configurée pour cette
            boutique.
          </p>
        ) : null}

        {slots.length === 0 && slotRows.length === 0 ? (
          <p className="text-sm text-[var(--rm-text-muted)]">
            Ce design ne définit aucun slot de couleur.
          </p>
        ) : null}

        <ColorSwatch
          id={plateSlot.key}
          label={plateSlot.label || "Couleur des plaques"}
          selection={plateValue}
          libraries={libraries}
          open={openPickerId === plateSlot.key}
          onToggle={() => togglePicker(plateSlot.key)}
          onChange={(color, library) =>
            applySlotColor(plateSlot, color, library)
          }
        />

        {slotRows.map(({ slot, value }) => (
          <ColorSwatch
            key={slot.key}
            id={slot.key}
            label={slot.label}
            selection={value}
            libraries={libraries}
            open={openPickerId === slot.key}
            onToggle={() => togglePicker(slot.key)}
            onChange={(color, library) =>
              applySlotColor(slot, color, library)
            }
          />
        ))}
      </section>
    </div>
  );
}

export function canProceedFromPersonalization(raceNumber: string): boolean {
  return raceNumber.trim().length > 0;
}
