# 前端代码质量门禁

变更 `apps/web/**`、`packages/components/**` 的 TS/TSX 时，在 **commit** 或宣称完成**之前**通过。

## 自动化（必须通过）

```bash
pnpm exec lint-staged
pnpm lint
pnpm build
```

## ESLint 硬门禁

- **函数 / hook ≤ 80 行**（`skipBlankLines` + `skipComments`）
- **文件 ≤ 250 行**
- **参数 ≤ 4**
- **每文件 1 个 class**
- **魔法数字**：`src/service/**` 禁止裸字面量（见 `serviceConstants` / `httpConstants` 模式）

## 结构清单

- [ ] JSX 以布局与组合为主
- [ ] 复杂逻辑在 hook / 子组件
- [ ] loading + error + empty 已处理
- [ ] 一文件一 default export 组件

## 相关

- [code-quality.md](./code-quality.md)
- `frontend-component` skill
