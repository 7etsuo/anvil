import tseslint from "typescript-eslint";

/** T-M1-017: ban phaser outside @anvil/render-phaser */
export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/dist-ci/**",
      "**/node_modules/**",
      "docs/**",
      "examples/**/dist*/**",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,mjs}"],
    ignores: ["packages/render-phaser/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "phaser",
              message:
                "Phaser only allowed in packages/render-phaser (REQ-A03 / ADR-003).",
            },
          ],
          patterns: [
            {
              group: ["phaser/*"],
              message:
                "Phaser only allowed in packages/render-phaser (REQ-A03 / ADR-003).",
            },
          ],
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["packages/render-phaser/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
);
