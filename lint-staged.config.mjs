/** @type {import('lint-staged').Configuration} */
export default {
  'apps/web/**/*.{ts,tsx}': 'pnpm -C apps/web exec eslint --fix --max-warnings=0',
  'packages/components/**/*.{ts,tsx}':
    'pnpm -C apps/web exec eslint --fix --max-warnings=0',
  // tsc 必须全项目检查；lint-staged 传入单文件会触发 TS5112（TypeScript 6）
  'apps/backend/**/*.ts': () => 'pnpm -C apps/backend exec tsc --noEmit',
};
