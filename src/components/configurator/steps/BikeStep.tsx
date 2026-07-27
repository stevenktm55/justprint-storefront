"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useConfigurator } from "@/context/ConfiguratorContext";
import { useStorefront } from "@/context/StorefrontContext";
import { previewModeBadgeLabel } from "@/lib/bike-preview";
import {
  findCatalogBike,
  getBikeBrands,
  getBikeModelsByBrand,
  getYearsForBike,
} from "@/lib/justprint/catalog";
import { loadGarageBikes, removeGarageBike } from "@/lib/garage";
import type { BikeSelection, PreviewMode } from "@/types/configurator";

function PreviewModeBadge({ mode }: { mode: PreviewMode }) {
  return (
    <span
      className={`inline-flex items-center rounded-[var(--rm-radius-sm)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
        mode === "3d"
          ? "bg-[var(--rm-success-bg)] text-[var(--rm-success)]"
          : "border border-[var(--rm-border-strong)] bg-[var(--rm-surface)] text-[var(--rm-text)]"
      }`}
    >
      {previewModeBadgeLabel(mode)}
    </span>
  );
}

export function BikeStep() {
  const { state, dispatch } = useConfigurator();
  const { bikes } = useStorefront();
  const [brand, setBrand] = useState(state.bike?.brand ?? "");
  const [model, setModel] = useState(state.bike?.model ?? "");
  const [year, setYear] = useState(state.bike?.year ?? "");
  const [garageRevision, setGarageRevision] = useState(0);

  const garage = useMemo(() => {
    if (bikes.length === 0) return [];
    void garageRevision;
    return loadGarageBikes();
  }, [bikes, garageRevision]);

  const brands = useMemo(() => {
    void bikes;
    return getBikeBrands();
  }, [bikes]);

  const models = useMemo(() => {
    void bikes;
    if (!brand) return [];
    return getBikeModelsByBrand(brand);
  }, [brand, bikes]);

  const years = useMemo(() => {
    void bikes;
    if (!brand || !model) return [];
    return getYearsForBike(brand, model);
  }, [brand, bikes, model]);

  const selectBike = (bike: BikeSelection) => {
    setBrand(bike.brand);
    setModel(bike.model);
    setYear(bike.year);
    dispatch({ type: "SET_BIKE", payload: bike });
  };

  const syncBike = (nextBrand: string, nextModel: string, nextYear: string) => {
    if (!nextBrand || !nextModel || !nextYear) return;
    const bike = findCatalogBike(nextBrand, nextModel, nextYear);
    if (!bike) return;
    dispatch({ type: "SET_BIKE", payload: bike });
  };

  const handleRemove = (bikeId: string) => {
    removeGarageBike(garage, bikeId);
    setGarageRevision((value) => value + 1);
    if (state.bike?.id === bikeId) {
      setBrand("");
      setModel("");
      setYear("");
      dispatch({ type: "SET_BIKE", payload: null });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold leading-none sm:text-4xl">
          Quelle est ta moto ?
        </h1>
        <p className="mt-2 text-sm text-[var(--rm-text-muted)]">
          Toutes les motos peuvent être personnalisées. Selon le modèle
          sélectionné, ton kit sera présenté sur la moto en 3D ou sur son
          gabarit à plat en 2D.
        </p>
      </div>

      <section aria-labelledby="garage-title" className="flex flex-col gap-3">
        <h2 id="garage-title" className="text-sm font-bold uppercase tracking-wide">
          Mon garage
        </h2>

        {garage.length === 0 ? (
          <p className="text-sm text-[var(--rm-text-muted)]">
            Ton garage est vide. Choisis une moto puis continue pour
            l’enregistrer ici.
          </p>
        ) : (
          garage.map((bike) => {
            const selected = state.bike?.id === bike.id;

            return (
              <div
                key={bike.id}
                className={`rm-card flex items-stretch gap-2 p-2 ${
                  selected
                    ? "border-[var(--rm-accent)] ring-2 ring-[var(--rm-accent)]"
                    : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => selectBike(bike)}
                  aria-pressed={selected}
                  className="min-w-0 flex-1 p-2 text-left"
                >
                  <p className="font-display text-xl font-bold">
                    {bike.brand} {bike.model}
                  </p>
                  <p className="text-sm text-[var(--rm-text-muted)]">
                    {bike.year}
                  </p>
                  <div className="mt-2">
                    <PreviewModeBadge mode={bike.previewMode} />
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(bike.id)}
                  className="inline-flex w-11 shrink-0 items-center justify-center rounded-[var(--rm-radius-sm)] text-[var(--rm-text-muted)] hover:bg-[var(--rm-bg)] hover:text-[var(--rm-text)]"
                  aria-label={`Supprimer ${bike.brand} ${bike.model} ${bike.year} du garage`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })
        )}
      </section>

      <section aria-labelledby="manual-bike" className="flex flex-col gap-3">
        <h2 id="manual-bike" className="text-sm font-bold uppercase tracking-wide">
          Ou sélectionne manuellement
        </h2>

        <div className="rm-field">
          <label htmlFor="bike-brand">Marque</label>
          <select
            id="bike-brand"
            value={brand}
            onChange={(event) => {
              const nextBrand = event.target.value;
              setBrand(nextBrand);
              setModel("");
              setYear("");
            }}
          >
            <option value="">Choisir</option>
            {brands.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="rm-field">
          <label htmlFor="bike-model">Modèle</label>
          <select
            id="bike-model"
            value={model}
            disabled={!brand}
            onChange={(event) => {
              const nextModel = event.target.value;
              setModel(nextModel);
              setYear("");
            }}
          >
            <option value="">Choisir</option>
            {models.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="rm-field">
          <label htmlFor="bike-year">Année</label>
          <select
            id="bike-year"
            value={year}
            disabled={!brand || !model}
            onChange={(event) => {
              const nextYear = event.target.value;
              setYear(nextYear);
              syncBike(brand, model, nextYear);
            }}
          >
            <option value="">Choisir</option>
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {state.bike ? (
          <div className="rm-card flex flex-wrap items-center justify-between gap-3 p-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--rm-text-muted)]">
                Sélection
              </p>
              <p className="font-display text-lg font-bold">
                {state.bike.brand} {state.bike.model} · {state.bike.year}
              </p>
            </div>
            <PreviewModeBadge mode={state.bike.previewMode} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function canProceedFromBike(bike: BikeSelection | null): boolean {
  return Boolean(bike?.brand && bike.model && bike.year && bike.previewMode);
}
