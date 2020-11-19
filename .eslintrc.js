module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
    mocha: true
  },
  overrides: [
    {
      files: ['src/**/*.ts', 'src/**/*.d.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        sourceType: 'module'
      },
      plugins: ['@typescript-eslint'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'prettier',
        'prettier/@typescript-eslint'
      ],
      rules: {
        '@typescript-eslint/camelcase': [
          'error',
          {
            allow: ['env_id', 'env_type', 'last_modified'],
            ignoreDestructuring: true
          }
        ],
        '@typescript-eslint/interface-name-prefix': 'off',
        '@typescript-eslint/no-explicit-any': 'off'
      }
    },
    {
      files: ['src/**/*.js'],
      parser: 'babel-eslint',
      parserOptions: {
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      },
      extends: [
        'airbnb',
        'plugin:react/recommended',
        'prettier',
        'prettier/react'
      ],
      rules: {
        'class-methods-use-this': 'off',
        'import/no-cycle': 'off',
        'no-control-regex': 'off',
        'react/forbid-prop-types': ['error', { forbid: ['any', 'array'] }],
        'react/jsx-filename-extension': [
          'error',
          { extensions: ['.js', '.jsx'] }
        ],
        'react/jsx-props-no-spreading': ['error', { custom: 'ignore' }],
        'react/sort-comp': 'off'
      }
    },
    {
      files: ['test/**/*.ts'],
      parserOptions: {
        sourceType: 'module'
      },
      plugins: ['@typescript-eslint', 'mocha'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:mocha/recommended',
        'prettier',
        'prettier/@typescript-eslint'
      ],
      rules: {
        'mocha/no-setup-in-describe': 'off'
      }
    }
  ],
  settings: {
    'import/resolver': 'webpack'
  }
};
