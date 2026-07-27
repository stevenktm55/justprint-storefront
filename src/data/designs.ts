import type { DesignOption } from "@/types/configurator";

/** Seed data only — consumed by the mock JustPrint bootstrap, not by UI components. */
export const DESIGNS: DesignOption[] = [
  {
    id: "factory-01",
    name: "Factory 01",
    badge: "Factory",
    description: "Inspiré des teams officiels",
    accentColors: ["#FF5A00", "#111111", "#FFFFFF"],
  },
  {
    id: "minimal-01",
    name: "Minimal 01",
    badge: "Minimal",
    description: "Sobre, lisible et premium",
    accentColors: ["#111111", "#F5F5F5", "#FF5A00"],
  },
  {
    id: "racing-01",
    name: "Racing 01",
    badge: "Racing",
    description: "Contrastes forts et lignes rapides",
    accentColors: ["#0066FF", "#111111", "#FF5A00"],
  },
  {
    id: "retro-01",
    name: "Retro 01",
    badge: "Retro",
    description: "Ambiance vintage, lignes affirmées",
    accentColors: ["#C45C26", "#F4EDE4", "#1A1A1A"],
  },
  {
    id: "dark-01",
    name: "Dark 01",
    badge: "Dark",
    description: "Contraste sombre et accents nets",
    accentColors: ["#111111", "#2A2A2A", "#FF5A00"],
  },
  {
    id: "full-custom",
    name: "Full Custom",
    badge: "Custom",
    description: "Donne-nous tes idées, le système prépare une proposition",
    accentColors: ["#FF5A00", "#0066FF", "#111111"],
  },
];
