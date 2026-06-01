# 前端代码质量门禁

变更 `apps/web/**`、`packages/components/**` 的 TS/TSX 时，在 **commit** 或宣称完成**之前**通过。

## 自动化（必须通过）

```bash
pnpm exec lint-staged
# 或
pnpm -C apps/web exec eslint --fix --max-warnings=0 <changed-files>
```

较大变更建议：

```bash
pnpm lint
pnpm build
```

## 函数与组件结构

- [ ] **无超过 80 行的函数 / 自定义 hook**（不含空行/注释），或已拆分
- [ ] **JSX 以布局与组合为主**，无大段 inline 业务逻辑
- [ ] 复杂 `onClick` / `useEffect` 已具名或收入 hook
- [ ] 页面级 **请求 + loading + error** 不在 JSX 里散写，有 hook 或 service 层
- [ ] **无 copy-paste**：重复 UI 块或处理逻辑已抽组件/hook
- [ ] 一文件一 default export 组件；hook/helper 在独立文件

## 快速自检

1. 打开改动最大的 `.tsx` — 组件函数是否超过一屏？
2. 数 `useState` — 页面文件超过 ~6 个是否该抽 hook？
3. 搜索 `async () =>` 在 JSX 属性里 — 应改为外部 handler

## 类型与请求

- [ ] 禁止 `@ts-ignore`、禁止随意 `any`
- [ ] 新数据流：loading + error + empty 均已处理
- [ ] 复用 `@/service/*`，不重复造请求封装

## 与 ui-quality 的分工

| 门禁 | 关注点 |
|------|--------|
| **本文件** | 代码结构、函数长度、hook/组件拆分 |
| [ui-quality.md](./ui-quality.md) | 滚动、布局、视觉状态、主题一致性 |
| [code-quality.md](./code-quality.md) | 总入口、lint-staged、ESLint 坑 |

拆分指南：`.cursor/skills/frontend-component/SKILL.md`
