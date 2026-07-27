"use client";

import { useState } from "react";
import { ColorSwatch } from "@/components/configurator/ui/ColorSwatch";
import { useConfigurator } from "@/context/ConfiguratorContext";

export function PersonalizationStep() {
  const { state, dispatch } = useConfigurator();
  const [openPickerId, setOpenPickerId] = useState<string | null>(null);

  const togglePicker = (id: string) => {
    setOpenPickerId((current) => (current === id ? null : id));
  };

  const selectAndClose = (id: string, onSelect: (hex: string) => void) => {
    return (hex: string) => {
      onSelect(hex);
      setOpenPickerId(null);
    };
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold leading-none sm:text-4xl">
          Personnalise l’essentiel
        </h1>
        <p className="mt-2 text-sm text-[var(--rm-text-muted)]">
          Numéro, nom et couleurs. Le rendu se met à jour instantanément.
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
        <h2
          id="colors-title"
          className="text-sm font-bold uppercase tracking-wide"
        >
          Couleurs
        </h2>

        <ColorSwatch
          id="plate"
          label="Couleur des plaques"
          hex={state.plateColor}
          open={openPickerId === "plate"}
          onToggle={() => togglePicker("plate")}
          onChange={selectAndClose("plate", (hex) =>
            dispatch({ type: "SET_PLATE_COLOR", payload: hex }),
          )}
        />

        <ColorSwatch
          id="number"
          label="Couleur des numéros"
          hex={state.numberColor}
          open={openPickerId === "number"}
          onToggle={() => togglePicker("number")}
          onChange={selectAndClose("number", (hex) =>
            dispatch({ type: "SET_NUMBER_COLOR", payload: hex }),
          )}
        />

        <ColorSwatch
          id="name"
          label="Couleur du nom"
          hex={state.nameColor}
          open={openPickerId === "name"}
          onToggle={() => togglePicker("name")}
          onChange={selectAndClose("name", (hex) =>
            dispatch({ type: "SET_NAME_COLOR", payload: hex }),
          )}
        />

        {state.palette.map((color) => (
          <ColorSwatch
            key={color.id}
            id={color.id}
            label={color.label}
            hex={color.hex}
            open={openPickerId === color.id}
            onToggle={() => togglePicker(color.id)}
            onChange={selectAndClose(color.id, (hex) =>
              dispatch({
                type: "SET_PALETTE_COLOR",
                payload: { id: color.id, hex },
              }),
            )}
          />
        ))}
      </section>
    </div>
  );
}

export function canProceedFromPersonalization(raceNumber: string): boolean {
  return raceNumber.trim().length > 0;
}
