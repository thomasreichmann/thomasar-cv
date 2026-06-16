import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";

/**
 * Shared ESLint flat config for Next.js apps. `eslint-config-next` already
 * brings typescript-eslint, react, react-hooks, jsx-a11y and import rules, so
 * we compose its two presets and let prettier disable formatting-only rules.
 */
export default [
  { ignores: ["**/.next/**", "**/node_modules/**"] },
  ...coreWebVitals,
  ...nextTypescript,
  eslintConfigPrettier,
];
