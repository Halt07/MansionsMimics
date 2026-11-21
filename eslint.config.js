import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";

export default tseslint.config(
  {
    // Generated/vendored code: build output and the shadcn UI primitives
    ignores: ["dist/**", "src/components/ui/**"],
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    extends: [pluginJs.configs.recommended, pluginReact.configs.flat.recommended],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
        // Pin the project root, so editors that have seen other copies of the repo don't guess
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      react: { version: "detect" },
    },
    plugins: {
      "react-hooks": pluginReactHooks,
      "unused-imports": pluginUnusedImports,
    },
    rules: {
      "no-unused-vars": "off",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        // An error, not a warning: `npm run lint` runs --quiet, which would hide a warning
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      // React's recommended hooks rules (including the React Compiler checks)
      ...pluginReactHooks.configs["recommended-latest"].rules,
      // Apostrophes and quotes in prose render fine; only flag characters that usually mean a JSX typo
      "react/no-unescaped-entities": ["error", { forbid: [">", "}"] }],
    },
  },
  {
    // The tests: Node scripts (the runner, Vite) that also drive a jsdom page (browser globals)
    files: ["tests/**/*.mjs"],
    extends: [pluginJs.configs.recommended],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
      ecmaVersion: 2022,
      sourceType: "module",
    },
    plugins: { "unused-imports": pluginUnusedImports },
    rules: {
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        // An error, not a warning: `npm run lint` runs --quiet, which would hide a warning
        "error",
        { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // TypeScript files: type-aware syntax rules on top of the shared ones
    files: ["src/**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommended],
    rules: {
      // unused-imports handles unused variables/imports (with the _ prefix escape hatch)
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);
