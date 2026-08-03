/**
 * Root ESLint config — enforces the LifeOS layer boundaries.
 *
 * Layer graph (one-way only):
 *   web      -> api-client, contracts
 *   api      -> core, contracts
 *   core     -> db (interfaces only), contracts
 *   db       -> contracts
 *
 * Hard rules additionally enforced with `no-restricted-imports`:
 *   - Only `db` may import drizzle-orm / postgres / @supabase/*.
 *   - `core` may not import any framework (react/next/hono/supabase).
 */

/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["@typescript-eslint", "import", "boundaries"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:boundaries/recommended",
    "prettier",
  ],
  settings: {
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
        project: [
          "packages/*/tsconfig.json",
          "apps/*/tsconfig.json",
        ],
      },
    },
    // Map every workspace package to a boundaries "element type".
    // Order matters: more specific patterns first. `web-infra` is the
    // composition root / auth plumbing inside the web app and is allowed to
    // wire the data layer; ordinary `web` (UI) is not.
    "boundaries/elements": [
      { type: "contracts", pattern: "packages/contracts/**" },
      { type: "db", pattern: "packages/db/**" },
      { type: "core", pattern: "packages/core/**" },
      { type: "api", pattern: "packages/api/**" },
      {
        type: "web-infra",
        pattern: [
          "apps/web/server/**",
          "apps/web/app/api/**",
          "apps/web/lib/supabase/**",
          "apps/web/middleware.ts",
        ],
      },
      { type: "web", pattern: "apps/web/**" },
    ],
    "boundaries/include": ["packages/**", "apps/**"],
  },
  rules: {
    // ---- Dependency direction (the whole point) ---------------------------
    "boundaries/element-types": [
      "error",
      {
        default: "disallow",
        rules: [
          { from: "contracts", allow: ["contracts"] },
          { from: "db", allow: ["contracts", "db"] },
          { from: "core", allow: ["contracts", "core", "db"] },
          { from: "api", allow: ["contracts", "core", "api"] },
          {
            from: "web-infra",
            allow: ["contracts", "core", "api", "db", "web-infra", "web"],
          },
          { from: "web", allow: ["contracts", "api", "web", "web-infra"] },
        ],
      },
    ],
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { prefer: "type-imports", fixStyle: "inline-type-imports" },
    ],
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
  },
  overrides: [
    // ---- core: NO framework / data-layer libs of any kind -----------------
    {
      files: ["packages/core/**/*.ts"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: [
              { name: "react", message: "core is framework-free." },
              { name: "next", message: "core is framework-free." },
              { name: "hono", message: "core is framework-free." },
              { name: "drizzle-orm", message: "core must not touch the data layer directly." },
              { name: "postgres", message: "core must not touch the data layer directly." },
            ],
            patterns: [
              { group: ["next/*"], message: "core is framework-free." },
              { group: ["@supabase/*"], message: "core must not import Supabase." },
              { group: ["hono/*", "@hono/*"], message: "core is framework-free." },
              { group: ["drizzle-orm/*"], message: "core must not touch the data layer directly." },
              // core may depend on db ONLY through interface types, never impls.
              { group: ["@lifeos/db"], importNames: ["*"], message: "core imports db repository INTERFACES only; wire impls at composition root." },
            ],
          },
        ],
      },
    },
    // ---- web + core + api + contracts: only db may touch drizzle/supabase --
    {
      files: [
        "apps/web/**/*.{ts,tsx}",
        "packages/core/**/*.ts",
        "packages/api/**/*.ts",
        "packages/contracts/**/*.ts",
      ],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              { group: ["drizzle-orm", "drizzle-orm/*"], message: "Only packages/db may import drizzle-orm." },
              { group: ["@supabase/*"], message: "Only packages/db may import @supabase/*." },
              { group: ["postgres"], message: "Only packages/db may import postgres." },
            ],
          },
        ],
      },
    },
    {
      files: ["**/*.test.ts", "**/*.spec.ts", "**/*.config.{ts,js,mjs,cjs}"],
      env: { node: true },
      rules: {
        "boundaries/element-types": "off",
        "no-restricted-imports": "off",
        "no-undef": "off",
        "@typescript-eslint/no-require-imports": "off",
      },
    },
  ],
  ignorePatterns: [
    "node_modules/",
    "dist/",
    ".next/",
    ".turbo/",
    "coverage/",
    "**/*.d.ts",
    "supabase/",
  ],
};
