import { ErrorCode, type ErrorResponse } from "@lifeos/contracts";
import { DomainError, NotFoundError } from "@lifeos/core";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/** Build the standard error envelope. */
export function errorBody(
  code: string,
  message: string,
  details?: { path: string; message: string }[],
): ErrorResponse {
  return { error: { code, message, ...(details ? { details } : {}) } };
}

/** Map a thrown error to an HTTP status + error envelope. */
export function mapError(err: unknown): {
  status: ContentfulStatusCode;
  body: ErrorResponse;
} {
  if (err instanceof NotFoundError) {
    return { status: 404, body: errorBody(err.code, err.message) };
  }
  if (err instanceof DomainError) {
    // Other domain errors (e.g. forbidden) map to 403 by convention.
    return { status: 403, body: errorBody(err.code, err.message) };
  }
  return {
    status: 500,
    body: errorBody(ErrorCode.INTERNAL, "Internal server error"),
  };
}
