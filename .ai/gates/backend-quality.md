# 后端代码质量门禁

变更 `apps/backend/**/*.ts` 时，在 **commit** 或宣称完成**之前**通过。

## 自动化（必须通过）

```bash
pnpm -C apps/backend lint          # ESLint guardrails + no-any + ban-ts-comment
pnpm -C apps/backend exec tsc --noEmit   # lint-staged 对 backend 变更时
pnpm build
```

## ESLint 硬门禁

- **函数 ≤ 50 行**
- **文件 ≤ 250 行**
- **参数 ≤ 4**（多参数用 options 对象）
- **每文件 1 个 class**
- **魔法数字**：`src/services/**` → 使用 `serviceConstants.ts`
- **`@typescript-eslint/no-explicit-any`**: error
- **`ban-ts-comment`**: 禁止 `ts-ignore`

## Service 清单

- [ ] 公开方法 = 编排，不含大段实现
- [ ] 流式 / 非流式共享核心逻辑
- [ ] 重复逻辑已抽取

## 相关

- [code-quality.md](./code-quality.md)
- `backend-service` skill
