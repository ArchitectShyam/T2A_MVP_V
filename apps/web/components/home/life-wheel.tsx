import { cn } from "@/lib/utils";

/**
 * The twelve life areas rendered around the wheel, in clockwise order starting
 * just right of the top. Each area has a base colour; the three concentric
 * bands are drawn as increasingly saturated shades of that colour.
 */
const CATEGORIES = [
  { name: "Skills", color: "#cf7f5f" },
  { name: "Profession", color: "#c1623a" },
  { name: "Wealth", color: "#a9412a" },
  { name: "Health", color: "#8fa768" },
  { name: "Mind", color: "#7f9a58" },
  { name: "Nutrition", color: "#a7bb84" },
  { name: "Creativity", color: "#d8c07f" },
  { name: "Adventures", color: "#c6a748" },
  { name: "Spirituality", color: "#b08f2e" },
  { name: "Intimacy", color: "#cd8fa4" },
  { name: "Family", color: "#a55e78" },
  { name: "Connects", color: "#d8b2c3" },
] as const;

// Geometry (all in the 520x520 viewBox coordinate space).
const SIZE = 520;
const C = SIZE / 2;
const HOLE = 60;
const RINGS = [116, 168, 210] as const; // outer radius of each band
const LABEL_R = 228;
const GAP = 1.2; // angular gap (deg) between segments for the thin separators
const SEG = 360 / CATEGORIES.length; // 30deg per segment
const BAND_OPACITY = [0.42, 0.68, 0.95] as const;

/** Convert a polar coordinate (angle clockwise from the top) to SVG x/y. */
function polar(r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: C + r * Math.sin(rad), y: C - r * Math.cos(rad) };
}

/** Build an annular-sector path between two radii and two angles. */
function sector(rInner: number, rOuter: number, a0: number, a1: number) {
  const p1 = polar(rOuter, a0);
  const p2 = polar(rOuter, a1);
  const p3 = polar(rInner, a1);
  const p4 = polar(rInner, a0);
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rOuter} ${rOuter} 0 0 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rInner} ${rInner} 0 0 0 ${p4.x} ${p4.y}`,
    "Z",
  ].join(" ");
}

export interface LifeWheelProps {
  className?: string;
}

/**
 * The "Your wheel" life-balance visual: twelve segments, each split into three
 * concentric bands. Pure SVG — no chart dependency.
 */
export function LifeWheel({ className }: LifeWheelProps) {
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label="Your life balance wheel across twelve areas"
      className={cn("h-auto w-full max-w-[520px]", className)}
    >
      {CATEGORIES.map((cat, i) => {
        const a0 = i * SEG + GAP / 2;
        const a1 = (i + 1) * SEG - GAP / 2;
        const mid = i * SEG + SEG / 2;

        // Label orientation: keep text upright on the bottom half.
        const rotate = mid > 90 && mid < 270 ? mid - 180 : mid;
        const label = polar(LABEL_R, mid);

        return (
          <g key={cat.name}>
            {RINGS.map((rOuter, band) => {
              const rInner = band === 0 ? HOLE : RINGS[band - 1]!;
              return (
                <path
                  key={band}
                  d={sector(rInner, rOuter, a0, a1)}
                  fill={cat.color}
                  fillOpacity={BAND_OPACITY[band]}
                  stroke="#f5efe3"
                  strokeWidth={2}
                />
              );
            })}
            <text
              x={label.x}
              y={label.y}
              transform={`rotate(${rotate} ${label.x} ${label.y})`}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-[#6f6152] italic"
              style={{ fontSize: 15 }}
            >
              {cat.name}
            </text>
          </g>
        );
      })}

      {/* Center hub */}
      <circle cx={C} cy={C} r={HOLE - 4} fill="#fbf8f1" />
      <text
        x={C}
        y={C}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-[#6f6152]"
        style={{ fontSize: 18 }}
      >
        Your wheel
      </text>
    </svg>
  );
}
