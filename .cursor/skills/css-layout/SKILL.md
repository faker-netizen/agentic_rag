---
name: css-layout
description: >-
  apps/web 页面与组件 CSS 布局：默认 flex 一维分配，仅在二维网格或显式行列对齐时用
  grid。编写或修复布局、overflow 滚动、嵌套 shell（窗口/Layout/Spin）时使用。
paths: apps/web/**/*.{tsx,css}, packages/components/**/*.{tsx,css}
---

# CSS 布局：Flex 优先

## 默认原则

> **一维结构用 flex，二维结构才用 grid。**

| 维度 | 首选 | 典型场景 |
|------|------|----------|
| 纵向堆叠（顶栏 → 内容 → 底栏） | **flex 列** | 桌面窗口、Finder、聊天页、Modal 内容区 |
| 横向排列（图标 + 标题 + 操作） | **flex 行** | 工具栏、列表行、顶栏菜单 |
| 二维网格（行列同时约束） | **grid** | 仪表盘卡片、相册、表单 label\|input 双列 |
| 页内滚动 | **flex + `min-height: 0`** | 见下文「可滚动区域」 |

**不要**为了「看起来整齐」默认写 grid；grid 行数必须与 DOM 子节点稳定对应，否则易出现高度塌缩（见反例）。

---

## 决策流程

```
需要布局？
├─ 只是上下或左右堆叠？
│    └─ flex（column 或 row）
├─ 需要多列等宽 / 同一行等高 / 跨行跨列？
│    └─ grid
├─ 中间区域要滚动？
│    └─ flex 列 + 滚动宿主 flex:1 min-height:0
│         └─ 嵌套深或 absolute 列表 → 见 scrollable-layout Pattern B
└─ 实现后 DevTools：滚动宿主 clientHeight > 0
```

---

## Flex 标准模式

### 壳层 + 可伸缩内容（最常用）

```css
.panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel__header,
.panel__footer {
  flex-shrink: 0;
}

.panel__body {
  flex: 1;
  min-height: 0;
  overflow: hidden; /* 内部再开 scroll-area */
}
```

**父链要求：** 每一层 flex 子项若需占满剩余高度，都要 `flex: 1; min-height: 0`。参考 `app-window__body` → 页面根 → 面板。

### 工具栏行

```css
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.toolbar__spacer {
  flex: 1;
}
```

---

## 何时用 Grid

仅在 flex 无法清晰表达时使用：

| 适合 grid | 不适合 grid（改用 flex） |
|-----------|-------------------------|
| 仪表盘 2×3 卡片，行列间距一致 | 顶栏 + **可选** alerts + 列表（子节点数量会变） |
| 表单两列：label 右对齐 + input | 侧栏 header + 长列表 |
| 日历、棋盘、等分宫格 | 聊天 header + messages + composer |
| 明确 `grid-template-areas` 的复杂静态版面 | 仅为了「三行 auto/1fr/auto」——flex 更简单 |

若坚持用 grid 做 header/body/footer，**行数必须与子节点一致**，或给子节点显式 `grid-row`；**hidden / `display:none` 的节点不占行**，会导致 body 落到 `auto` 行而高度为 0。

---

## 可滚动区域

与 `.cursor/skills/scrollable-layout/SKILL.md` 配合：

1. **默认：** flex 列分配高度（本 skill），不用 grid 三行除非 DOM 结构固定三行。
2. **滚动宿主：** `flex: 1; min-height: 0; overflow: hidden`
3. **滚动层：** 单一 `overflow-y: auto`；嵌套 antd/Spin/虚拟列表时用 absolute scroll（Pattern B）
4. **禁止：** Spin 包裹滚动内容；多层 `overflow: auto` 竞争

项目参考：

- `apps/web/src/pages/knowledge-bases/finder.css` — flex 列 + list-host
- `apps/web/src/pages/chat/chat.css` — 聊天主区（grid 仅用于固定三段的 chat-main，DOM 稳定）

---

## 反例（真实 bug）

**错误：** Finder 使用 `grid-template-rows: auto auto 1fr`，但无 alerts 时只有 toolbar + list 两个可见子节点 → list 落在第二行 `auto` 上，内部 `position: absolute` 列表不撑高 → **计数显示 3 项，列表不可见**。

**修复：** 改为 flex 列，`.kb-finder__list-host { flex: 1; min-height: 0; }`。

---

## 实现检查清单

```
[ ] 能用 flex 描述的一维结构未 unnecessary 使用 grid
[ ] flex 子项需要收缩处写了 min-height: 0（或 min-width: 0）
[ ] 滚动区域只有一个 overflow-y: auto
[ ] grid 行/列数与稳定 DOM 子节点匹配
[ ] DevTools：滚动宿主 clientHeight > 0
```

---

## 与 Ant Design

- `Layout` / `Sider` / `Content`：外层 flex 列，Content `flex:1; min-height:0`
- Modal 内容：flex 列，避免 grid 行数与表单项数量耦合
- 列表在固定视口内：flex 分配 + ScrollHost，见 scrollable-layout
