import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Linter } from "eslint";
import tseslint from "typescript-eslint";
import react from "../vendor/eslint-plugin-react-compat/index.cjs";
import projectConfig from "../eslint.config.mjs";

const upstreamCases = JSON.parse(readFileSync(new URL("./fixtures/eslint-react-upstream-7.37.5.json", import.meta.url), "utf8"));
const baseline = JSON.parse(readFileSync(new URL("./fixtures/eslint-react-baseline-9.39.5.json", import.meta.url), "utf8"));
const linter = new Linter({ configType: "flat" });
const normalize = (messages) => JSON.parse(JSON.stringify(messages.map(({ ruleId, severity, message, line, column, endLine, endColumn }) => ({ ruleId, severity, message, line, column, endLine, endColumn }))));

test("upstream React rule fixtures retain their baseline TSX diagnostics", () => {
  assert.equal(upstreamCases.length, 475);
  assert.equal(baseline.length, upstreamCases.length);
  for (const [index, fixture] of upstreamCases.entries()) {
    assert.deepEqual(fixture.diagnostics, baseline[index].diagnostics, `baseline fixture ${index}`);
    const config = [{
      files: ["**/*.tsx"],
      languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true }, ...fixture.parserOptions }, globals: fixture.globals ?? {} },
      plugins: { react },
      settings: { react: { version: "19.0", ...fixture.settings?.react } },
      rules: { [`react/${fixture.rule}`]: ["error", ...(fixture.options ?? [])] },
    }];
    const actual = normalize(linter.verify(fixture.code, config, { filename: "fixture.tsx" }));
    assert.deepEqual(actual, fixture.diagnostics, `${fixture.rule} fixture ${index} (${fixture.kind})`);
  }
});

test("JSX usage rules preserve pragma and fragment variable accounting", () => {
  const cases = [
    ["/** @jsx h */\nimport { h } from './h'; export const A = () => <div />;", []],
    ["/** @jsx Foo.h */\nimport Foo from './f'; export const A = () => <div />;", []],
    ["import { Fragment } from 'react'; export const A = () => <>text</>;", []],
    ["import Thing from './thing'; export const A = () => <Thing />;", []],
    ["import Thing from './thing'; export const A = () => <div />;", ["@typescript-eslint/no-unused-vars"]],
  ];
  for (const extension of ["js", "jsx", "tsx"]) {
    for (const [source, expected] of cases) {
      const config = [{ files: [`**/*.${extension}`], languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } }, plugins: { react, "@typescript-eslint": tseslint.plugin }, settings: { react: { version: "19.0" } }, rules: { "react/jsx-uses-react": "error", "react/jsx-uses-vars": "error", "@typescript-eslint/no-unused-vars": "warn" } }];
      assert.deepEqual(linter.verify(source, config, { filename: `fixture.${extension}` }).map((m) => m.ruleId), expected);
    }
  }
});

test("configured accessibility warnings accept prior inline object options", () => {
  const cases = {
    "aria-props": '<div aria-fake="x" />',
    "aria-proptypes": '<div aria-hidden="maybe" />',
    "aria-unsupported-elements": '<meta aria-label="x" />',
    "role-has-required-aria-props": '<div role="checkbox" />',
    "role-supports-aria-props": '<div role="button" aria-valuenow="3" />',
  };
  const valid = {
    "aria-props": '<div aria-label="ok" />',
    "aria-proptypes": '<div aria-hidden="true" />',
    "aria-unsupported-elements": '<div aria-label="ok" />',
    "role-has-required-aria-props": '<div role="checkbox" aria-checked="false" />',
    "role-supports-aria-props": '<div role="button" aria-label="ok" />',
  };
  for (const [rule, jsx] of Object.entries(cases)) {
    const baselineMessages = linter.verify(`export const A = () => ${jsx};`, projectConfig, { filename: "app/lint-fixture.tsx" });
    const validMessages = linter.verify(`export const A = () => ${valid[rule]};`, projectConfig, { filename: "app/lint-fixture.tsx" });
    assert.ok(baselineMessages.some((m) => m.ruleId === `jsx-a11y/${rule}` && m.severity === 1), rule);
    assert.ok(!validMessages.some((m) => m.ruleId === `jsx-a11y/${rule}`), rule);
    for (const prefix of [`/* eslint jsx-a11y/${rule}: off */\n`, `// eslint-disable-next-line jsx-a11y/${rule}\n`]) {
      const muted = linter.verify(prefix + `export const A = () => ${jsx};`, projectConfig, { filename: "app/lint-fixture.tsx" });
      assert.ok(!muted.some((m) => m.ruleId === `jsx-a11y/${rule}`), rule);
    }
    const code = `/* eslint jsx-a11y/${rule}: ["warn", {}] */\nexport const A = () => ${jsx};`;
    const messages = linter.verify(code, projectConfig, { filename: "app/lint-fixture.tsx" });
    assert.ok(messages.some((m) => m.ruleId === `jsx-a11y/${rule}` && m.severity === 1), rule);
    assert.ok(!messages.some((m) => m.fatal || (m.ruleId === `jsx-a11y/${rule}` && m.severity === 2)), rule);
  }
});

test("React checks respect inline rule controls", () => {
  const code = "export const A = () => <p>You\u0027re ready</p>;";
  const run = (prefix) => linter.verify(prefix + code, projectConfig, { filename: "app/lint-fixture.tsx" }).filter((m) => m.ruleId === "react/no-unescaped-entities");
  assert.equal(run("").length, 1);
  assert.equal(run("/* eslint react/no-unescaped-entities: off */\n").length, 0);
  assert.equal(run("// eslint-disable-next-line react/no-unescaped-entities\n").length, 0);
});


test("existing lint file scopes, severities and vendored UI exceptions remain active", () => {
  const reactSource = "export const A = () => <p>You\u0027re ready</p>;";
  for (const file of ["app/fixture.jsx", "app/fixture.js", "app/fixture.tsx", "app/fixture.min.jsx", "components/ui/fixture.tsx"]) {
    const messages = linter.verify(reactSource, projectConfig, { filename: file });
    assert.ok(messages.some((m) => m.ruleId === "react/no-unescaped-entities" && m.severity === 2), file);
  }
  for (const ext of ["js", "jsx", "mjs", "ts", "tsx", "mts", "cts"]) {
    const file = `app/fixture.${ext}`;
    const messages = linter.verify("export default () => 1;", projectConfig, { filename: file });
    assert.ok(messages.some((m) => m.ruleId === "import/no-anonymous-default-export" && m.severity === 1), file);
  }
  const unused = "const unused = 1; export const A = 1;";
  assert.ok(linter.verify(unused, projectConfig, { filename: "app/fixture.tsx" }).some((m) => m.ruleId === "@typescript-eslint/no-unused-vars" && m.severity === 1));
  assert.ok(!linter.verify(unused, projectConfig, { filename: "components/ui/fixture.tsx" }).some((m) => m.ruleId === "@typescript-eslint/no-unused-vars"));
});

test("JSDoc React components retain deprecated lifecycle detection", () => {
  const code = "/** @extends React.Component */\nclass Example { componentWillMount() {} render() { return null; } }";
  const config = [{ files: ["**/*.tsx"], languageOptions: { parser: tseslint.parser }, plugins: { react }, settings: { react: { version: "19.0" } }, rules: { "react/no-deprecated": "error" } }];
  const messages = linter.verify(code, config, { filename: "fixture.tsx" });
  assert.ok(messages.some((message) => message.ruleId === "react/no-deprecated" && message.severity === 2));
});

test("import and image accessibility options and inline controls remain active", () => {
  const checks = [
    ["export default () => 1;", "import/no-anonymous-default-export", 1],
    ['export const A = () => <Image src="x" />;', "jsx-a11y/alt-text", 1],
  ];
  for (const [source, rule, severity] of checks) {
    const run = (prefix) => linter.verify(prefix + source, projectConfig, { filename: "app/fixture.tsx" }).filter((message) => message.ruleId === rule);
    assert.ok(run("").some((message) => message.severity === severity), rule);
    assert.deepEqual(run(`/* eslint ${rule}: off */\n`), []);
    assert.deepEqual(run(`// eslint-disable-next-line ${rule}\n`), []);
  }
});
