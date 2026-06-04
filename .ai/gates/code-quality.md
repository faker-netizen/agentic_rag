# 代码质量门禁

在 **commit** 或宣称任务完成**之前**通过。

## 自动化检查（必须通过）

```bash
pnpm exec lint-staged   # pre-commit 模拟
pnpm lint               # web + components + backend
pnpm build
pnpm test:e2e:smoke     # CI 自动；**Agent 本地跑须用户确认**（见 post-implementation gate）
```

## ESLint AI Guardrails（硬门禁）

配置：`eslint.ai-guardrails.mjs`（web/backend 共用）；`--max-warnings=0`。

| 范围 | 函数 | 文件 | 参数 | 类/文件 | 魔法数字 |
|------|------|------|------|---------|----------|
| backend | ≤50 | ≤250 | ≤4 | 1 | `src/services/**` |
| web + components | ≤80 | ≤250 | ≤4 | 1 | `src/service/**` |

### lint-staged 范围

- `apps/web/**/*.{ts,tsx}`
- `packages/components/**/*.{ts,tsx}`
- `apps/backend/**/*.ts` — ESLint + `tsc --noEmit`

**pre-commit 不覆盖：** 纯 CSS、JSON、配置文件。

## 代码标准

- [ ] 禁止 `@ts-ignore`（backend ESLint 强制）
- [ ] 禁止随意 `any`（backend 强制；frontend 靠 review）
- [ ] 组件 TypeScript；props 有类型
- [ ] 业务逻辑不堆 JSX；新请求处理 loading/error/empty
- [ ] Backend：见 [backend-quality.md](./backend-quality.md)
- [ ] Frontend：见 [frontend-quality.md](./frontend-quality.md)

## ESLint 常见坑

| 规则 | 修复方式 |
|------|----------|
| `max-lines-per-function` | 抽 hook / 子组件 / helper |
| `max-lines` | 拆文件 |
| `max-params` | 合并为 options 对象 |
| `react-refresh/only-export-components` | hook/工具单独文件 |

历史：`.ai/memory/common-failures.md`
