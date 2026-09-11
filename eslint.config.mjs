import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // MongoDB driver returns untyped docs; typing every read adds ceremony for no gain
      "@typescript-eslint/no-explicit-any": "off",
      // False positive: async fetch-then-setState on mount is a legitimate pattern
      "react-hooks/set-state-in-effect": "off",
      // Arabic typographic quotes (") render fine; the rule only matters for apostrophe-ridden English text
      "react/no-unescaped-entities": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
