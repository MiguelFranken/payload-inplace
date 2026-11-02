import tseslint from 'typescript-eslint'
export default tseslint.config({ ignores: ['dist/**', 'dev/.next*/**', 'dev/payload-types.ts', 'dev/app/(payload)/admin/importMap.js'] }, ...tseslint.configs.recommended, { rules: { '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } })
