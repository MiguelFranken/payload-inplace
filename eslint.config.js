import tseslint from "typescript-eslint";
export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "apps/demo/.next*/**",
      "apps/demo/payload-types.ts",
      "apps/demo/app/(payload)/admin/importMap.js",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: [
      "packages/core/src/**/*.ts",
      "packages/lexical/src/**/*.ts",
      "packages/payload-inplace/src/server/**/*.ts",
      "packages/payload-inplace/src/frontend/controllers/**/*.ts",
      "packages/payload-inplace/src/frontend/controllers/**/*.tsx",
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": [
        "error",
        { ignoreVoid: true, checkThenables: true },
      ],
    },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
);
