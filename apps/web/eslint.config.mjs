import config from "@thomasar-cv/eslint-config/next";

const eslintConfig = [
  ...config,
  {
    // Playwright fixtures take a `use` callback the React hooks rule mistakes for
    // the `use` hook; e2e files are Node test code, not React, so the React hooks
    // rules don't apply.
    files: ["e2e/**/*.ts"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
];

export default eslintConfig;
