module.exports = {
  extends: [
    'airbnb-base',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:jsx-a11y/recommended',
    'plugin:prettier/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:playwright/playwright-test',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
    tsconfigRootDir: __dirname,
    project: [
      './tsconfig.json',
      './tsconfig.node.json', // Include .eslintrc.js file
    ],
  },
  plugins: ['react', 'import', 'prettier'],
  rules: {
    'import/extensions': [
      'warn',
      'ignorePackages',
      {
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
      },
    ],
    'import/no-extraneous-dependencies': [
      'warn',
      {
        devDependencies: false,
      },
    ],
    'import/no-unresolved': 'warn',
    'import/order': [
      'warn',
      {
        alphabetize: {
          order: 'asc',
        },
      },
    ],
    'import/prefer-default-export': 'off',
    'no-param-reassign': 'off',
    'prefer-destructuring': [
      'warn',
      {
        array: false,
        object: true,
      },
    ],
    'prettier/prettier': [
      'error',
      {
        endOfLine: 'auto',
      },
    ],
    'react/jsx-sort-props': 'warn',
    'sort-imports': [
      'warn',
      {
        ignoreDeclarationSort: true,
      },
    ],
    'spaced-comment': ['warn', 'always', { markers: ['/'] }],
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': { typescript: {} },
  },
};
