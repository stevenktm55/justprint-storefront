export type LogoProminenceLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type LogoVisualGroup =
  | "principal"
  | "dominant"
  | "visible"
  | "secondary"
  | "complementary";

export interface LogoProminenceDefinition {
  level: LogoProminenceLevel;
  label: string;
  description: string;
  visualGroup: LogoVisualGroup;
}

const DEFINITIONS: Record<LogoProminenceLevel, LogoProminenceDefinition> = {
  1: {
    level: 1,
    label: "Minimal",
    description: "Présence minimale, selon l’espace restant disponible.",
    visualGroup: "complementary",
  },
  2: {
    level: 2,
    label: "Très discret",
    description: "Petite taille, utilisé comme logo complémentaire.",
    visualGroup: "complementary",
  },
  3: {
    level: 3,
    label: "Discret",
    description: "Présent mais volontairement peu mis en avant.",
    visualGroup: "complementary",
  },
  4: {
    level: 4,
    label: "Secondaire",
    description: "Taille modérée, placé dans une zone moins centrale.",
    visualGroup: "secondary",
  },
  5: {
    level: 5,
    label: "Équilibré",
    description: "Présence moyenne, intégrée naturellement dans la composition.",
    visualGroup: "secondary",
  },
  6: {
    level: 6,
    label: "Très visible",
    description: "Logo clairement identifiable sans dominer le design.",
    visualGroup: "visible",
  },
  7: {
    level: 7,
    label: "Prioritaire",
    description: "Bien visible sur une zone principale ou secondaire importante.",
    visualGroup: "visible",
  },
  8: {
    level: 8,
    label: "Très prioritaire",
    description: "Placé dans une zone importante avec une taille élevée.",
    visualGroup: "dominant",
  },
  9: {
    level: 9,
    label: "Dominant",
    description: "Très fortement visible, juste après le logo principal.",
    visualGroup: "dominant",
  },
  10: {
    level: 10,
    label: "Logo principal",
    description:
      "Le logo le plus mis en avant sur le kit. Zone prioritaire et grande taille.",
    visualGroup: "principal",
  },
};

export function clampProminenceLevel(value: number): LogoProminenceLevel {
  const rounded = Math.round(value);
  if (rounded < 1) return 1;
  if (rounded > 10) return 10;
  return rounded as LogoProminenceLevel;
}

export function getLogoProminenceDefinition(
  level: number,
): LogoProminenceDefinition {
  return DEFINITIONS[clampProminenceLevel(level)];
}

export function sortLogosByProminence<
  T extends { prominenceLevel: number; addedAt: number },
>(logos: T[]): T[] {
  return [...logos].sort((a, b) => {
    if (b.prominenceLevel !== a.prominenceLevel) {
      return b.prominenceLevel - a.prominenceLevel;
    }
    return a.addedAt - b.addedAt;
  });
}

/** Simulated visual scale for local preview only. */
export function getSimulatedLogoScale(level: number): number {
  const clamped = clampProminenceLevel(level);
  if (clamped === 10) return 1;
  if (clamped >= 8) return 0.85;
  if (clamped >= 6) return 0.7;
  if (clamped >= 4) return 0.55;
  return 0.4;
}
