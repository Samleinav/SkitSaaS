import nextTypescript from 'eslint-config-next/typescript';

export default [
  {
    ignores: [
      '.next/**',
      '.source/**',
      'node_modules/**',
      'plans/**',
      'docs/**',
      'coverage/**',
      'app/sdk/dist/**',
      'modules/**/dist/**',
      '**/*.generated.ts',
      '**/*.generated.tsx'
    ]
  },
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'prefer-const': 'off'
    }
  }
];
