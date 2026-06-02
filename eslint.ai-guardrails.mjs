/** Shared AI guardrails — imported by apps/web and apps/backend ESLint configs. */

export const magicNumberIgnores = [0, 1, -1, 2, 10, 100, 200, 201, 400, 401, 403, 404, 500];

export const magicNumberRule = [
    'error',
    {
        ignore: magicNumberIgnores,
        ignoreArrayIndexes: true,
        ignoreEnums: true,
        ignoreNumericLiteralTypes: true,
        ignoreReadonlyClassProperties: true,
        detectObjects: false,
    },
];

/** @param {number} maxLinesPerFunction */
export function functionLineLimit(maxLinesPerFunction) {
    return [
        'error',
        {
            max: maxLinesPerFunction,
            skipBlankLines: true,
            skipComments: true,
            IIFEs: true,
        },
    ];
}

export const fileLineLimit = [
    'error',
    {max: 250, skipBlankLines: true, skipComments: true},
];

export const maxParamsRule = ['error', {max: 4}];

export const maxClassesPerFile = ['error', 1];

export const backendGuardrails = {
    'max-lines-per-function': functionLineLimit(50),
    'max-lines': fileLineLimit,
    'max-params': maxParamsRule,
    'max-classes-per-file': maxClassesPerFile,
};

export const backendServiceMagicNumbers = {
    '@typescript-eslint/no-magic-numbers': magicNumberRule,
};

export const frontendGuardrails = {
    'max-lines-per-function': functionLineLimit(80),
    'max-lines': fileLineLimit,
    'max-params': maxParamsRule,
    'max-classes-per-file': maxClassesPerFile,
};

export const frontendServiceMagicNumbers = {
    '@typescript-eslint/no-magic-numbers': magicNumberRule,
};

export const e2eGuardrails = {
    'max-lines-per-function': functionLineLimit(100),
    'max-lines': 'off',
    'max-params': maxParamsRule,
};
