"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Plus, Settings2, X } from "lucide-react";
import { BottomSheet } from "@/components/configurator/ui/BottomSheet";
import { useConfigurator } from "@/context/ConfiguratorContext";
import { useStorefront } from "@/context/StorefrontContext";
import { getLogosByCategory } from "@/lib/justprint/catalog";
import {
  getLogoProminenceDefinition,
} from "@/lib/logo-prominence";
import type { LogoCategoryId, SelectedLogo } from "@/types/configurator";

function LogoMark({ name }: { name: string }) {
  return (
    <span
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--rm-radius-sm)] bg-[var(--rm-bg)] text-[9px] font-extrabold uppercase leading-none tracking-wide text-[var(--rm-text)]"
      aria-hidden="true"
    >
      {name.slice(0, 3)}
    </span>
  );
}

function LogoProminenceRow({
  logo,
  expanded,
  showInlineSlider,
  onToggleExpand,
  onProminenceChange,
  onRemove,
}: {
  logo: SelectedLogo;
  expanded: boolean;
  showInlineSlider: boolean;
  onToggleExpand: () => void;
  onProminenceChange: (level: number) => void;
  onRemove: () => void;
}) {
  const definition = getLogoProminenceDefinition(logo.prominenceLevel);
  const sliderId = `prominence-${logo.id}-${showInlineSlider ? "desktop" : "mobile"}`;

  const slider = (
    <div className="flex flex-col gap-2">
      <label htmlFor={sliderId} className="sr-only">
        Niveau de mise en avant de {logo.name}
      </label>
      <input
        id={sliderId}
        type="range"
        min={1}
        max={10}
        step={1}
        value={logo.prominenceLevel}
        onChange={(event) => onProminenceChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer accent-[var(--rm-accent)]"
      />
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">{definition.label}</p>
        <p className="font-mono text-xs font-bold text-[var(--rm-text-muted)]">
          {logo.prominenceLevel}/10
        </p>
      </div>
      <p className="text-xs leading-relaxed text-[var(--rm-text-muted)]">
        {definition.description}
      </p>
    </div>
  );

  return (
    <div className="border-b border-[var(--rm-border)] last:border-b-0">
      <div className="flex min-h-[64px] items-center gap-2 px-2 py-2 sm:gap-3 sm:px-3">
        <LogoMark name={logo.name} />

        <button
          type="button"
          onClick={onToggleExpand}
          className="min-w-0 flex-1 text-left"
          aria-expanded={expanded}
        >
          <p className="truncate text-sm font-semibold leading-tight">
            {logo.name}
          </p>
          <p className="truncate text-xs text-[var(--rm-text-muted)]">
            {definition.label} · {logo.prominenceLevel}/10
          </p>
        </button>

        {!showInlineSlider ? (
          <button
            type="button"
            onClick={onToggleExpand}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--rm-radius-sm)] text-[var(--rm-text-muted)]"
            aria-label={`Régler ${logo.name}`}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronDown size={18} /> : <Settings2 size={18} />}
          </button>
        ) : null}

        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--rm-radius-sm)] text-[var(--rm-text-muted)]"
          aria-label={`Supprimer ${logo.name}`}
        >
          <X size={16} />
        </button>
      </div>

      {showInlineSlider ? (
        <div className="px-3 pb-3">{slider}</div>
      ) : expanded ? (
        <div className="border-t border-[var(--rm-border)] bg-[var(--rm-bg)] px-3 py-3">
          {slider}
        </div>
      ) : null}
    </div>
  );
}

export function LogosStep() {
  const { state, dispatch } = useConfigurator();
  const { logoCategories, logos } = useStorefront();
  const [activeCategory, setActiveCategory] =
    useState<LogoCategoryId>("pneus");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [expandedLogoId, setExpandedLogoId] = useState<string | null>(null);
  const categoryLogos = useMemo(() => {
    void logos;
    return getLogosByCategory(activeCategory);
  }, [activeCategory, logos]);

  const selectedLogos = state.selectedLogos;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold leading-none sm:text-4xl">
          Quels logos veux-tu afficher ?
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--rm-text-muted)]">
          Sélectionne tes logos et définis leur niveau de mise en avant. RawMoto
          gère automatiquement leur taille et leur placement.
        </p>
      </div>

      <section aria-labelledby="logo-library">
        <h2 id="logo-library" className="sr-only">
          Bibliothèque de logos
        </h2>

        <div
          className="mb-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Catégories de logos"
        >
          {logoCategories.map((category) => {
            const selected = activeCategory === category.id;
            return (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveCategory(category.id)}
                className={`h-10 shrink-0 rounded-full px-3.5 text-sm font-semibold whitespace-nowrap ${
                  selected
                    ? "bg-[var(--rm-accent)] text-white"
                    : "border border-[var(--rm-border)] bg-[var(--rm-surface)] text-[var(--rm-text)]"
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>

        <div
          className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-wrap lg:overflow-visible lg:snap-none [&::-webkit-scrollbar]:hidden"
          aria-label={`Logos ${logoCategories.find((c) => c.id === activeCategory)?.label ?? ""}`}
        >
          {categoryLogos.map((logo) => {
            const selected = state.selectedLogos.some(
              (item) => item.id === logo.id,
            );
            return (
              <button
                key={logo.id}
                type="button"
                onClick={() =>
                  dispatch({
                    type: "TOGGLE_LOGO",
                    payload: { id: logo.id, name: logo.name },
                  })
                }
                aria-pressed={selected}
                className={`flex h-[72px] w-[38%] shrink-0 snap-start flex-col items-center justify-center rounded-[var(--rm-radius)] border px-2 text-center sm:w-[32%] lg:w-[calc(25%-0.5rem)] ${
                  selected
                    ? "border-[var(--rm-accent)] bg-[var(--rm-accent-soft)] ring-2 ring-[var(--rm-accent)]"
                    : "border-[var(--rm-border)] bg-[var(--rm-surface)]"
                }`}
              >
                <span className="text-xs font-extrabold uppercase tracking-wide">
                  {logo.name}
                </span>
                {selected ? (
                  <span className="mt-1 text-[10px] font-bold uppercase text-[var(--rm-accent)]">
                    Ajouté
                  </span>
                ) : null}
              </button>
            );
          })}

          {activeCategory === "sponsors" ? (
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="flex h-[72px] w-[38%] shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-[var(--rm-radius)] border border-dashed border-[var(--rm-border-strong)] bg-[var(--rm-surface)] px-2 text-center sm:w-[32%] lg:w-[calc(25%-0.5rem)]"
            >
              <Plus size={18} />
              <span className="text-xs font-semibold">Mon logo</span>
            </button>
          ) : null}
        </div>
      </section>

      {selectedLogos.length > 0 ? (
        <section aria-labelledby="selected-logos">
          <h2
            id="selected-logos"
            className="mb-1 text-sm font-bold uppercase tracking-wide"
          >
            Niveau de mise en avant des logos
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-[var(--rm-text-muted)]">
            Choisis l’importance visuelle de chaque logo. Plus le niveau est
            élevé, plus RawMoto cherchera à placer le logo dans une zone visible
            et à lui donner une taille importante. Le placement exact s’adapte
            automatiquement au design, au nombre de logos et à l’espace
            disponible.
          </p>

          <div className="overflow-hidden rounded-[var(--rm-radius)] border border-[var(--rm-border)] bg-[var(--rm-surface)]">
            {selectedLogos.map((logo) => (
              <div key={logo.id} className="lg:hidden">
                <LogoProminenceRow
                  logo={logo}
                  expanded={expandedLogoId === logo.id}
                  showInlineSlider={false}
                  onToggleExpand={() =>
                    setExpandedLogoId((current) =>
                      current === logo.id ? null : logo.id,
                    )
                  }
                  onProminenceChange={(level) =>
                    dispatch({
                      type: "SET_LOGO_PROMINENCE",
                      payload: { id: logo.id, prominenceLevel: level },
                    })
                  }
                  onRemove={() =>
                    dispatch({
                      type: "TOGGLE_LOGO",
                      payload: { id: logo.id, name: logo.name },
                    })
                  }
                />
              </div>
            ))}

            {selectedLogos.map((logo) => (
              <div key={`desktop-${logo.id}`} className="hidden lg:block">
                <LogoProminenceRow
                  logo={logo}
                  expanded
                  showInlineSlider
                  onToggleExpand={() => undefined}
                  onProminenceChange={(level) =>
                    dispatch({
                      type: "SET_LOGO_PROMINENCE",
                      payload: { id: logo.id, prominenceLevel: level },
                    })
                  }
                  onRemove={() =>
                    dispatch({
                      type: "TOGGLE_LOGO",
                      payload: { id: logo.id, name: logo.name },
                    })
                  }
                />
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs leading-relaxed text-[var(--rm-text-muted)]">
            RawMoto utilise ces niveaux comme indications de composition. La
            taille et la position exactes peuvent légèrement varier afin de
            garantir un rendu équilibré et compatible avec les différentes
            pièces du kit.
          </p>
        </section>
      ) : null}

      <BottomSheet
        open={uploadOpen}
        title="Import de logo"
        onClose={() => setUploadOpen(false)}
        footer={
          <button
            type="button"
            className="rm-btn-primary"
            onClick={() => setUploadOpen(false)}
          >
            Compris
          </button>
        }
      >
        <p className="text-sm leading-relaxed text-[var(--rm-text-muted)]">
          L’import réel de ton logo sera connecté à JustPrint.
        </p>
      </BottomSheet>
    </div>
  );
}
