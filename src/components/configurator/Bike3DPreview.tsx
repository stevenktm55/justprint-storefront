"use client";

import type { ConfiguratorState, PreviewView, SelectedLogo } from "@/types/configurator";
import {
  getSimulatedLogoScale,
  sortLogosByProminence,
} from "@/lib/logo-prominence";

function getPalette(state: ConfiguratorState) {
  const byId = Object.fromEntries(state.palette.map((c) => [c.id, c.hex]));
  return {
    primary: byId.primary ?? "#FF5A00",
    secondary: byId.secondary ?? "#111111",
    tertiary: byId.tertiary ?? "#FFFFFF",
    accent: byId.accent ?? "#0066FF",
  };
}

function SimulatedLogos({
  logos,
  secondary,
  tertiary,
  layout,
}: {
  logos: SelectedLogo[];
  secondary: string;
  tertiary: string;
  layout: "side" | "top";
}) {
  const sorted = sortLogosByProminence(logos).slice(0, 5);

  if (layout === "top") {
    const positioned = sorted.reduce<
      {
        logo: SelectedLogo;
        scale: number;
        width: number;
        height: number;
        x: number;
      }[]
    >((acc, logo) => {
      const scale = getSimulatedLogoScale(logo.prominenceLevel);
      const width = 28 + scale * 28;
      const height = 8 + scale * 6;
      const previous = acc[acc.length - 1];
      const x = previous ? previous.x + previous.width + 6 : 120;
      return [...acc, { logo, scale, width, height, x }];
    }, []);

    return (
      <g>
        {positioned.map(({ logo, scale, width, height, x }) => (
          <g key={logo.id} transform={`translate(${x}, 158)`}>
            <rect
              width={width}
              height={height}
              rx="2"
              fill={logo.prominenceLevel >= 8 ? tertiary : secondary}
              opacity={0.5 + scale * 0.5}
            />
            <text
              x={width / 2}
              y={height * 0.72}
              textAnchor="middle"
              fontSize={4 + scale * 3}
              fontWeight="700"
              fontFamily="Barlow, sans-serif"
              fill={logo.prominenceLevel >= 8 ? secondary : tertiary}
            >
              {logo.name.slice(0, 8).toUpperCase()}
            </text>
          </g>
        ))}
      </g>
    );
  }

  // Side view: principal near plate, others along the panel
  return (
    <g>
      {sorted.map((logo, index) => {
        const scale = getSimulatedLogoScale(logo.prominenceLevel);
        const width = 30 + scale * 34;
        const height = 9 + scale * 8;
        const isPrincipal = logo.prominenceLevel === 10;
        const x = isPrincipal
          ? 148
          : 118 + (index % 3) * (36 + scale * 8);
        const y = isPrincipal
          ? 168
          : logo.prominenceLevel >= 8
            ? 175
            : logo.prominenceLevel >= 6
              ? 182
              : 188;

        return (
          <g key={logo.id} transform={`translate(${x}, ${y})`}>
            <rect
              width={width}
              height={height}
              rx="2"
              fill={logo.prominenceLevel >= 6 ? tertiary : secondary}
              opacity={0.55 + scale * 0.45}
            />
            <text
              x={width / 2}
              y={height * 0.72}
              textAnchor="middle"
              fontSize={4.5 + scale * 4}
              fontWeight="700"
              fontFamily="Barlow, sans-serif"
              fill={logo.prominenceLevel >= 6 ? secondary : tertiary}
            >
              {logo.name.slice(0, isPrincipal ? 10 : 8).toUpperCase()}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function MotocrossSvg({
  view,
  primary,
  secondary,
  tertiary,
  accent,
  plateColor,
  numberColor,
  nameColor,
  raceNumber,
  riderName,
  logos,
}: {
  view: PreviewView;
  primary: string;
  secondary: string;
  tertiary: string;
  accent: string;
  plateColor: string;
  numberColor: string;
  nameColor: string;
  raceNumber: string;
  riderName: string;
  logos: SelectedLogo[];
}) {
  if (view === "top") {
    return (
      <svg
        viewBox="0 0 360 240"
        className="h-full w-full"
        role="img"
        aria-label="Aperçu moto vue dessus"
      >
        <defs>
          <linearGradient id="studio-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f7f7f5" />
            <stop offset="100%" stopColor="#e8e8e4" />
          </linearGradient>
        </defs>
        <rect width="360" height="240" fill="url(#studio-top)" />
        <ellipse cx="180" cy="200" rx="110" ry="12" fill="#d9d9d4" opacity="0.65" />

        <ellipse cx="95" cy="120" rx="34" ry="48" fill={secondary} />
        <ellipse cx="265" cy="120" rx="34" ry="48" fill={secondary} />
        <rect x="110" y="95" width="140" height="50" rx="18" fill={primary} />
        <path d="M150 95 L210 70 L250 95 L210 118 Z" fill={accent} />
        <rect
          x="155"
          y="108"
          width="50"
          height="24"
          rx="3"
          fill={plateColor}
          stroke={secondary}
          strokeWidth="1.5"
        />
        <text
          x="180"
          y="125"
          textAnchor="middle"
          fontSize="14"
          fontWeight="800"
          fontFamily="Barlow Condensed, sans-serif"
          fill={numberColor}
        >
          {raceNumber || "00"}
        </text>
        <text
          x="180"
          y="150"
          textAnchor="middle"
          fontSize="8"
          fontWeight="700"
          fontFamily="Barlow Condensed, sans-serif"
          fill={nameColor}
          letterSpacing="1"
        >
          {(riderName || "PILOTE").toUpperCase().slice(0, 12)}
        </text>
        <SimulatedLogos
          logos={logos}
          secondary={secondary}
          tertiary={tertiary}
          layout="top"
        />
      </svg>
    );
  }

  const offset =
    view === "left" ? 0 : view === "front" ? 18 : view === "right" ? -18 : 0;

  return (
    <svg
      viewBox="0 0 360 240"
      className="h-full w-full"
      role="img"
      aria-label={`Aperçu moto vue ${view}`}
    >
      <defs>
        <linearGradient id="studio" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f7f7f5" />
          <stop offset="100%" stopColor="#e8e8e4" />
        </linearGradient>
      </defs>

      <rect width="360" height="240" fill="url(#studio)" />
      <ellipse cx="180" cy="210" rx="120" ry="10" fill="#d9d9d4" opacity="0.7" />

      <g transform={`translate(${offset},0)`}>
        <circle cx="95" cy="175" r="38" fill={secondary} />
        <circle cx="95" cy="175" r="22" fill="#333" />
        <circle cx="95" cy="175" r="8" fill="#888" />
        <circle cx="265" cy="175" r="38" fill={secondary} />
        <circle cx="265" cy="175" r="22" fill="#333" />
        <circle cx="265" cy="175" r="8" fill="#888" />

        <path
          d="M120 145 L170 95 L230 100 L250 140 L210 155 L150 160 Z"
          fill={primary}
        />
        <path d="M170 95 L210 70 L240 78 L230 100 Z" fill={accent} />
        <path d="M150 160 L210 155 L220 175 L145 178 Z" fill={secondary} />
        <path
          d="M210 70 L250 55 L270 95 L240 100 Z"
          fill={tertiary}
          stroke={secondary}
          strokeWidth="1"
        />

        <path d="M155 92 L205 78 L215 88 L165 105 Z" fill={secondary} />
        <path d="M250 120 L290 115 L300 145 L275 150 Z" fill={primary} />

        <rect
          x="195"
          y="108"
          width="48"
          height="36"
          rx="3"
          fill={plateColor}
          stroke={secondary}
          strokeWidth="1.5"
        />
        <text
          x="219"
          y="133"
          textAnchor="middle"
          fontSize="20"
          fontWeight="800"
          fontFamily="Barlow Condensed, sans-serif"
          fill={numberColor}
        >
          {raceNumber || "00"}
        </text>

        <text
          x="165"
          y="148"
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          fontFamily="Barlow Condensed, sans-serif"
          fill={nameColor}
          letterSpacing="1"
        >
          {(riderName || "PILOTE").toUpperCase().slice(0, 12)}
        </text>

        <path
          d="M130 150 L175 110 L185 115 L145 155 Z"
          fill={accent}
          opacity="0.85"
        />

        <SimulatedLogos
          logos={logos}
          secondary={secondary}
          tertiary={tertiary}
          layout="side"
        />

        {view === "front" ? (
          <>
            <rect x="250" y="50" width="40" height="6" rx="2" fill={secondary} />
            <line
              x1="270"
              y1="56"
              x2="270"
              y2="115"
              stroke={secondary}
              strokeWidth="4"
            />
          </>
        ) : null}
        {view === "right" ? (
          <path
            d="M250 55 L310 90 L300 100 L245 70 Z"
            fill={primary}
            opacity="0.5"
          />
        ) : null}
      </g>
    </svg>
  );
}

interface Bike3DPreviewProps {
  state: ConfiguratorState;
  compact?: boolean;
  fillHeight?: boolean;
  showBadge?: boolean;
}

export function Bike3DPreview({
  state,
  compact = false,
  fillHeight = false,
  showBadge = true,
}: Bike3DPreviewProps) {
  const colors = getPalette(state);

  return (
    <div
      className={`relative overflow-hidden bg-[var(--rm-surface)] ${
        fillHeight
          ? "h-full w-full"
          : `rounded-[var(--rm-radius)] border border-[var(--rm-border)] ${
              compact ? "aspect-[16/10]" : "aspect-[3/2] sm:aspect-[16/10]"
            }`
      }`}
    >
      <MotocrossSvg
        view={state.previewView}
        primary={colors.primary}
        secondary={colors.secondary}
        tertiary={colors.tertiary}
        accent={colors.accent}
        plateColor={state.plateColor}
        numberColor={state.numberColor}
        nameColor={state.nameColor}
        raceNumber={state.raceNumber}
        riderName={state.riderName}
        logos={state.selectedLogos}
      />
      {showBadge ? (
        <span className="absolute right-2 top-2 rounded-[var(--rm-radius-sm)] bg-black/70 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          Aperçu 3D
        </span>
      ) : null}
    </div>
  );
}
