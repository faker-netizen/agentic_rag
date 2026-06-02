import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import {backendGuardrails, backendServiceMagicNumbers} from '../../eslint.ai-guardrails.mjs';

export default tseslint.config(
    {ignores: ['dist/**', 'src/config/test.js']},
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            ecmaVersion: 2022,
            globals: globals.node,
        },
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {argsIgnorePattern: '^_', varsIgnorePattern: '^_'},
            ],
            'no-unused-vars': 'off',
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/ban-ts-comment': [
                'error',
                {'ts-expect-error': 'allow-with-description', 'ts-ignore': true},
            ],
            ...backendGuardrails,
        },
    },
    {
        files: ['src/services/**/*.ts'],
        rules: backendServiceMagicNumbers,
    },
);
