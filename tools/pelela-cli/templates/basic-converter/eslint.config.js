import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      // Style rules
      'semi': ['error', 'never'],
      'indent': ['error', 2],
      'quotes': ['error', 'single'],
      
      // Correctness & Best Practices
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      
      'no-console': 'warn',
      'no-constant-condition': 'warn',
      'no-debugger': 'error',
      
      // Pelela specific or general preferences
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-unused-expressions': 'off'
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
)
