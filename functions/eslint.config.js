// functions/eslint.config.js
const tseslint = require("typescript-eslint");

module.exports = [
  {
    ignores: ["lib/", "eslint.config.js"],
  },
  ...tseslint.configs.recommended,
  // This new section overrides the default rule
  {
    rules: {
      // This tells the linter to allow unused variables
      // as long as their name starts with an underscore (_)
      "@typescript-eslint/no-unused-vars": [
        "error",
        { "argsIgnorePattern": "^_" },
      ],
    },
  },
];