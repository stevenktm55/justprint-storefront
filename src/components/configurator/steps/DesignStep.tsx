"use client";

import { SelectionCard } from "@/components/configurator/ui/SelectionCard";
import { DEFAULT_PALETTE } from "@/types/configurator";
import { useConfigurator } from "@/context/ConfiguratorContext";
import { useStorefront } from "@/context/StorefrontContext";

function DesignPlaceholder({ colors }: { colors: [string, string, string] }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 55%, ${colors[2]} 100%)`,
        }}
      />
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute -right-6 top-4 h-28 w-44 rotate-[-18deg] rounded-sm"
          style={{ backgroundColor: colors[2] }}
        />
        <div
          className="absolute bottom-8 left-4 h-20 w-32 rotate-[12deg] rounded-sm"
          style={{ backgroundColor: colors[0] }}
        />
        <div
          className="absolute right-8 bottom-10 h-10 w-24 rotate-[-8deg] rounded-sm"
          style={{ backgroundColor: colors[1] }}
        />
      </div>
    </div>
  );
}

export function DesignStep() {
  const { state, dispatch } = useConfigurator();
  const { designs } = useStorefront();
  const keepingChoices = state.returnToFinalPreview;

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

      <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
        {designs.map((design) => (
          <SelectionCard
            key={design.id}
            title={design.name}
            description={design.description}
            badge={design.badge}
            hideTitle
            compactFooter
            mediaAspectClassName="aspect-[4/3]"
            selected={state.selectedDesign === design.id}
            onSelect={() => {
              dispatch({ type: "SET_DESIGN", payload: design.id });

              // Keep existing colors when switching design from the final preview.
              if (!keepingChoices) {
                dispatch({
                  type: "APPLY_DESIGN_PALETTE",
                  payload: [
                    {
                      ...DEFAULT_PALETTE[0],
                      hex: design.accentColors[0],
                      label: "Couleur 1",
                    },
                    {
                      ...DEFAULT_PALETTE[1],
                      hex: design.accentColors[1],
                      label: "Couleur 2",
                    },
                    {
                      ...DEFAULT_PALETTE[2],
                      hex: design.accentColors[2],
                      label: "Couleur 3",
                    },
                    DEFAULT_PALETTE[3],
                  ],
                });
              }
            }}
            media={<DesignPlaceholder colors={design.accentColors} />}
          />
        ))}
      </div>
    </div>
  );
}

export function canProceedFromDesign(selectedDesign: string | null): boolean {
  return Boolean(selectedDesign);
}
