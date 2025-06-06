import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettier from "eslint-plugin-prettier";
import unusedImports from "eslint-plugin-unused-imports";

const defaultRules = {
    "no-extra-parens": ["warn", "all"],
    "no-await-in-loop": "warn",
    "no-duplicate-imports": "warn",
    "block-scoped-var": "warn",
    "curly": ["warn", "all"],
    "dot-notation": "warn",
    "eqeqeq": ["warn", "always"],
    "no-implicit-coercion": "warn",
    "no-var": "warn",
    "prefer-arrow-callback": "warn",
    "prefer-const": "warn",
    "prefer-destructuring": ["warn", { "object": true, "array": true }],
    "prefer-template": "warn",
    "yoda": "warn",
    "unused-imports/no-unused-imports": "error",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "unused-imports/no-unused-vars": [
        "warn",
        {
            "vars": "all",
            "varsIgnorePattern": "^_",
            "args": "after-used",
            "argsIgnorePattern": "^_",
        },
    ]
}

const plugins = { js, prettier, unusedImports }

const extendsConf = [
    "eslint:recommended",
    "plugin:prettier/recommended",
    "plugin:unused-imports/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
];

export default defineConfig([
    // Disallow console in main sources
    { files: ["src/**/*.{js,mjs,cjs,ts,mts,cts}"], plugins, extends: extendsConf, rules: { "no-console": "error", "no-extra-parens": ["error", "all"], "prettier/prettier": "error" } },
    // Allow console in test code
    { files: ["test/**/*.{js,mjs,cjs,ts,mts,cts}"], plugins, extends: extendsConf, rules: { "no-console": "off", "no-extra-parens": ["error", "all"], "prettier/prettier": "error" } },
    { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], languageOptions: { globals: globals.node } },
    tseslint.configs.recommended,
]);
