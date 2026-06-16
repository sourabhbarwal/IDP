module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/', 'coverage/'],
  rules: {
    // Allow injection tokens to use any type
    '@typescript-eslint/no-explicit-any': 'warn',
    // NestJS uses empty constructors with DI
    '@typescript-eslint/no-empty-function': 'warn',
    // Allow non-null assertions (used in TypeORM entities with !)
    '@typescript-eslint/no-non-null-assertion': 'warn',
    // Enforce consistent type imports
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    // No unused vars (errors in TS already, keep as warning in lint)
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};