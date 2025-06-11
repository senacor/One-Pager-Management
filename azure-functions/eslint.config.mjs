import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";
import unusedImports from "eslint-plugin-unused-imports";

const defaultRules = {
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

const plugins = { js, "unused-imports": unusedImports }

const extendsConf = [
    "js/recommended"
];

export default defineConfig([
    // Disallow console in main sources
    { files: ["src/**/*.{js,mjs,cjs,ts,mts,cts}"], plugins: plugins, extends: extendsConf, rules: { ...defaultRules, "no-console": "error" } },
    // Allow console in test code
    { files: ["test/**/*.{js,mjs,cjs,ts,mts,cts}"], plugins: plugins, extends: extendsConf, rules: { ...defaultRules, "no-console": "off" } },
    { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], languageOptions: { globals: globals.node } },
    tseslint.configs.recommended,
]);
