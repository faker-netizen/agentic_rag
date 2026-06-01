---
name: frontend-component
description: >-
  指导 apps/web 与 packages/components 的 React 组件拆分——页面编排、自定义 hook、
  子组件抽取、JSX 与业务逻辑分离。修改或新增页面/复杂组件、函数过长、逻辑堆在
  JSX 或单个组件文件时使用。
---

# 前端组件拆分指南

## 何时触发

- 新增或大幅修改 `apps/web/src/pages/**`、`components/**`
- 组件 / hook / 事件处理函数 **超过 40 行**
- 一个文件里大量 `useState` + `useCallback` + 请求逻辑 + JSX 混在一起

## 拆分流程

### 1. 分层（自上而下）

| 层 | 职责 | 示例 |
|----|------|------|
| **Page** | 布局编排、组合 hook 与子组件 | `ChatPage` 只拼 Sider + List + Input |
| **Hook** | 数据加载、发送、流式、表单状态 | `useChatSessions`、`useChatStream` |
| **Component** | 单一 UI 块、少状态 | `SessionList`、`ChatInputBar` |
| **Util** | 纯函数、无 React | `errText`、`formatX` |

### 2. 先列职责再写代码

页面级 checklist：

1. 有哪些独立数据域？（sessions / messages / kb / modal…）
2. 每个域的 load / mutate / loading / error 是否可进一个 hook？
3. JSX 里还剩什么？应主要是布局与 prop 传递

### 3. 抽 hook 的信号

- 同一文件 **≥ 4 个** 相关 `useState`
- **≥ 2 个** `useCallback`/`useEffect` 围绕同一业务（如聊天流式）
- 请求 + loading + error + setState 重复模式

```typescript
// 页面层示意 — 编排为主
export default function ChatPage() {
  const sessions = useChatSessions();
  const chat = useChatMessages(sessions.selectedId);
  const stream = useChatStream({ onMessage: chat.appendLocal, ... });

  return (
    <Layout>...</Layout>  // 以组合为主，少 inline 逻辑
  );
}
```

### 4. 抽子组件的信号

- JSX 中 **连续 30+ 行** 同一区域（侧栏、输入区、Modal 内容）
- 相同结构出现 2 次
- 可独立测试的 UI 块（列表项、消息气泡已拆则保持）

### 5. JSX 内禁止膨胀

| 反模式 | 改法 |
|--------|------|
| `onClick={async () => { ...20 lines }}` | `const handleSend = useCallback(...)` 或 hook 返回 |
| 深层嵌套三元 | 早 return、子组件、或 `renderX()` 私有函数（仍要短） |
| fetch + setState 写在 `useEffect` 巨块 | `useChatSessions` 等命名 hook |

### 6. 与 ESLint 对齐

- 组件文件 **不要 export** hook/helper → 独立 `useX.ts` / `utils.ts`
- TanStack Virtual 等见 `common-failures.md`

## 何时拆文件

| 信号 | 动作 |
|------|------|
| 单页面文件 > ~200 行 | 抽 `hooks/`、`components/` 子目录 |
| hook 被多页复用 | `apps/web/src/hooks/` |
| 仅单页使用 | `pages/chat/hooks/` 共置 |

## 参考

- 已有 hook 抽取范例：`useRafStreamBuffer`、`ChatMessageVirtualList`
- 可继续拆分范例：`apps/web/src/pages/chat/index.tsx`（编排 + 多 hook 仍可再拆）

## 完成前

- `.ai/gates/frontend-quality.md`（结构）
- `.ai/gates/ui-quality.md`（布局与状态 UI）
- `pnpm exec lint-staged` 或 `pnpm -C apps/web exec eslint --fix --max-warnings=0`
