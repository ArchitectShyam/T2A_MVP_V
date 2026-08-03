import { z } from "zod";
import { uuidSchema } from "./common.js";

/** Subscription tiers, ordered from least to most privileged. */
export const planSchema = z.enum(["free", "pro", "premium"]);
export type Plan = z.infer<typeof planSchema>;

export const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
  premium: "Premium",
};

/**
 * A user's profile, extending Supabase auth. Timestamps are ISO-8601 strings so
 * the shape is transport-safe across every layer.
 */
export const profileSchema = z.object({
  id: uuidSchema,
  email: z.string().email(),
  fullName: z.string().nullable(),
  phone: z.string().nullable(),
  plan: planSchema,
  planStartedAt: z.string(),
  trialEndsAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Profile = z.infer<typeof profileSchema>;

/**
 * The subset of profile fields a signed-in user may edit themselves. Plan and
 * trial are deliberately excluded — those are changed server-side only.
 */
export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(1, "Please enter your name.").max(120),
  phone: z.string().trim().max(30, "That phone number looks too long."),
});

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
