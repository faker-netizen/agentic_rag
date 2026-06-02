import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import {defineConfig, globalIgnores} from 'eslint/config'
import {frontendGuardrails, frontendServiceMagicNumbers} from '../../eslint.ai-guardrails.mjs'

export default defineConfig([
    globalIgnores(['dist']),
    {
        files: ['**/*.{ts,tsx}', '../../packages/components/src/**/*.{ts,tsx}'],
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
            reactHooks.configs.flat.recommended,
            reactRefresh.configs.vite,
        ],

        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        rules: {
            '@typescript-eslint/no-unused-vars': 'off',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            ...frontendGuardrails,
        },
    },
    {
        files: ['src/service/**/*.ts'],
        rules: frontendServiceMagicNumbers,
    },
    {
        files: ['../../packages/components/src/**/*.{ts,tsx}'],
        rules: {
            '@typescript-eslint/no-magic-numbers': 'off',
        },
    },
])
