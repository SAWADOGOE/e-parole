import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

const MODULE_BOUNDARY_MESSAGE =
  "La logique serveur d'un module s'importe via son index.ts public (docs/10-SYSTEM-ARCHITECTURE.md).";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      ...jsxA11y.flatConfigs.strict.rules,
      ...tseslint.configs.strictTypeChecked.reduce((acc, c) => ({ ...acc, ...(c.rules ?? {}) }), {}),
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": ["error", { "ts-expect-error": "allow-with-description" }],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "@typescript-eslint/no-confusing-void-expression": "off",
      "no-console": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/features/*/server/*"], message: MODULE_BOUNDARY_MESSAGE },
            { group: ["@prisma/client", "@generated/prisma/*"], message: "Prisma uniquement dans src/server/db et les repositories." },
          ],
        },
      ],
    },
  },
  {
    files: ["src/server/db/**", "**/repository.ts", "prisma/**", "tests/**"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    files: ["src/features/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["@prisma/client", "@generated/prisma/*"], message: "Prisma uniquement dans les repositories." }] },
      ],
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "e2e/**", "tests/**", "scripts/**", "prisma/seed/**"],
    rules: { "no-console": "off", "@typescript-eslint/no-non-null-assertion": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "generated/**", "coverage/**", "playwright-report/**", "test-results/**", "*.config.{js,mjs}"]),
]);
