import js from "@eslint/js";
import pluginCloudflare from "eslint-plugin-cflint";

export default [
  {
    plugins: {
      cflint: pluginCloudflare,
    },
  },
  {
    files: ["functions/**/*.{js}"],
  },
  {
    languageOptions: {
      globals: {
        fetch: "readable",
        atob: "readable",
        URL: "readable",
        TextEncoder: "readable",
        crypto: "readable",
        URLSearchParams: "readable",
      },
    },
  },
  js.configs.recommended,
  {
    rules: {
      "no-prototype-builtins": "warn",
      "no-empty": "warn",
      "no-unused-vars": "warn",
      "cflint/no-substr": 1,
      "cflint/no-this-assignment": 1,
    },
  },
];
