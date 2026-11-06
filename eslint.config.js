import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'dist-ssr', 'dist-app', 'data', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'app/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: globals.browser },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['scripts/**/*.mjs', '*.config.{js,ts}', 'server/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  // Database rows, API replies and test data are dynamic, and checked with zod where they arrive.
  { files: ['server/**/*.ts', 'app/src/api.ts'], rules: { '@typescript-eslint/no-explicit-any': 'off' } },
  prettier,
);
