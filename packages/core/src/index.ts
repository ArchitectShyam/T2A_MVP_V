// Business layer public surface.
export type { TaskRepository } from "./ports/task-repository.js";
export type { Repositories, ServiceContext } from "./context.js";
export { DomainError, NotFoundError, ForbiddenError } from "./errors.js";
export { taskService } from "./services/task-service.js";
