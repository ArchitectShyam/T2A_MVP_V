import type { TaskRepository } from "./ports/task-repository.js";

/** The set of repositories available to services. */
export interface Repositories {
  tasks: TaskRepository;
}

/**
 * Per-request context passed to every service function. `userId` comes from the
 * verified auth session; services use it to enforce authorization.
 */
export interface ServiceContext {
  userId: string;
  repos: Repositories;
}
