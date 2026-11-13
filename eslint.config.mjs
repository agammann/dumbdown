import { defineConfig, globalIgnores } from "eslint/config";
import react from "./vendor/eslint-plugin-react-compat/index.cjs";
import reactHooks from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import-x";
import jsxA11yUpstream from "eslint-plugin-jsx-a11y-x";
import globals from "globals";
import tseslint from "typescript-eslint";

// Original rules accepted one unused object option; keep inline configurations valid.
const legacyA11yObjects = ["aria-props", "aria-proptypes", "aria-unsupported-elements", "role-has-required-aria-props", "role-supports-aria-props"];
const jsxA11y = {
  ...jsxA11yUpstream,
  rules: { ...jsxA11yUpstream.rules, ...Object.fromEntries(legacyA11yObjects.map((name) => {
    const rule = jsxA11yUpstream.rules[name];
    return [name, { ...rule, meta: { ...rule.meta, schema: [{ type: "object", properties: {} }] } }];
  })) },
};

const eslintConfig = defineConfig([
  {
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
      import: importPlugin,
      "jsx-a11y": jsxA11y,
    },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    settings: {
      react: { version: "detect" },
      "import/parsers": { "@typescript-eslint/parser": [".ts", ".mts", ".cts", ".tsx", ".d.ts"] },
      "import/resolver": {
        node: { extensions: [".js", ".jsx", ".ts", ".tsx"] },
        typescript: { alwaysTryTypes: true },
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "import/no-anonymous-default-export": "warn",
      "react/no-unknown-property": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/jsx-no-target-blank": "off",
      "jsx-a11y/alt-text": ["warn", { elements: ["img"], img: ["Image"] }],
      "jsx-a11y/aria-props": "warn",
      "jsx-a11y/aria-proptypes": "warn",
      "jsx-a11y/aria-unsupported-elements": "warn",
      "jsx-a11y/role-has-required-aria-props": "warn",
      "jsx-a11y/role-supports-aria-props": "warn",
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='script']:has(> JSXAttribute[name.name='src']):not(:has(> JSXAttribute[name.name='async'])):not(:has(> JSXAttribute[name.name='defer']))",
          message: "External scripts must use async or defer to avoid blocking the page.",
        },
      ],
    },
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
    },
  },
  globalIgnores(["dist/**", ".sites-runtime/**", ".wrangler/**", "out/**", "vendor/eslint-plugin-react-compat/**"]),
  {
    files: ["components/ui/**/*.{ts,tsx}", "hooks/use-mobile.ts"],
    rules: {
      // These files are vendored verbatim from shadcn@4.17.0. Keep the
      // registry source intact while applying the stricter rules to Site code.
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
