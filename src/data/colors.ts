/**
 * @deprecated MOCK MODE ONLY — do not import from remote UI components.
 * Remote parcours uses bootstrap `colorLibraries`.
 * Kept for legacy references / documentation; Prefer mock-bootstrap seeding.
 */

export interface LibraryColor {
  id: string;
  name: string;
  hex: string;
}

/** Fictional demo palette — mock mode seed only. */
export const COLOR_LIBRARY: LibraryColor[] = [
  { id: "c01", name: "Orange Raw", hex: "#FF5A00" },
  { id: "c02", name: "Noir Mat", hex: "#111111" },
  { id: "c03", name: "Blanc Pur", hex: "#FFFFFF" },
  { id: "c04", name: "Bleu Racing", hex: "#0066FF" },
  { id: "c05", name: "Rouge Factory", hex: "#E10600" },
  { id: "c06", name: "Jaune Fluo", hex: "#F5E000" },
  { id: "c07", name: "Vert Neon", hex: "#39FF14" },
  { id: "c08", name: "Gris Acier", hex: "#6B7280" },
  { id: "c09", name: "Anthracite", hex: "#2A2A2A" },
  { id: "c10", name: "Bleu Nuit", hex: "#0B1D4A" },
  { id: "c11", name: "Cyan", hex: "#00C2FF" },
  { id: "c12", name: "Violet", hex: "#6D28D9" },
  { id: "c13", name: "Rose", hex: "#EC4899" },
  { id: "c14", name: "Bordeaux", hex: "#7F1D1D" },
  { id: "c15", name: "Sable", hex: "#D6C3A3" },
  { id: "c16", name: "Olive", hex: "#556B2F" },
  { id: "c17", name: "Turquoise", hex: "#14B8A6" },
  { id: "c18", name: "Orange Clair", hex: "#FF8A3D" },
  { id: "c19", name: "Blanc Cassé", hex: "#F4F4F2" },
  { id: "c20", name: "Noir Brillant", hex: "#000000" },
];

export function findLibraryColorName(hex: string): string {
  const match = COLOR_LIBRARY.find(
    (color) => color.hex.toUpperCase() === hex.toUpperCase(),
  );
  return match?.name ?? hex.toUpperCase();
}
