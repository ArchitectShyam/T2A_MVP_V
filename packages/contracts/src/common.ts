import { z } from "zod";

/**
 * A standard error envelope returned by the transport layer.
 * Kept in `contracts` so both the API and the web client share one shape.
 */
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    /** Optional per-field validation issues. */
    details: z
      .array(
        z.object({
          path: z.string(),
          message: z.string(),
        }),
      )
      .optional(),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/** Domain-level error codes shared across layers. */
export const ErrorCode = {
  VALIDATION: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INTERNAL: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Branded uuid string used for all entity identifiers. */
export const uuidSchema = z.string().uuid();
