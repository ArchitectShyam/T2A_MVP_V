import { z } from "zod";

/**
 * Discover — shared contracts for the "Who you are, so far" self-knowledge
 * surface. These types are transport-safe (plain JSON) and are the ONLY thing
 * the client bundle imports from the data layer, so server-only DB code never
 * leaks into the browser.
 */

// --- Category keys + presentation metadata ---------------------------------
export const discoverCategoryKeys = [
  "values",
  "beliefs",
  "strengths",
  "interests",
  "roles",
  "aspirations",
] as const;

export const discoverCategoryKeySchema = z.enum(discoverCategoryKeys);
export type DiscoverCategoryKey = z.infer<typeof discoverCategoryKeySchema>;

/** Ordered display metadata (name + wheel color) per category. */
export const DISCOVER_CATEGORY_META: Record<
  DiscoverCategoryKey,
  { name: string; color: string }
> = {
  values: { name: "Values", color: "#C1694B" },
  beliefs: { name: "Beliefs", color: "#8A9878" },
  strengths: { name: "Strengths", color: "#C9A24B" },
  interests: { name: "Interests", color: "#C17A8E" },
  roles: { name: "Roles", color: "#7D6F5E" },
  aspirations: { name: "Aspirations", color: "#A67F9E" },
};

// --- Enumerations ----------------------------------------------------------
export const strengthNatureSchema = z.enum(["strength", "growth_area"]);
export type StrengthNature = z.infer<typeof strengthNatureSchema>;

export const operatingStatusSchema = z.enum(["active", "parked", "dropped", "merged"]);
export type OperatingStatus = z.infer<typeof operatingStatusSchema>;

export const lifecycleStatusSchema = z.enum([
  "captured",
  "exploring",
  "refined",
  "converted",
  "achieved",
]);
export type LifecycleStatus = z.infer<typeof lifecycleStatusSchema>;

export const timeHorizonSchema = z.enum(["short", "medium", "long", "lifetime"]);
export type TimeHorizon = z.infer<typeof timeHorizonSchema>;

// --- Item + category shapes returned to the client -------------------------
export const discoverItemSchema = z.object({
  /** The user-personalization row id (stable, unique across the category). */
  id: z.string(),
  text: z.string(),
  note: z.string().optional(),
  evidence: z.array(z.string()).optional(),
  isCore: z.boolean().optional(),
  rank: z.number().nullable().optional(),
  nature: strengthNatureSchema.optional(),
  operatingStatus: operatingStatusSchema.optional(),
  lifecycleStatus: lifecycleStatusSchema.optional(),
  timeHorizon: timeHorizonSchema.nullable().optional(),
  isBucketList: z.boolean().optional(),
  importanceScore: z.number().nullable().optional(),
});
export type DiscoverItem = z.infer<typeof discoverItemSchema>;

export const discoverCategorySchema = z.object({
  key: discoverCategoryKeySchema,
  name: z.string(),
  color: z.string(),
  items: z.array(discoverItemSchema),
});
export type DiscoverCategory = z.infer<typeof discoverCategorySchema>;

// --- Featured/core caps ----------------------------------------------------
/** Categories that support a featured/"core" flag with drag-to-rank. */
export const CORE_CATEGORIES: DiscoverCategoryKey[] = [
  "values",
  "beliefs",
  "interests",
  "roles",
];
export const MAX_CORE = 5;
export const MAX_SIGNATURE_STRENGTHS = 3;
export const MAX_SIGNATURE_GROWTH = 2;

export function supportsCore(category: DiscoverCategoryKey): boolean {
  return CORE_CATEGORIES.includes(category);
}

// --- Aspiration meta patch -------------------------------------------------
export const aspirationMetaPatchSchema = z.object({
  operatingStatus: operatingStatusSchema.optional(),
  lifecycleStatus: lifecycleStatusSchema.optional(),
  timeHorizon: timeHorizonSchema.nullable().optional(),
  isBucketList: z.boolean().optional(),
  importanceScore: z.number().min(0).max(10).nullable().optional(),
});
export type AspirationMetaPatch = z.infer<typeof aspirationMetaPatchSchema>;
