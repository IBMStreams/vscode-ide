module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true
  },
  extends: ['airbnb'],
  overrides: [
    {
      files: ['**/*.ts', '**/*.d.ts'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: ['plugin:@typescript-eslint/recommended'],
      rules: {
        'arrow-parens': ['error', 'always'],
        'import/no-self-import': 'off',
        'import/no-unresolved': ['error', { 'ignore': ['keytar'] }],
        'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
        'no-empty-function': ['error', { allow: ['constructors'] }],
        'no-useless-constructor': 'off',
        'object-curly-newline': ['error', { multiline: true, minProperties: 5 }],
        'semi': 'off',
        '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
        '@typescript-eslint/explicit-member-accessibility': ['error', { overrides: { constructors: 'no-public' } }],
        '@typescript-eslint/member-delimiter-style': ['error', {
          multiline: {
            delimiter: 'comma',
            requireLast: false
          },
          singleline: {
            delimiter: 'comma',
            requireLast: false
          },
          overrides: {
            interface: {
              multiline: {
                delimiter: 'semi',
                requireLast: true
              }
            }
          }
        }],
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-parameter-properties': ['error', { allows: ['public'] }],
        '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
        '@typescript-eslint/no-useless-constructor': 'error'
      }
    }
  ],
  parser: 'babel-eslint',
  parserOptions: {
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  rules: {
    'arrow-body-style': 'off',
    'arrow-parens': 'off',
    'class-methods-use-this': 'off',
    'comma-dangle': 'off',
    'consistent-return': 'off',
    'func-names': 'off',
    'import/no-cycle': 'off',
    'import/no-extraneous-dependencies': 'off',
    'indent': 'off',
    'max-len': 'off',
    'no-cond-assign': ['error', 'except-parens'],
    'no-console': 'off',
    'no-return-assign': 'off',
    'no-underscore-dangle': 'off',
    'no-unused-vars': ['error', { args: 'none' }],
    'no-use-before-define': 'off',
    'no-useless-escape': 'off',
    'prefer-destructuring': ['error', { array: false }],
    'react/jsx-filename-extension': ['error', { extensions: ['.js', '.jsx'] }],
    'react/jsx-one-expression-per-line': 'off',
    'space-before-function-paren': ['error', {
      'anonymous': 'always',
      'named': 'never',
      'asyncArrow': 'always'
    }],
    'template-curly-spacing': 'off'
  },
  settings: {
    'import/resolver': 'webpack'
  }
};
