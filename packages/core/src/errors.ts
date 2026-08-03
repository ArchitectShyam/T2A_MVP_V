import { ErrorCode } from "@lifeos/contracts";

/** Base class for business-rule failures. Carries a stable domain error code. */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Raised when an entity does not exist or is not visible to the current user. */
export class NotFoundError extends DomainError {
  constructor(message = "Resource not found") {
    super(ErrorCode.NOT_FOUND, message);
  }
}

/** Raised when the current user may not perform the requested action. */
export class ForbiddenError extends DomainError {
  constructor(message = "Forbidden") {
    super(ErrorCode.FORBIDDEN, message);
  }
}
