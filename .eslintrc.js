module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
    mocha: true
  },
  overrides: [
    {
      files: [
        'src/**/*.ts',
        'src/**/*.d.ts'
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        sourceType: 'module'
      },
      plugins: [
        '@typescript-eslint'
      ],
      extends: [
        'plugin:@typescript-eslint/recommended'
      ],
      rules: {
        'arrow-parens': ['error', 'always'],
        'import/extensions': 'off',
        'import/no-self-import': 'off',
        'import/no-unresolved': ['error', { 'ignore': ['keytar'] }],
        'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
        'no-empty-function': ['error', { allow: ['constructors'] }],
        'no-useless-constructor': 'off',
        'object-curly-newline': ['error', { multiline: true, minProperties: 5 }],
        '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
        '@typescript-eslint/explicit-member-accessibility': ['error', { overrides: { constructors: 'no-public' } }],
        '@typescript-eslint/interface-name-prefix': 'off',
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
        '@typescript-eslint/no-parameter-properties': ['error', { allows: ['public', 'private'] }],
        '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
        '@typescript-eslint/no-use-before-define': ['error', { classes: false, functions: false }],
        '@typescript-eslint/no-useless-constructor': 'error'
      }
    },
    {
      files: [
        'src/**/*.js'
      ],
      parser: 'babel-eslint',
      parserOptions: {
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      },
      extends: [
        'airbnb',
        'plugin:react/recommended'
      ],
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
        'no-control-regex': 'off',
        'no-return-assign': 'off',
        'no-underscore-dangle': 'off',
        'no-unused-vars': ['error', { args: 'none' }],
        'no-use-before-define': 'off',
        'no-useless-escape': 'off',
        'prefer-destructuring': ['error', { array: false }],
        'react/jsx-curly-newline': 'off',
        'react/jsx-filename-extension': ['error', { extensions: ['.js', '.jsx'] }],
        'react/jsx-one-expression-per-line': 'off',
        'react/jsx-props-no-spreading': ['error', { custom: 'ignore' }],
        'react/sort-comp': 'off',
        'semi': 'off',
        'space-before-function-paren': ['error', {
          anonymous: 'never',
          named: 'never',
          asyncArrow: 'always'
        }],
        'template-curly-spacing': 'off'
      }
    },
    {
      files: [
        'test/**/*.ts'
      ],
      parserOptions: {
        sourceType: 'module'
      },
      plugins: [
        '@typescript-eslint',
        'mocha'
      ],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:mocha/recommended'
      ],
      rules: {
        'mocha/no-hooks-for-single-case': 'off',
        'mocha/no-setup-in-describe': 'off',
        'mocha/prefer-arrow-callback': 'error',
        'no-unused-expressions': 'off',
        'prefer-arrow-callback': 'off'
      }
    }
  ],
  settings: {
    'import/resolver': 'webpack'
  }
};
