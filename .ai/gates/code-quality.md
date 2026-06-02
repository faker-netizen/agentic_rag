# 代码质量门禁

在 **commit** 或宣称任务完成**之前**通过。

## 自动化检查（必须通过）

```bash
# 模拟 pre-commit 对已暂存 web TS/TSX 的检查
pnpm exec lint-staged

# CI 同等检查（push/PR 自动跑，见 .github/workflows/ci.yml）
pnpm lint
pnpm build
pnpm test:e2e:smoke   # 本地可选；CI 在 MySQL + Playwright job 中跑
```

### lint-staged 范围

- `apps/web/**/*.{ts,tsx}`
- `packages/components/**/*.{ts,tsx}`
- `--max-warnings=0`（warning 也算失败）

**pre-commit 不覆盖：** `apps/backend`、纯 CSS、JSON、配置文件 — 需手动跑 `pnpm build` 或 backend `tsc`。

### 含 backend 变更时

额外通过 [后端代码质量门禁](./backend-quality.md)（函数粒度、Service 编排、无重复逻辑）。

### 含 frontend TS/TSX 变更时

额外通过 [前端代码质量门禁](./frontend-quality.md)（组件/hook 粒度、JSX 与逻辑分离）。

## 代码标准

- [ ] 禁止 `@ts-ignore`
- [ ] 禁止随意 `any`
- [ ] 组件使用 TypeScript，props 有类型
- [ ] 每文件一个 default export 组件；hook/工具函数单独文件
- [ ] 业务逻辑不堆在 JSX 里
- [ ] 新请求：处理 loading + error + empty
- [ ] Backend Service：见 [backend-quality.md](./backend-quality.md)
- [ ] Frontend 组件/hook：见 [frontend-quality.md](./frontend-quality.md)

## ESLint 常见坑（本仓库）

| 规则 | 修复方式 |
|------|----------|
| `react-refresh/only-export-components` | 将 hook/工具函数移到单独文件 |
| `react-hooks/incompatible-library` | 仅 TanStack Virtual 可 targeted `eslint-disable-next-line` 并加注释 |

历史记录见 `.ai/memory/common-failures.md`。
