import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      // Suspicious rules (matching Biome)
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
      '@typescript-eslint/no-empty-block-statements': 'off',

      // Style rules (matching Biome)
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-namespace': 'off',

      // Correctness rules (matching Biome)
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-constant-condition': 'warn',
      '@typescript-eslint/no-switch-declarations': 'off',
      '@typescript-eslint/no-inner-declarations': 'off',
      'require-yield': 'off',

      // Nursery rules (matching Biome)
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'examples/**'],
  },
)
