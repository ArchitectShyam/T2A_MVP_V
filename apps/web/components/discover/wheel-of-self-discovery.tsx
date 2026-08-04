"use client";

import type { DiscoverCategory } from "@lifeos/contracts";
import { useEffect, useRef, useState } from "react";

/**
 * Wheel of Self-Discovery — a single-ring SVG sunburst of 6 wedges (60° each).
 * Tapping a wedge pulses it, rotates the ring so it lands at the fixed right
 * pointer, then reports the selection. Tapping the hub resets.
 *
 * All coordinates are rounded to 3 decimals so server- and client-rendered SVG
 * match exactly (avoids hydration mismatch).
 */

const CENTER = 160;
const INNER_R = 54;
const OUTER_R = 150;
const LABEL_R = 158;
const FILL_MAX_R = INNER_R + (OUTER_R - INNER_R) / 2; // fill only the inner half
const GAP = 3; // degrees between wedges
const BAND_GAP = 1.5;
const PULSE_MS = 100;
const ROTATE_MS = 575;

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Point at radius `r` and `angle` degrees, measured clockwise from 12 o'clock. */
function polar(r: number, angle: number): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180;
  return { x: r3(CENTER + r * Math.sin(rad)), y: r3(CENTER - r * Math.cos(rad)) };
}

/** Annular sector (ring segment) path from innerR..outerR spanning [a0, a1]. */
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

/** Curved arc for a wedge's label. Reversed when the wedge currently sits on
 * the bottom half, so the text never reads upside-down. */
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
    [{ transform: "scale(1)" }, { transform: "scale(1.04)" }, { transform: "scale(1)" }],
    { duration: PULSE_MS, easing: "ease-out" },
  );
}

export interface WheelProps {
  categories: DiscoverCategory[];
  onSelect: (index: number | null) => void;
}

export function WheelOfSelfDiscovery({ categories, onSelect }: WheelProps) {
  const [active, setActive] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const wedgeRefs = useRef<(SVGGElement | null)[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const maxCount = Math.max(1, ...categories.map((c) => c.items.length));
  const bandSlot = (FILL_MAX_R - INNER_R) / maxCount;
  const bandThickness = Math.max(1, bandSlot - BAND_GAP);

  function selectWedge(index: number) {
    heartbeat(wedgeRefs.current[index] ?? null);
    timers.current.push(
      setTimeout(() => {
        setActive(index);
        setRotation(90 - index * 60);
      }, PULSE_MS),
    );
    timers.current.push(
      setTimeout(() => onSelect(index), PULSE_MS + ROTATE_MS),
    );
  }

  function reset() {
    setActive(null);
    setRotation(0);
    onSelect(null);
  }

  const centerText = active != null ? categories[active]?.name : null;

  return (
    <svg
      viewBox="-18 -18 362 356"
      className="h-[360px] w-[360px] max-w-full select-none"
      role="img"
      aria-label="Wheel of self-discovery"
    >
      <g
        style={{
          transform: `rotate(${rotation}deg)`,
          transformOrigin: "160px 160px",
          transformBox: "view-box",
          transition: `transform ${ROTATE_MS}ms ease`,
        }}
      >
        {categories.map((cat, i) => {
          const centerAngle = i * 60;
          const a0 = centerAngle - 30 + GAP / 2;
          const a1 = centerAngle + 30 - GAP / 2;
          const onScreen = ((centerAngle + rotation) % 360 + 360) % 360;
          const flip = onScreen > 90 && onScreen < 270;

          return (
            <g key={cat.key} ref={(el) => { wedgeRefs.current[i] = el; }}>
              {/* Container = click target */}
              <path
                d={annularSector(INNER_R, OUTER_R, a0, a1)}
                fill={cat.color}
                fillOpacity={active === i ? 0.28 : 0.15}
                className="cursor-pointer transition-[fill-opacity]"
                onClick={() => selectWedge(i)}
              />
              {/* Fill = one band per item */}
              {cat.items.map((_, k) => {
                const innerRk = INNER_R + k * bandSlot;
                return (
                  <path
                    key={k}
                    d={annularSector(innerRk, innerRk + bandThickness, a0, a1)}
                    fill={cat.color}
                    style={{ pointerEvents: "none" }}
                  />
                );
              })}
              {/* Curved label */}
              <path id={`arc-${cat.key}`} d={labelArc(a0, a1, flip)} fill="none" />
              <text
                style={{ pointerEvents: "none" }}
                fontFamily="Georgia, serif"
                fontSize={11}
                fontWeight={500}
                fill="#3A342C"
              >
                <textPath href={`#arc-${cat.key}`} startOffset="50%" textAnchor="middle">
                  {cat.name}
                </textPath>
              </text>
            </g>
          );
        })}
      </g>

      {/* Fixed pointer (never rotates) */}
      <polygon points="337,160 327,153 327,167" fill="#3A342C" />

      {/* Center hub — tap to reset */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={INNER_R}
        fill="#FAF6EF"
        stroke="#E4DAC8"
        strokeWidth={1}
        className="cursor-pointer"
        onClick={reset}
      />
      {centerText ? (
        <text
          x={CENTER}
          y={CENTER + 5}
          textAnchor="middle"
          fontFamily="Georgia, serif"
          fontSize={16}
          fill="#3A342C"
          style={{ pointerEvents: "none" }}
        >
          {centerText}
        </text>
      ) : (
        <>
          <text
            x={CENTER}
            y={CENTER - 4}
            textAnchor="middle"
            fontFamily="Georgia, serif"
            fontSize={15}
            fill="#3A342C"
            style={{ pointerEvents: "none" }}
          >
            Discover
          </text>
          <text
            x={CENTER}
            y={CENTER + 15}
            textAnchor="middle"
            fontFamily="Georgia, serif"
            fontSize={15}
            fill="#9C9078"
            style={{ pointerEvents: "none" }}
          >
            you
          </text>
        </>
      )}
    </svg>
  );
}
