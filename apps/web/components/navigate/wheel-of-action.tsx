"use client";

import type { NavDayCompletion, NavSegmentDef } from "@lifeos/contracts";
import { NAV_BAND_SEGMENTS } from "@lifeos/contracts";
import { useEffect, useRef, useState } from "react";

/**
 * Wheel of Action — a single-ring 6-segment sunburst (same geometry family as
 * the Discover / Align wheels). The selected segment always rotates to the
 * fixed 90° right focus, pointing at the detail panel. Deliberately fast
 * rotation — this wheel is tapped constantly.
 *
 * All coordinates are rounded to 3 decimals so server- and client-rendered SVG
 * match exactly (avoids hydration mismatch).
 */

const CENTER = 160;
const INNER_R = 54;
const OUTER_R = 150;
const LABEL_R = 158;
const GAP = 3; // degrees between wedges
const ROTATE_MS = 320;
const PULSE_MS = 100;

const BAND_GAP = 1.5;
const CREAM = "#FAF6EF";
const HAIRLINE = "#E4DAC8";
const INK = "#3A342C";

const BAND_KEYS = new Set<string>(NAV_BAND_SEGMENTS);

const r3 = (n: number) => Math.round(n * 1000) / 1000;

function polar(r: number, angle: number): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180;
  return { x: r3(CENTER + r * Math.sin(rad)), y: r3(CENTER - r * Math.cos(rad)) };
}

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

export interface WheelOfActionProps {
  segments: NavSegmentDef[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onCenterClick?: () => void;
  bands?: Record<string, NavDayCompletion[]>;
}

export function WheelOfAction({
  segments,
  selectedIndex,
  onSelect,
  onCenterClick,
  bands,
}: WheelOfActionProps) {
  const step = 360 / segments.length;
  const rotationFor = (index: number) => 90 - index * step;

  const [rotation, setRotation] = useState(() => rotationFor(selectedIndex));
  const groupRef = useRef<SVGGElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep rotation in sync if the selection changes from outside (e.g. center).
  useEffect(() => {
    setRotation(rotationFor(selectedIndex));
  }, [selectedIndex, step]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function handleSelect(index: number) {
    if (index === selectedIndex) {
      onSelect(index);
      return;
    }
    heartbeat(groupRef.current);
    setRotation(rotationFor(index));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSelect(index), ROTATE_MS);
  }

  const bandMid = INNER_R + (OUTER_R - INNER_R) / 2;
  const bandSlot = (bandMid - INNER_R) / 7;

  return (
    <svg
      viewBox="-18 -18 362 356"
      className="h-[340px] w-[340px] max-w-full select-none"
      role="img"
      aria-label="Wheel of action"
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
        {segments.map((seg, i) => {
          const a0 = i * step + GAP / 2;
          const a1 = (i + 1) * step - GAP / 2;
          const center = i * step + step / 2;
          const selected = i === selectedIndex;
          const onScreen = (((center + rotation) % 360) + 360) % 360;
          const flip = onScreen > 90 && onScreen < 270;
          const dayBands = BAND_KEYS.has(seg.key) ? (bands?.[seg.key] ?? []) : [];

          return (
            <g key={seg.key}>
              <path
                d={annularSector(INNER_R, OUTER_R, a0, a1)}
                fill={seg.color}
                fillOpacity={selected ? 0.34 : 0.18}
                stroke={selected ? seg.color : "none"}
                strokeWidth={selected ? 1 : 0}
                className="cursor-pointer transition-[fill-opacity]"
                onClick={() => handleSelect(i)}
              />

              {/* Inner-half 7-day completion bands (oldest innermost). */}
              {dayBands.slice(0, 7).map((day, k) => {
                const bandStart = INNER_R + k * bandSlot;
                const bandEnd = bandStart + bandSlot - BAND_GAP;
                return (
                  <path
                    key={day.date}
                    d={annularSector(bandStart, bandEnd, a0, a1)}
                    fill={day.completed ? seg.color : "none"}
                    fillOpacity={day.completed ? 0.9 : 0}
                    stroke={day.completed ? "none" : seg.color}
                    strokeOpacity={day.completed ? 0 : 0.45}
                    strokeWidth={day.completed ? 0 : 0.75}
                    style={{ pointerEvents: "none" }}
                  />
                );
              })}

              {/* Curved segment label */}
              <path id={`wa-arc-${seg.key}`} d={labelArc(a0, a1, flip)} fill="none" />
              <text
                style={{ pointerEvents: "none" }}
                fontFamily="Georgia, serif"
                fontSize={9}
                fontWeight={selected ? 600 : 500}
                fill={INK}
              >
                <textPath href={`#wa-arc-${seg.key}`} startOffset="50%" textAnchor="middle">
                  {seg.name}
                </textPath>
              </text>
            </g>
          );
        })}
      </g>

      {/* Fixed right-edge pointer at the panel focus */}
      <polygon points="332,160 322,153 322,167" fill={INK} />

      {/* Center hub — tap to open the check-in / check-out panel */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={INNER_R}
        fill={CREAM}
        stroke={HAIRLINE}
        strokeWidth={1}
        className={onCenterClick ? "cursor-pointer" : undefined}
        onClick={onCenterClick}
      />
      <text
        x={CENTER}
        y={CENTER - 4}
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize={13}
        fill={INK}
        style={{ pointerEvents: "none" }}
      >
        Today
      </text>
      <text
        x={CENTER}
        y={CENTER + 12}
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize={8}
        fill="#9C9078"
        style={{ pointerEvents: "none" }}
      >
        check-in
      </text>
    </svg>
  );
}
