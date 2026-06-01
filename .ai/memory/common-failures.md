# 常见失败

每遇到一种新的失败模式追加一行。做类似任务前先查阅。

---

## ESLint / pre-commit

| 现象 | 原因 | 修复 |
|------|------|------|
| `react-refresh/only-export-components` | 组件文件中 export 了 hook 或工具函数 | 移到 `useX.ts` 或 `xContext.ts` |
| `useVirtualizer` 触发 `react-hooks/incompatible-library` | TanStack Virtual API 特性 | 带注释的 targeted `eslint-disable-next-line` |
| 本地 pre-commit 路径不对 | 在错误 cwd 下跑 eslint | 用 `pnpm -C apps/web exec eslint ...` 或在仓库根目录 `pnpm exec lint-staged` |

## 布局

| 现象 | 原因 | 修复 |
|------|------|------|
| 聊天/列表无法滚动 | 缺少 `minmax(0,1fr)` 或多个滚动容器 | 阅读 scrollable-layout rule + skill |
| Spin 导致滚动失效 | `<Spin>` 包裹了滚动容器 | 在 scroll host 外使用 overlay loader |

## 前端组件

| 现象 | 原因 | 修复 |
|------|------|------|
| 页面/组件函数超长 | 请求、状态、JSX 全塞一个文件 | 读 `frontend-component` skill，抽 hook 与子组件 |
| 复杂逻辑写在 JSX 属性里 | 未抽 handler/hook | 具名 `useCallback` 或 `useXxx` hook |

## Backend Service

| 现象 | 原因 | 修复 |
|------|------|------|
| Service 方法几十上百行 | AI 把编排+SQL+RAG 写进一个函数 | 读 `backend-service` skill 按步骤拆分 |
| 流式/非流式两套重复代码 | 未抽共享 helper | 抽 history/sources/title 等 private 方法 |

## Git

| 现象 | 原因 | 修复 |
|------|------|------|
| Commit 被 hook 拒绝 | 对已暂存 TS/TSX 跑 ESLint | 修 lint、重新暂存、新建 commit（除非用户要求，不用 `--no-verify`） |
