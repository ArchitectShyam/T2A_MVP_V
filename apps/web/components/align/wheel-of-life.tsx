"use client";

import { DIMENSIONS } from "@lifeos/contracts";
import { useEffect, useRef, useState } from "react";

/**
 * Wheel of Life — a dual-ring sunburst: 4 dimension wedges (90° each) with 3
 * domain sub-wedges (30° each). Reusable across Align (goal execution) and Home
 * (activity) via the `encoding` object, which decouples the geometry from the
 * data source.
 *
 * All coordinates are rounded to 3 decimals so server- and client-rendered SVG
 * match exactly (avoids hydration mismatch). Rotation is applied via a CSS
 * transform on the rotating group, so it never affects path geometry.
 */

const CENTER = 160;
const INNER_R0 = 44;
const INNER_R1 = 90;
const OUTER_R0 = 114;
const OUTER_R1 = 152;
const LABEL_R = 161;
const GAP = 1; // degrees between wedges
const ROTATE_MS = 575;
const PULSE_MS = 100;

const BAND_SLOTS = 5;
const BAND_GAP = 1.5;
const DOT_ROWS = 3; // ROWS_PER_COL
const DOT_R = 4;

const CREAM = "#FAF6EF";
const HAIRLINE = "#E4DAC8";
const INK = "#3A342C";

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Point at radius `r` and `angle` degrees, measured clockwise from 12 o'clock. */
function polar(r: number, angle: number): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180;
  return { x: r3(CENTER + r * Math.sin(rad)), y: r3(CENTER - r * Math.cos(rad)) };
}

/** Annular sector (ring segment) from innerR..outerR spanning [a0, a1]. */
function annularSector(innerR: number, outerR: number, a0: number, a1: number): string {
  const large = a1 - a0 > 180 ? 1 : 0;
  const p1 = polar(innerR, a0);
  const p2 = polar(outerR, a0);
  const p3 = polar(outerR, a1);
  const p4 = polar(innerR, a1);
  return [
    `M ${p2.x} ${p2.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${p3.x} ${p3.y}`,
    `L ${p4.x} ${p4.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${p1.x} ${p1.y}`,
    "Z",
  ].join(" ");
}

/** Curved arc for a wedge label, reversed on the bottom half so it never reads
 * upside-down. `flip` is computed from the wedge's on-screen angle. */
function labelArc(a0: number, a1: number, flip: boolean): string {
  const large = a1 - a0 > 180 ? 1 : 0;
  if (flip) {
    const s = polar(LABEL_R, a1);
    const e = polar(LABEL_R, a0);
    return `M ${s.x} ${s.y} A ${LABEL_R} ${LABEL_R} 0 ${large} 0 ${e.x} ${e.y}`;
  }
  const s = polar(LABEL_R, a0);
  const e = polar(LABEL_R, a1);
  return `M ${s.x} ${s.y} A ${LABEL_R} ${LABEL_R} 0 ${large} 1 ${e.x} ${e.y}`;
}

function heartbeat(el: Element | null): void {
  el?.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.03)" }, { transform: "scale(1)" }],
    { duration: PULSE_MS, easing: "ease-out" },
  );
}

// ---------------------------------------------------------------------------
// Encoding: lets the same wheel encode different sources.
// ---------------------------------------------------------------------------
export interface WheelEncoding {
  dimensionValue(dimKey: string): number;
  domainValue(domainKey: string): number;
  domainActive(domainKey: string): boolean;
  /** Inner-ring gauges, fixed 0..1 scale. */
  domainAlignment?(domainKey: string): number | null;
  /** Outer-ring markers — one dot per summit. */
  domainSummits?(domainKey: string): Array<{ active: boolean }>;
}

export interface WheelOfLifeProps {
  encoding: WheelEncoding;
  encodingMode?: "summitCount" | "activity";
  fillOpacity?: number;
  centerLabel?: string;
  /** Currently selected dimension or domain key (drives highlight + rotation). */
  selectedKey?: string | null;
  selectedStroke?: string;
  rotatable?: boolean;
  onSelectDimension: (dimensionKey: string) => void;
  onSelectDomain: (domainKey: string, dimensionKey: string) => void;
  onSelectCenter?: () => void;
}

// Geometry per dimension / domain -------------------------------------------
function dimensionAngles(i: number): { a0: number; a1: number; center: number } {
  const start = i * 90;
  return { a0: start + GAP / 2, a1: start + 90 - GAP / 2, center: start + 45 };
}

function domainAngles(i: number, j: number): { a0: number; a1: number; center: number } {
  const start = i * 90 + j * 30;
  return { a0: start + GAP / 2, a1: start + 30 - GAP / 2, center: start + 15 };
}

/** Center angle (deg) of a dimension- or domain-key, or null if unknown. */
function centerOfKey(key: string | null | undefined): number | null {
  if (!key) return null;
  for (let i = 0; i < DIMENSIONS.length; i++) {
    const dim = DIMENSIONS[i];
    if (!dim) continue;
    if (dim.key === key) return dimensionAngles(i).center;
    for (let j = 0; j < dim.domains.length; j++) {
      const dom = dim.domains[j];
      if (dom && dom.key === key) return domainAngles(i, j).center;
    }
  }
  return null;
}

export function WheelOfLife({
  encoding,
  encodingMode = "summitCount",
  fillOpacity = 1,
  centerLabel = "Life",
  selectedKey,
  selectedStroke,
  rotatable = false,
  onSelectDimension,
  onSelectDomain,
  onSelectCenter,
}: WheelOfLifeProps) {
  const [rotation, setRotation] = useState(0);
  const groupRef = useRef<SVGGElement | null>(null);

  // Keep rotation in sync with the externally-controlled selection.
  useEffect(() => {
    if (!rotatable) return;
    const center = centerOfKey(selectedKey);
    setRotation(center == null ? 0 : 90 - center);
  }, [selectedKey, rotatable]);

  function pulse() {
    heartbeat(groupRef.current);
  }

  function handleDimension(key: string) {
    if (rotatable) pulse();
    onSelectDimension(key);
  }

  function handleDomain(domainKey: string, dimensionKey: string) {
    if (rotatable) pulse();
    onSelectDomain(domainKey, dimensionKey);
  }

  const bandSlot = (INNER_R1 - INNER_R0) / BAND_SLOTS;
  const bandThickness = Math.max(1, bandSlot - BAND_GAP);

  return (
    <svg
      viewBox="-12 -12 361 344"
      className="h-[340px] w-[340px] max-w-full select-none"
      role="img"
      aria-label="Wheel of life"
    >
      <g
        ref={groupRef}
        style={{
          transform: `rotate(${rotation}deg)`,
          transformOrigin: "160px 160px",
          transformBox: "view-box",
          transition: `transform ${ROTATE_MS}ms ease`,
        }}
      >
        {DIMENSIONS.map((dim, i) => {
          const dimAng = dimensionAngles(i);
          const dimSelected = selectedKey === dim.key;

          return (
            <g key={dim.key}>
              {/* Inner-ring dimension background = click target -> select dimension */}
              <path
                d={annularSector(INNER_R0, INNER_R1, dimAng.a0, dimAng.a1)}
                fill={dim.color}
                fillOpacity={dimSelected ? 0.28 : 0.14}
                stroke={dimSelected ? (selectedStroke ?? dim.color) : "none"}
                strokeWidth={dimSelected ? 1 : 0}
                className="cursor-pointer transition-[fill-opacity]"
                onClick={() => handleDimension(dim.key)}
              />

              {/* Inner-ring gauges / activity fill */}
              {dim.domains.map((dom, j) => {
                const domAng = domainAngles(i, j);

                if (encoding.domainAlignment) {
                  const score = encoding.domainAlignment(dom.key);
                  if (score == null || score <= 0) return null;
                  const fillHeight = Math.min(1, score) * (INNER_R1 - INNER_R0);
                  return (
                    <g key={dom.key} style={{ pointerEvents: "none" }}>
                      {Array.from({ length: BAND_SLOTS }).map((_, k) => {
                        const bandStart = k * bandSlot;
                        if (bandStart >= fillHeight) return null;
                        const bandEnd = Math.min(bandStart + bandThickness, fillHeight);
                        if (bandEnd <= bandStart) return null;
                        return (
                          <path
                            key={k}
                            d={annularSector(
                              INNER_R0 + bandStart,
                              INNER_R0 + bandEnd,
                              domAng.a0,
                              domAng.a1,
                            )}
                            fill={dom.color}
                            fillOpacity={fillOpacity}
                          />
                        );
                      })}
                    </g>
                  );
                }

                // Activity fallback: continuous fill by domain value (0..1).
                if (encodingMode === "activity") {
                  const v = Math.max(0, Math.min(1, encoding.domainValue(dom.key)));
                  if (v <= 0) return null;
                  return (
                    <path
                      key={dom.key}
                      d={annularSector(
                        INNER_R0,
                        INNER_R0 + v * (INNER_R1 - INNER_R0),
                        domAng.a0,
                        domAng.a1,
                      )}
                      fill={dom.color}
                      fillOpacity={fillOpacity}
                      style={{ pointerEvents: "none" }}
                    />
                  );
                }
                return null;
              })}

              {/* Outer ring — one wedge per domain (click target -> select domain) */}
              {dim.domains.map((dom, j) => {
                const domAng = domainAngles(i, j);
                const domSelected = selectedKey === dom.key;
                const domOnScreen = (((domAng.center + rotation) % 360) + 360) % 360;
                const domFlip = domOnScreen > 90 && domOnScreen < 270;
                const summits =
                  encoding.domainSummits?.(dom.key) ?? [];
                // Planned-first so Active dots sit at the outer positions.
                const sorted = [...summits].sort(
                  (a, b) => Number(a.active) - Number(b.active),
                );

                return (
                  <g key={dom.key}>
                    <path
                      d={annularSector(OUTER_R0, OUTER_R1, domAng.a0, domAng.a1)}
                      fill={dom.color}
                      fillOpacity={domSelected ? 0.42 : 0.2}
                      stroke={domSelected ? (selectedStroke ?? dom.color) : "none"}
                      strokeWidth={domSelected ? 1 : 0}
                      className="cursor-pointer transition-[fill-opacity]"
                      onClick={() => handleDomain(dom.key, dim.key)}
                    />

                    {/* Circumferential domain label */}
                    <path
                      id={`wl-arc-${dom.key}`}
                      d={labelArc(domAng.a0, domAng.a1, domFlip)}
                      fill="none"
                    />
                    <text
                      style={{ pointerEvents: "none" }}
                      fontFamily="Georgia, serif"
                      fontSize={8}
                      fontWeight={domSelected ? 600 : 500}
                      fill={INK}
                    >
                      <textPath
                        href={`#wl-arc-${dom.key}`}
                        startOffset="50%"
                        textAnchor="middle"
                      >
                        {dom.name}
                      </textPath>
                    </text>

                    {encodingMode === "summitCount"
                      ? sorted.map((s, n) => {
                          const row = n % DOT_ROWS;
                          const col = Math.floor(n / DOT_ROWS);
                          const numCols = Math.ceil(sorted.length / DOT_ROWS);
                          const radius = OUTER_R0 + 8 + row * 13;
                          const angle =
                            domAng.center - ((numCols - 1) * 7) / 2 + col * 7;
                          const p = polar(radius, angle);
                          return (
                            <circle
                              key={n}
                              cx={p.x}
                              cy={p.y}
                              r={DOT_R}
                              fill={s.active ? dom.color : CREAM}
                              stroke={dom.color}
                              strokeWidth={1}
                              style={{ pointerEvents: "none" }}
                            />
                          );
                        })
                      : null}
                  </g>
                );
              })}
            </g>
          );
        })}
      </g>

      {/* Fixed right-edge pointer (Align only) */}
      {rotatable ? <polygon points="337,160 327,153 327,167" fill={INK} /> : null}

      {/* Center hub — tap to reset */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={INNER_R0}
        fill={CREAM}
        stroke={HAIRLINE}
        strokeWidth={1}
        className={onSelectCenter ? "cursor-pointer" : undefined}
        onClick={() => onSelectCenter?.()}
      />
      <text
        x={CENTER}
        y={CENTER + 5}
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize={15}
        fill={INK}
        style={{ pointerEvents: "none" }}
      >
        {centerLabel}
      </text>
    </svg>
  );
}
