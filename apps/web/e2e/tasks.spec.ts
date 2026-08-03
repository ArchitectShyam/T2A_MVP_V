import { expect, test } from "@playwright/test";

/**
 * Happy-path E2E: sign up/in -> create a task -> complete it.
 *
 * Requires `supabase start` running locally with signups auto-confirmed. A
 * unique email is used per run so the sign-up succeeds every time.
 */
test("sign in, create a task, and complete it", async ({ page }) => {
  const email = `e2e_${Date.now()}@example.com`;
  const password = "Password123!";

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  // New user for this run.
  await page.getByRole("button", { name: "Sign up" }).click();

  // Land on the tasks page.
  await expect(page).toHaveURL(/\/tasks$/);

  // Create a task.
  const title = `Buy milk ${Date.now()}`;
  await page.getByLabel("Title").fill(title);
  await page.getByRole("button", { name: "Add task" }).click();

  const item = page.getByTestId("task-item").filter({ hasText: title });
  await expect(item).toBeVisible();

  // Complete it.
  await item.getByRole("checkbox").click();
  await expect(item.getByRole("checkbox")).toBeChecked();
});
