import { z } from "zod";

/**
 * Align — shared contracts for the "All your summits" goal-execution surface.
 * These types are transport-safe (plain JSON) and are the ONLY thing the client
 * bundle imports from the data layer, so server-only DB code never leaks into
 * the browser.
 *
 * The Wheel-of-Life framework (4 dimensions x 3 domains) is pure presentation
 * data, so it lives here and is safe to import as a value on the client.
 */

// ---------------------------------------------------------------------------
// Wheel-of-Life framework
// ---------------------------------------------------------------------------
export interface DomainDef {
  key: string;
  name: string;
  color: string;
}

export interface DimensionDef {
  key: string;
  name: string;
  color: string;
  domains: DomainDef[];
}

/** 4 dimensions x 3 domains. Outer-ring domains are tints of the parent. */
export const DIMENSIONS: DimensionDef[] = [
  {
    key: "work",
    name: "Work",
    color: "#C1694B",
    domains: [
      { key: "skills", name: "Skills", color: "#D98A6E" },
      { key: "profession", name: "Profession", color: "#C1694B" },
      { key: "wealth", name: "Wealth", color: "#A6512F" },
    ],
  },
  {
    key: "body",
    name: "Body",
    color: "#8A9878",
    domains: [
      { key: "health", name: "Health", color: "#A3B08F" },
      { key: "mind", name: "Mind", color: "#8A9878" },
      { key: "nutrition", name: "Nutrition", color: "#6E7B5C" },
    ],
  },
  {
    key: "soul",
    name: "Soul",
    color: "#C9A24B",
    domains: [
      { key: "creativity", name: "Creativity", color: "#D9B96E" },
      { key: "adventures", name: "Adventures", color: "#C9A24B" },
      { key: "spirituality", name: "Spirituality", color: "#A67F32" },
    ],
  },
  {
    key: "heart",
    name: "Heart",
    color: "#C17A8E",
    domains: [
      { key: "intimacy", name: "Intimacy", color: "#D398A8" },
      { key: "family", name: "Family", color: "#C17A8E" },
      { key: "connects", name: "Connects", color: "#9C5C6E" },
    ],
  },
];

/** Flat list of the 12 domain keys, in wheel order. */
export const DOMAIN_KEYS: string[] = DIMENSIONS.flatMap((d) =>
  d.domains.map((x) => x.key),
);

/** Fast lookups for domain / dimension metadata by key. */
export const DOMAIN_META: Record<string, DomainDef & { dimensionKey: string }> =
  Object.fromEntries(
    DIMENSIONS.flatMap((dim) =>
      dim.domains.map((dom) => [dom.key, { ...dom, dimensionKey: dim.key }]),
    ),
  );

export const DIMENSION_META: Record<string, DimensionDef> = Object.fromEntries(
  DIMENSIONS.map((d) => [d.key, d]),
);

/**
 * Three DB domain codes differ from the framework keys. Map both directions:
 *   read:  code -> key (`codeToKey`)
 *   write: key  -> code (`keyToCode`, used by `resolveDomainId`)
 */
export const CODE_TO_KEY: Record<string, string> = {
  adventure: "adventures",
  love: "intimacy",
  connect: "connects",
};

const KEY_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(CODE_TO_KEY).map(([code, key]) => [key, code]),
);

export function codeToKey(code: string): string {
  return CODE_TO_KEY[code] ?? code;
}

export function keyToCode(key: string): string {
  return KEY_TO_CODE[key] ?? key;
}

// ---------------------------------------------------------------------------
// Execution hierarchy: Summit -> Journey -> Action -> Step
// Dates are ISO `YYYY-MM-DD`; step `plannedAt` is `YYYY-MM-DDTHH:mm`.
// ---------------------------------------------------------------------------
export const summitDetailsSchema = z.object({
  description: z.string().nullable(),
  successCriteria: z.string().nullable(),
  plannedStartDate: z.string().nullable(),
  targetDate: z.string().nullable(),
  priority: z.number().nullable(),
});
export type SummitDetails = z.infer<typeof summitDetailsSchema>;

export const journeyDetailsSchema = z.object({
  description: z.string().nullable(),
  outcome: z.string().nullable(),
  sequence: z.number().nullable(),
  plannedStartDate: z.string().nullable(),
  targetDate: z.string().nullable(),
});
export type JourneyDetails = z.infer<typeof journeyDetailsSchema>;

export const actionDetailsSchema = z.object({
  description: z.string().nullable(),
  sequence: z.number().nullable(),
  dueDate: z.string().nullable(),
  estimatedEffort: z.number().nullable(),
});
export type ActionDetails = z.infer<typeof actionDetailsSchema>;

export const stepDetailsSchema = z.object({
  sequence: z.number().nullable(),
  plannedAt: z.string().nullable(),
  estimatedEffortMinutes: z.number().nullable(),
});
export type StepDetails = z.infer<typeof stepDetailsSchema>;

export interface HierarchyItem {
  id: string;
  title: string;
  /** Summit level only: holds a non-released focus slot this month. */
  active?: boolean;
  details?: SummitDetails;
  journeyDetails?: JourneyDetails;
  actionDetails?: ActionDetails;
  stepDetails?: StepDetails;
  children?: HierarchyItem[];
}

export interface Summit extends HierarchyItem {
  domainKey: string;
}

/** `domainKey` -> alignment on a fixed 0..1 scale (score / 10). */
export type DomainAlignment = Record<string, number>;

/** The four execution levels, indexed by tree depth (0 = Summit). */
export const ALIGN_LEVELS = ["summit", "journey", "action", "step"] as const;
export type AlignLevel = (typeof ALIGN_LEVELS)[number];
