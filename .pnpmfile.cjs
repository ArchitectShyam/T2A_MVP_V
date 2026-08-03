/**
 * pnpm install hook.
 *
 * Rollup ships a `@rollup/rollup-win32-x64-gnu` optional binary that carries no
 * `libc` constraint, so pnpm treats it as required on win32/x64 alongside the
 * MSVC binary we actually use. In this environment that tarball is blocked
 * (HTTP 403), so we strip it from Rollup's optionalDependencies. The correct
 * `@rollup/rollup-win32-x64-msvc` binary is unaffected.
 */
function readPackage(pkg) {
  if (pkg.name === "rollup" && pkg.optionalDependencies) {
    delete pkg.optionalDependencies["@rollup/rollup-win32-x64-gnu"];
  }
  return pkg;
}

module.exports = {
  hooks: { readPackage },
};
