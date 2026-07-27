"use client";

import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Minus, Plus, X } from "lucide-react";
import type { ConfiguratorState, SelectedLogo } from "@/types/configurator";
import {
  getSimulatedLogoScale,
  sortLogosByProminence,
} from "@/lib/logo-prominence";

export type KitPieceId =
  | "front-plate"
  | "front-fender"
  | "shroud-left"
  | "shroud-right"
  | "side-left"
  | "side-right"
  | "rear-fender"
  | "swingarm-left"
  | "swingarm-right";

export const KIT_PIECES: { id: KitPieceId; label: string }[] = [
  { id: "front-plate", label: "Plaque avant" },
  { id: "front-fender", label: "Garde-boue avant" },
  { id: "shroud-left", label: "Ouïe gauche" },
  { id: "shroud-right", label: "Ouïe droite" },
  { id: "side-left", label: "Plaque latérale gauche" },
  { id: "side-right", label: "Plaque latérale droite" },
  { id: "rear-fender", label: "Garde-boue arrière" },
  { id: "swingarm-left", label: "Bras oscillant gauche" },
  { id: "swingarm-right", label: "Bras oscillant droit" },
];

const COMPACT_PIECE_IDS: KitPieceId[] = [
  "front-plate",
  "shroud-left",
  "shroud-right",
  "side-left",
];

const PIECE_VIEWBOX: Record<KitPieceId, string> = {
  "front-plate": "145 5 110 90",
  "front-fender": "30 5 110 70",
  "shroud-left": "10 90 95 100",
  "shroud-right": "290 90 95 100",
  "side-left": "20 190 130 120",
  "side-right": "250 190 130 120",
  "rear-fender": "140 295 120 80",
  "swingarm-left": "30 365 150 80",
  "swingarm-right": "230 365 150 80",
};

function getPalette(state: ConfiguratorState) {
  const byId = Object.fromEntries(state.palette.map((c) => [c.id, c.hex]));
  return {
    primary: byId.primary ?? "#FF5A00",
    secondary: byId.secondary ?? "#111111",
    tertiary: byId.tertiary ?? "#FFFFFF",
    accent: byId.accent ?? "#0066FF",
  };
}

function PieceLogos({
  logos,
  x,
  y,
  max,
  secondary,
  tertiary,
}: {
  logos: SelectedLogo[];
  x: number;
  y: number;
  max: number;
  secondary: string;
  tertiary: string;
}) {
  const sorted = sortLogosByProminence(logos).slice(0, max);

  return (
    <g>
      {sorted.map((logo, index) => {
        const scale = getSimulatedLogoScale(logo.prominenceLevel);
        const width = 18 + scale * 22;
        const height = 6 + scale * 5;
        return (
          <g
            key={logo.id}
            transform={`translate(${x + index * (width * 0.35)}, ${y + index * 8})`}
          >
            <rect
              width={width}
              height={height}
              rx="1.5"
              fill={logo.prominenceLevel >= 7 ? tertiary : secondary}
              opacity={0.55 + scale * 0.45}
            />
            <text
              x={width / 2}
              y={height * 0.75}
              textAnchor="middle"
              fontSize={3.5 + scale * 2.5}
              fontWeight="700"
              fontFamily="Barlow, sans-serif"
              fill={logo.prominenceLevel >= 7 ? secondary : tertiary}
            >
              {logo.name.slice(0, 7).toUpperCase()}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function KitPieceShape({
  pieceId,
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
  selected,
  onSelect,
}: {
  pieceId: KitPieceId;
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
  selected?: boolean;
  onSelect?: (id: KitPieceId) => void;
}) {
  const interactive = Boolean(onSelect);
  const ring = selected ? secondary : "transparent";

  const common = {
    role: interactive ? ("button" as const) : undefined,
    tabIndex: interactive ? 0 : undefined,
    onClick: interactive ? () => onSelect?.(pieceId) : undefined,
    onKeyDown: interactive
      ? (event: KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect?.(pieceId);
          }
        }
      : undefined,
    style: interactive ? { cursor: "pointer" } : undefined,
  };

  switch (pieceId) {
    case "front-plate":
      return (
        <g transform="translate(150, 12)" {...common}>
          <rect
            width="100"
            height="70"
            rx="6"
            fill={plateColor}
            stroke={ring}
            strokeWidth="2"
          />
          <rect x="8" y="8" width="84" height="54" rx="4" fill={primary} opacity="0.15" />
          <text
            x="50"
            y="42"
            textAnchor="middle"
            fontSize="28"
            fontWeight="800"
            fontFamily="Barlow Condensed, sans-serif"
            fill={numberColor}
          >
            {raceNumber || "00"}
          </text>
          <text
            x="50"
            y="58"
            textAnchor="middle"
            fontSize="7"
            fontWeight="700"
            fontFamily="Barlow Condensed, sans-serif"
            fill={nameColor}
            letterSpacing="1"
          >
            {(riderName || "PILOTE").toUpperCase().slice(0, 10)}
          </text>
          <PieceLogos
            logos={logos}
            x={8}
            y={8}
            max={2}
            secondary={secondary}
            tertiary={tertiary}
          />
        </g>
      );
    case "front-fender":
      return (
        <g transform="translate(40, 20)" {...common}>
          <path
            d="M10 40 Q50 8 90 40 L85 52 Q50 28 15 52 Z"
            fill={primary}
            stroke={ring}
            strokeWidth="2"
          />
          <path d="M20 38 Q50 18 80 38" fill="none" stroke={accent} strokeWidth="4" />
          <PieceLogos
            logos={logos}
            x={28}
            y={30}
            max={1}
            secondary={secondary}
            tertiary={tertiary}
          />
        </g>
      );
    case "shroud-left":
      return (
        <g transform="translate(20, 100)" {...common}>
          <path
            d="M8 10 L70 4 L78 70 L12 78 Z"
            fill={primary}
            stroke={ring}
            strokeWidth="2"
          />
          <path d="M20 20 L60 16 L64 50 L24 54 Z" fill={accent} opacity="0.85" />
          <PieceLogos
            logos={logos}
            x={18}
            y={22}
            max={2}
            secondary={secondary}
            tertiary={tertiary}
          />
        </g>
      );
    case "shroud-right":
      return (
        <g transform="translate(300, 100)" {...common}>
          <path
            d="M72 10 L10 4 L2 70 L68 78 Z"
            fill={primary}
            stroke={ring}
            strokeWidth="2"
          />
          <path d="M60 20 L20 16 L16 50 L56 54 Z" fill={accent} opacity="0.85" />
          <PieceLogos
            logos={logos}
            x={18}
            y={22}
            max={2}
            secondary={secondary}
            tertiary={tertiary}
          />
        </g>
      );
    case "side-left":
      return (
        <g transform="translate(30, 200)" {...common}>
          <path
            d="M10 20 L95 8 L108 85 L18 95 Z"
            fill={secondary}
            stroke={ring}
            strokeWidth="2"
          />
          <rect x="28" y="28" width="52" height="40" rx="3" fill={plateColor} />
          <text
            x="54"
            y="55"
            textAnchor="middle"
            fontSize="20"
            fontWeight="800"
            fontFamily="Barlow Condensed, sans-serif"
            fill={numberColor}
          >
            {raceNumber || "00"}
          </text>
          <PieceLogos
            logos={logos}
            x={24}
            y={72}
            max={2}
            secondary={tertiary}
            tertiary={primary}
          />
        </g>
      );
    case "side-right":
      return (
        <g transform="translate(260, 200)" {...common}>
          <path
            d="M108 20 L23 8 L10 85 L100 95 Z"
            fill={secondary}
            stroke={ring}
            strokeWidth="2"
          />
          <rect x="38" y="28" width="52" height="40" rx="3" fill={plateColor} />
          <text
            x="64"
            y="55"
            textAnchor="middle"
            fontSize="20"
            fontWeight="800"
            fontFamily="Barlow Condensed, sans-serif"
            fill={numberColor}
          >
            {raceNumber || "00"}
          </text>
          <PieceLogos
            logos={logos}
            x={30}
            y={72}
            max={2}
            secondary={tertiary}
            tertiary={primary}
          />
        </g>
      );
    case "rear-fender":
      return (
        <g transform="translate(150, 310)" {...common}>
          <path
            d="M10 30 Q50 4 90 30 L85 48 Q50 28 15 48 Z"
            fill={primary}
            stroke={ring}
            strokeWidth="2"
          />
          <text
            x="50"
            y="38"
            textAnchor="middle"
            fontSize="7"
            fontWeight="700"
            fontFamily="Barlow Condensed, sans-serif"
            fill={nameColor}
            letterSpacing="1"
          >
            {(riderName || "PILOTE").toUpperCase().slice(0, 10)}
          </text>
          <PieceLogos
            logos={logos}
            x={22}
            y={18}
            max={1}
            secondary={secondary}
            tertiary={tertiary}
          />
        </g>
      );
    case "swingarm-left":
      return (
        <g transform="translate(40, 380)" {...common}>
          <path
            d="M8 18 L120 8 L128 38 L16 48 Z"
            fill={secondary}
            stroke={ring}
            strokeWidth="2"
          />
          <path d="M20 22 L110 14" stroke={accent} strokeWidth="3" />
          <PieceLogos
            logos={logos}
            x={30}
            y={18}
            max={1}
            secondary={tertiary}
            tertiary={primary}
          />
        </g>
      );
    case "swingarm-right":
      return (
        <g transform="translate(240, 380)" {...common}>
          <path
            d="M128 18 L16 8 L8 38 L120 48 Z"
            fill={secondary}
            stroke={ring}
            strokeWidth="2"
          />
          <path d="M110 22 L20 14" stroke={accent} strokeWidth="3" />
          <PieceLogos
            logos={logos}
            x={30}
            y={18}
            max={1}
            secondary={tertiary}
            tertiary={primary}
          />
        </g>
      );
    default:
      return null;
  }
}

interface Kit2DPreviewProps {
  state: ConfiguratorState;
  compact?: boolean;
  fillHeight?: boolean;
  showBadge?: boolean;
  interactive?: boolean;
}

export function Kit2DPreview({
  state,
  compact = false,
  fillHeight = false,
  showBadge = true,
  interactive = false,
}: Kit2DPreviewProps) {
  const colors = getPalette(state);
  const [selectedPiece, setSelectedPiece] = useState<KitPieceId | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  const pieceIds = compact ? COMPACT_PIECE_IDS : KIT_PIECES.map((p) => p.id);
  const canInteract = interactive && !compact;

  const closePiece = useCallback(() => {
    setSelectedPiece(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const onPointerDown = (event: PointerEvent) => {
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    };
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!dragRef.current.active) return;
    setPan({
      x: dragRef.current.originX + (event.clientX - dragRef.current.startX),
      y: dragRef.current.originY + (event.clientY - dragRef.current.startY),
    });
  };

  const onPointerUp = () => {
    dragRef.current.active = false;
  };

  const renderKit = (
    ids: KitPieceId[],
    options?: {
      onSelect?: (id: KitPieceId) => void;
      selectedId?: KitPieceId | null;
      viewBox?: string;
    },
  ) => (
    <svg
      viewBox={options?.viewBox ?? (compact ? "0 0 400 320" : "0 0 400 460")}
      className="h-full w-full"
      role="img"
      aria-label="Aperçu kit déco 2D"
    >
      <rect width="400" height="460" fill="#f4f4f1" />
      {ids.map((pieceId) => (
        <KitPieceShape
          key={pieceId}
          pieceId={pieceId}
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
          selected={options?.selectedId === pieceId}
          onSelect={options?.onSelect}
        />
      ))}
    </svg>
  );

  return (
    <div
      className={`relative overflow-hidden bg-[var(--rm-surface)] ${
        fillHeight
          ? "h-full w-full"
          : `rounded-[var(--rm-radius)] border border-[var(--rm-border)] ${
              compact ? "aspect-[16/10]" : "aspect-[3/4] sm:aspect-[4/5]"
            }`
      }`}
    >
      {renderKit(pieceIds, {
        onSelect: canInteract ? setSelectedPiece : undefined,
        selectedId: selectedPiece,
        viewBox: compact ? "20 0 360 300" : "0 0 400 460",
      })}

      {showBadge ? (
        <span className="absolute right-2 top-2 rounded-[var(--rm-radius-sm)] bg-black/70 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          Aperçu 2D
        </span>
      ) : null}

      {canInteract && !selectedPiece ? (
        <p className="pointer-events-none absolute bottom-2 left-2 right-2 rounded-[var(--rm-radius-sm)] bg-black/55 px-2 py-1.5 text-center text-[10px] font-semibold text-white">
          Vue générale · Touche une pièce pour l’agrandir
        </p>
      ) : null}

      {selectedPiece ? (
        <div className="absolute inset-0 z-10 flex flex-col bg-[var(--rm-bg)]">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--rm-border)] px-3 py-2">
            <p className="text-sm font-bold">
              {KIT_PIECES.find((p) => p.id === selectedPiece)?.label}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--rm-radius-sm)] border border-[var(--rm-border)] bg-[var(--rm-surface)]"
                onClick={() => setZoom((z) => Math.max(1, Number((z - 0.25).toFixed(2))))}
                aria-label="Zoom arrière"
              >
                <Minus size={16} />
              </button>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--rm-radius-sm)] border border-[var(--rm-border)] bg-[var(--rm-surface)]"
                onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                aria-label="Zoom avant"
              >
                <Plus size={16} />
              </button>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1 rounded-[var(--rm-radius-sm)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2 text-xs font-semibold"
                onClick={closePiece}
              >
                Voir le kit complet
              </button>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--rm-radius-sm)] border border-[var(--rm-border)] bg-[var(--rm-surface)]"
                onClick={closePiece}
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div
            className="relative min-h-0 flex-1 touch-none overflow-hidden bg-[#f4f4f1]"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center center",
              }}
            >
              <div className="h-[85%] w-[85%]">
                {renderKit([selectedPiece], {
                  viewBox: PIECE_VIEWBOX[selectedPiece],
                })}
              </div>
            </div>
            <p className="pointer-events-none absolute bottom-2 left-2 right-2 text-center text-[10px] font-semibold text-[var(--rm-text-muted)]">
              Pince ou glisse pour déplacer · Zoom {Math.round(zoom * 100)}%
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
