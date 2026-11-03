import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";

export default tseslint.config(
  {
    // Generated/vendored code: build output and the shadcn UI primitives
    ignores: ["dist/**", "src/components/ui/**", "src/lib/**"],
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
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/no-unknown-property": [
        "error",
        { ignore: ["cmdk-input-wrapper", "toast-close"] },
      ],
      "react-hooks/rules-of-hooks": "error",
      // Apostrophes and quotes in prose render fine; only flag characters that usually mean a JSX typo
      "react/no-unescaped-entities": ["error", { forbid: [">", "}"] }],
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
