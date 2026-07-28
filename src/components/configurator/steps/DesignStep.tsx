"use client";

import { SelectionCard } from "@/components/configurator/ui/SelectionCard";
import { useConfigurator } from "@/context/ConfiguratorContext";
import { useStorefront } from "@/context/StorefrontContext";
import {
  buildPaletteFromSlots,
  resolveDesignColorSlots,
  resolvePlateFromSlots,
  swatchBackground,
} from "@/lib/justprint/colors";
import { isJustPrintMockMode } from "@/lib/justprint-client";
import { DEFAULT_PALETTE } from "@/types/configurator";
import type { StorefrontDesign } from "@/types/justprint";

function DesignThumbnail({ design }: { design: StorefrontDesign }) {
  if (design.thumbnailUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={design.thumbnailUrl}
        alt=""
        className="h-full w-full object-cover"
      />
    );
  }

  const colors = design.accentColors;
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${swatchBackground({ hex: colors[0] })} 0%, ${swatchBackground({ hex: colors[1] })} 55%, ${swatchBackground({ hex: colors[2] })} 100%)`,
        }}
      />
      <div className="absolute inset-0 flex items-end p-3">
        <span className="font-display text-lg font-extrabold text-white drop-shadow">
          {design.name}
        </span>
      </div>
    </div>
  );
}

export function DesignStep() {
  const { state, dispatch } = useConfigurator();
  const { designs } = useStorefront();
  const keepingChoices = state.returnToFinalPreview;
  const isMock = isJustPrintMockMode();

  const visibleDesigns = state.bike
    ? designs.filter((design) => {
        if (!design.compatibleBikeIds || design.compatibleBikeIds.length === 0) {
          return true;
        }
        return design.compatibleBikeIds.includes(state.bike!.id);
      })
    : designs;

  const applyDesignDefaults = (design: StorefrontDesign) => {
    const slots = resolveDesignColorSlots(
      design,
      state.bike?.colorSlots ?? null,
    );

    if (slots.length > 0) {
      dispatch({
        type: "APPLY_DESIGN_PALETTE",
        payload: buildPaletteFromSlots(slots),
      });
      const plate = resolvePlateFromSlots(slots);
      if (plate) {
        dispatch({ type: "SET_PLATE_SELECTION", payload: plate });
      }
      return;
    }

    // Mock-only fallback when a design has no slots.
    if (isMock) {
      dispatch({
        type: "APPLY_DESIGN_PALETTE",
        payload: [
          {
            ...DEFAULT_PALETTE[0]!,
            hex: design.accentColors[0],
            label: "Couleur 1",
            name: "Couleur 1",
          },
          {
            ...DEFAULT_PALETTE[1]!,
            hex: design.accentColors[1],
            label: "Couleur 2",
            name: "Couleur 2",
          },
          {
            ...DEFAULT_PALETTE[2]!,
            hex: design.accentColors[2],
            label: "Couleur 3",
            name: "Couleur 3",
          },
          { ...DEFAULT_PALETTE[3]! },
        ],
      });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold leading-none sm:text-4xl">
          {keepingChoices ? "Change de design" : "Choisis ton point de départ"}
        </h1>
        <p className="mt-2 text-sm text-[var(--rm-text-muted)]">
          {keepingChoices
            ? "Tes infos, couleurs et logos sont conservés. Choisis un design puis reviens à l’aperçu final."
            : "Un design de base. RawMoto s’occupe ensuite du rendu professionnel."}
        </p>
      </div>

      {visibleDesigns.length === 0 ? (
        <p className="text-sm text-[var(--rm-text-muted)]">
          Aucun design disponible pour cette moto.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
          {visibleDesigns.map((design) => (
            <SelectionCard
              key={design.id}
              title={design.name}
              description={design.description}
              badge={design.badge}
              hideTitle
              compactFooter
              mediaAspectClassName="aspect-[4/3]"
              selected={
                state.selectedDesign === design.id ||
                state.selectedDesign === design.storefrontId
              }
              onSelect={() => {
                // Always select the internal UUID when available.
                dispatch({ type: "SET_DESIGN", payload: design.id });

                if (process.env.NODE_ENV === "development") {
                  console.info("[storefront/design]", {
                    designId: design.id,
                    storefrontId: design.storefrontId ?? null,
                    slots: design.colorSlots?.length ?? 0,
                  });
                }

                if (!keepingChoices) {
                  applyDesignDefaults(design);
                }
              }}
              media={<DesignThumbnail design={design} />}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function canProceedFromDesign(selectedDesign: string | null): boolean {
  return Boolean(selectedDesign);
}
