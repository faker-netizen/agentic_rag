---
name: scrollable-layout
description: >-
  apps/web 页内滚动：嵌套 shell、antd Layout/Spin、虚拟列表中的 overflow 与 ScrollHost。
  与 css-layout 配合。勿用全局 frontend-design。
paths: apps/web/**/*.{tsx,css}, packages/components/**/*.{tsx,css}
---

# Scrollable Layout Design

Guide for designing components whose content scrolls inside a fixed viewport — validated on design_to_code chat page (grid + absolute scroll region).

**先读** `.cursor/skills/css-layout/SKILL.md`（flex 优先），再读本 skill（滚动层细节）。

## When to Apply

Use this skill when building:

- Chat / message lists
- Sidebars with long item lists
- Master-detail panels (left list + right content)
- Tables or virtual lists inside app shells
- Any UI where `overflow: auto` is set but scroll doesn't work

---

## Core Principle

> **A scroll region only works when it has a bounded height smaller than its content.**

The scroll element must be the **single owner** of `overflow-y: auto`. Every ancestor above it must **allocate space** without growing with content.

---

## Choose a Pattern

| Scenario | Recommended pattern |
|---|---|
| Page with fixed header + scroll body + fixed footer | **Flex 列**（默认，见 Pattern C） |
| Optional middle blocks (alerts, tabs) — child count varies | **Flex 列** — 不要用固定行数 grid |
| True 2D layout (dashboard tiles, form columns) | **Grid** |
| Scroll inside deeply nested wrappers (antd Layout, Spin, glass shell) | **绝对定位滚动层**（见 Pattern B） |
| Full-page document scroll | Normal flow — **不需要**本 skill |

**Default for app-internal panels:** Pattern C (flex) + B when needed (flex 分配高度，复杂嵌套用 absolute scroll).

**Grid 三行**（Pattern A）仅当 DOM 始终为 header + body + footer 三段且不会插入额外 grid 子节点时使用；否则优先 flex。

---

## Pattern A — Grid 三行（定高分配，慎用）

用于：DOM **固定**为顶栏 / 滚动区 / 底栏 三段，且中间不会动态增减 grid 子项。

```css
.panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.panel__header { /* auto */ }
.panel__body   { min-height: 0; overflow: hidden; }  /* 1fr 行 */
.panel__footer { /* auto */ }
```

**关键：** 中间行必须用 `minmax(0, 1fr)`。**警告：** 若写 `auto auto 1fr` 但实际只有 2 个可见子节点，body 会落在 `auto` 行且高度塌缩——改用 Pattern C。

项目内 flex 优先约定：`.cursor/skills/css-layout/SKILL.md`

---

## Pattern B — 绝对定位滚动层（最稳）

用于：grid/flex 中间那一格仍无法可靠传递高度时（antd、Spin、多层 shell）。

```css
.scroll-host {
  position: relative;
  min-height: 0;
  overflow: hidden;
}

.scroll-area {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
```

**DOM 结构：**

```tsx
<div className="scroll-host">
  {loading && <div className="scroll-host__overlay"><Spin /></div>}
  <div className="scroll-area" ref={scrollRef}>
    {children}
  </div>
</div>
```

**规则：**

- `scroll-host` 负责占位（来自 grid 的 `1fr` 或 flex `flex:1`）
- `scroll-area` 负责滚动（`inset:0` 填满 host）
- loading 用 **overlay**，不要用 Spin 包裹 scroll 内容

---

## Pattern C — Flex 侧栏列表

用于：结构简单、嵌套少（header + list）。

```css
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.sidebar__header { flex-shrink: 0; }

.sidebar__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
```

若中间有 antd Spin，需额外给 `.ant-spin-nested-loading` 和 `.ant-spin-container` 加 `flex:1; min-height:0; overflow:hidden`，**但仍不要**让 Spin 包住 scroll 节点本身。

---

## Component Design Template

设计可滚动组件时，按此结构拆分：

```
ScrollPanel (flex 列 或 固定三段 grid)
├── PanelHeader     — flex-shrink: 0，不滚动
├── ScrollHost      — position: relative; min-height: 0
│   ├── LoadingOverlay (optional, absolute)
│   └── ScrollArea    — absolute inset:0; overflow-y:auto  ← 唯一滚动层
└── PanelFooter     — flex-shrink: 0，不滚动
```

**React 组件命名建议：**

| 组件 | 职责 |
|---|---|
| `ScrollHost` | 占位容器，`position: relative` |
| `ScrollArea` | 滚动容器，ref 挂在这里 |
| `ScrollPanel` | 外壳，组合 header/body/footer |

虚拟列表（TanStack Virtual）的 `getScrollElement()` **必须**指向 `ScrollArea` 的 DOM 节点。

---

## Framework Notes

### Ant Design

- `Layout` / `Content` / `Sider` 会插入额外 DOM，优先 Pattern B
- **禁止** `<Spin spinning><ScrollArea /></Spin>` — 改用 overlay
- 覆盖默认 padding：`padding: 0 !important` 若 grid 需要贴边

### TanStack Virtual / react-window

- 先确认 scroll 容器 `clientHeight > 0`（DevTools）
- 再确认 `clientHeight < scrollHeight`（内容超出时）
- `estimateSize` 不准只会导致跳动，**不会**导致完全无法滚动

### App Shell（GlassSurface / WindowShell）

- Shell 可用 `overflow: hidden`
- 页面根节点：`flex: 1; min-height: 0`
- 滚动发生在 shell **内部**的 ScrollArea，不在 shell 上

---

## Anti-Patterns

| 不要 | 原因 |
|---|---|
| 在 flex 子项上用 `height: 100%` 当滚动方案 | 父级高度来自 flex 时，百分比常失效 |
| 多层都写 `overflow: auto` | 多个滚动容器竞争，行为不可预测 |
| Spin 包裹虚拟列表 | 额外 wrapper 打断高度链 |
| 只靠 `flex:1` 不加 `min-height:0` | flex 子项被内容撑开，无法收缩 |
| 不设 bounded height 就调 virtual list | 视口高度为 0，列表渲染异常 |

---

## Verification Checklist

实现完成后必查：

```
[ ] 滚动层是唯一 overflow-y: auto 的节点
[ ] DevTools：scroll 元素 clientHeight > 0
[ ] 内容足够多时：clientHeight < scrollHeight
[ ] 鼠标滚轮 / 触控板 / 拖动滚动条均可用
[ ] 流式追加内容时（如 chat）自动滚到底仍正常
[ ] loading 状态不替换/卸载 scroll 容器（用 overlay）
```

---

## Reference Implementation

项目内参考：

- `apps/web/src/pages/knowledge-bases/finder.css` — flex 列 + list-host
- `apps/web/src/pages/chat/chat.css` — 聊天主区、虚拟列表、侧栏

---

## Quick Decision Flow

```
需要页面内滚动（非整页）？
  ├─ 一维堆叠（header / body / footer）？
  │    └─ 默认 Flex 列：body flex:1 min-height:0（见 css-layout skill）
  ├─ 有 header/footer 且 DOM 固定三段、无动态插入行？
  │    └─ 可用 Grid: auto | minmax(0,1fr) | auto
  ├─ 嵌套 antd / Spin / 多层 shell？
  │    └─ 中间格用 ScrollHost + ScrollArea (absolute)
  ├─ 仅 sidebar 列表？
  │    └─ Flex 列 + list flex:1 min-height:0 overflow:auto
  └─ 实现后 DevTools 验证 clientHeight
```

Flex 优先总纲：`.cursor/skills/css-layout/SKILL.md`
