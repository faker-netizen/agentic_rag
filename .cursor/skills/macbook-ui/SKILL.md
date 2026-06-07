---
name: macbook-ui
description: >-
  design_to_code macOS / MacBook desktop UI fidelity skill.
  用于生成高保真 macOS 桌面应用界面：窗口 chrome、侧边栏、工具栏、Finder 风格列表、
  设置页、桌面壳、Dock、菜单感 UI。强调像原生 macOS 应用，而不是普通 Web 玻璃拟态。
  本项目 UI 视觉以本 skill 为准。禁止使用全局 frontend-design。
paths: apps/web/**/*.{tsx,css}, packages/components/**/*.{tsx,css}
---

# MacBook UI High Fidelity

## 目标

生成接近原生 macOS 桌面应用质感的前端界面。

不是泛泛的「玻璃拟态」，而是模拟 macOS 的完整桌面应用语言：

- 桌面窗口结构（MenuBar → 浮动窗口 → Dock）
- 标题栏 / 工具栏 / 交通灯按钮
- 左侧半透明 sidebar
- 右侧内容区
- Finder / Settings / Notes / Mail / Xcode 风格的信息层级
- 细腻边框、弱阴影、低对比文本、克制色彩
- 系统级圆角、留白、分割线、hover、selected 状态

最终效果应像一个真正运行在 MacBook 上的桌面应用，而不是「网页卡片套了 blur」。

**本仓库 UI 视觉以本 skill 为准。** 不要使用全局 `frontend-design`（非常规字体、大胆创意风与本项目冲突）。

---

## 项目锚点（实现前必读）

| 资源 | 路径 | 用途 |
|------|------|------|
| 设计令牌 | `apps/web/src/theme/tokens.css` | 颜色、圆角、阴影、间距、动效 CSS 变量 |
| Ant Design 主题 | `apps/web/src/theme/antdTheme.ts` | 组件 token 覆盖 |
| 窗口壳组件 | `apps/web/src/components/shell/` | `WindowShell`、`GlassSurface`、`MacSidebar`、`MacToolbar`、`MacAppPage`、`MacTrafficLights` |
| 桌面壳 | `apps/web/src/desktop/` | `DesktopShell`、`AppWindow`、`Dock`、`desktop.css` |
| 布局参考 | `apps/web/src/layout/RootLayout.tsx` | 侧栏 + 内容区标准组合 |
| Skill 示例 | `.cursor/skills/macbook-ui/examples/` | 路由页 / App 内页 / 设置页模板 |

**硬规则：优先复用已有 `shell/`、`desktop/` 组件与 `tokens.css` 变量，不要另起一套视觉系统。**

### Shell 组件选用

| 组件 | 何时用 |
|------|--------|
| `WindowShell` | 路由页最外层窗口（含交通灯） |
| `MacSidebar` | 左导航侧栏（封装 Ant Design Sider + 标准样式） |
| `MacAppPage` | 桌面 App 内页根容器（toolbar + body，无交通灯） |
| `MacToolbar` | App 内页顶部工具条 |
| `MacTrafficLights` | 自定义标题栏时复用交通灯（通常由 WindowShell/AppWindow 内置） |
| `GlassSurface` | 内容区玻璃面板 |
| `mac-button` / `mac-list` / `mac-scrollbar` | CSS 工具类（见 `shell.css`） |

### 已有 CSS 类名映射

实现时优先用项目类名，而非新建 `mac-*` 前缀（除非页面局部样式）：

| 规范概念 | 项目类名 / 变量 |
|----------|----------------|
| 窗口 frame | `.window-shell__frame` / `.app-window__frame` |
| 标题栏 | `.window-shell__titlebar` / `.app-window__titlebar` |
| 交通灯 | `.mac-traffic-lights` + `.mac-traffic-light--{close,minimize,zoom}` |
| 侧栏 | `.window-shell__sidebar` / `MacSidebar` |
| App 内页 | `.mac-app-page` / `MacAppPage` |
| App 工具栏 | `.mac-app-toolbar` / `MacToolbar` |
| 列表 | `.mac-list` + `.mac-list-item` |
| 滚动条 | `.mac-scrollbar` |
| 紧凑按钮 | `.mac-button` |
| 内容区 | `.window-shell__content` |
| 玻璃面板 | `.glass-surface--{panel,subtle,strong}` |
| 侧栏菜单 | `.mac-menu`（Ant Design Menu 覆盖） |
| 桌面背景 | `.desktop` |
| Dock | `.desktop-dock__inner` |

### 令牌优先

新增样式时 **先查 `tokens.css`**，能用变量就不写魔法数：

```css
/* 优先 */
border-radius: var(--radius-window);
background: var(--color-surface-glass);
border: 1px solid var(--color-border-subtle);
box-shadow: var(--shadow-window);
font-family: var(--font-ui);
color: var(--color-text-primary);
transition: background var(--motion-fast);
```

---

## 总体视觉原则

### 1. 原生感优先

界面应首先像 macOS 原生 App，而不是 SaaS Dashboard。优先参考：

| 模式 | 结构特征 |
|------|----------|
| **Finder** | 侧栏 + 文件列表 + 工具栏 |
| **System Settings** | 左导航 + 右设置分组 |
| **Notes** | 三栏、列表选择态 |
| **Mail** | 工具栏、列表、详情面板 |
| **Xcode** | 层级侧栏、紧凑 toolbar、分割线 |

### 2. 克制，不炫技

**允许：** 半透明面板、backdrop blur、柔和阴影、细边框、低饱和强调色、轻微渐变。

**避免：** 赛博霓虹、高饱和渐变、大面积主色块、卡片堆叠过多、Web3/游戏 UI、过强投影、过大图标、营销页视觉冲击。

### 3. 桌面壳优先于网页布局

两种入口，不要混用：

| 场景 | 包裹方式 |
|------|----------|
| 路由页（`/chat` 等） | `app-backdrop` → `WindowShell` → 侧栏 + 内容（见 RootLayout） |
| 桌面 App（Dock 打开） | `AppWindow` 已提供 chrome；**页面内不要再套 WindowShell** |

典型结构（路由页）：

```tsx
<div className="app-backdrop">
  <WindowShell title="..." toolbar={...}>
    <Layout className="window-shell__layout">
      <Sider className="window-shell__sidebar">
        <Menu className="mac-menu" ... />
      </Sider>
      <Content className="window-shell__content">
        <GlassSurface variant="panel" padding="none" flex>
          {/* 页面内容 */}
        </GlassSurface>
      </Content>
    </Layout>
  </WindowShell>
</div>
```

典型结构（桌面 App 内页）：

```tsx
<div className="my-app-page">
  {/* 只有 toolbar + 内容，无交通灯 */}
  <header className="my-app-toolbar">...</header>
  <div className="my-app-body">...</div>
</div>
```

布局 CSS 先读 `css-layout` + `scrollable-layout` skill，再套视觉样式。

---

## 尺寸规范

### 窗口

桌面浮动窗口（`AppWindow`）由 windowManager 控制 rect；全屏路由页窗口：

```css
.window-shell {
  height: calc(100vh - var(--space-window-gutter) * 2); /* tokens: 16px gutter */
}
```

推荐尺寸参考（新建桌面窗口默认值）：

```css
width: min(1180px, calc(100vw - 48px));
height: min(780px, calc(100vh - 48px));
border-radius: var(--radius-window); /* 20px */
```

### 圆角层级

| 元素 | 值 | tokens |
|------|-----|--------|
| 主窗口 | 18–22px | `--radius-window` (20px) |
| 弹窗 / 浮层 | 14–18px | `--radius-lg` (16px) |
| 卡片 / 面板 | 12–16px | `--radius-md` / `--radius-lg` |
| 按钮 / 输入 | 8–12px | `--radius-sm` (8px) |
| 小控件 | 6–8px | — |

**禁止** 滥用 `rounded-3xl`。macOS 不是所有东西都巨大圆角。

### 标题栏

项目现状（`shell.css`）：`padding: 10px 16px`，约 **44–52px** 视觉高度。

| 类型 | 高度 |
|------|------|
| 紧凑 | 44px |
| 标准 | 52px |
| 带工具栏 | 56–64px |

桌面 MenuBar：`.desktop-menubar` 固定 **28px**。

### 交通灯按钮

**必须严格控制：**

```css
.window-shell__traffic { gap: 7px; }  /* 项目现状；规范上限 8px */
.window-shell__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
```

颜色（项目已对齐 macOS）：

| 按钮 | 背景 | 边框 |
|------|------|------|
| close | `#ff5f57` | `rgba(0,0,0,0.08)` 或 `#e0443e` |
| minimize | `#febc2e` | 同上 |
| zoom | `#28c840` | 同上 |

### 侧边栏

| 场景 | 宽度 |
|------|------|
| 标准侧栏 | 220–260px（RootLayout Sider: **220px**） |
| 三栏-左导航 | 220–260px |
| 三栏-中列表 | 280–360px |
| 三栏-右详情 | flex 自适应 |

### 内容间距

紧凑、系统感：

| 区域 | padding |
|------|---------|
| 窗口内边距 | 通常 0 |
| toolbar 横向 | 16–20px |
| sidebar | 8–12px（`.mac-menu` 为 8px） |
| content | 16–24px（`--space-panel-md/lg`） |
| 表单组间距 | 20–28px |
| 列表项高度 | 32–44px |

**避免** 网页式大留白：`p-12`、`gap-12`。

---

## 颜色规范

### 浅色模式（与 tokens.css 对齐）

```css
/* tokens.css 已有 */
--color-bg-base: #f4f4f5;
--color-accent: #007aff;
--color-text-primary: rgba(0, 0, 0, 0.88);
--color-text-secondary: rgba(0, 0, 0, 0.55);
--color-text-tertiary: rgba(0, 0, 0, 0.38);
--color-surface-glass: rgba(255, 255, 255, 0.72);
--color-border-subtle: rgba(0, 0, 0, 0.06);
--color-border-glass: rgba(255, 255, 255, 0.55);
```

扩展参考（页面局部 CSS 可用）：

```css
--mac-sidebar-bg: rgba(255, 255, 255, 0.25);      /* shell 侧栏现状 */
--mac-selected-bg: rgba(0, 122, 255, 0.10);        /* mac-menu selected */
--mac-selected-text: var(--color-accent);
--mac-hover-bg: rgba(0, 0, 0, 0.04);
```

### 深色模式（目标值，实现时扩展 tokens）

```css
--mac-window-bg: rgba(28, 28, 30, 0.82);
--mac-sidebar-bg: rgba(36, 36, 38, 0.68);
--mac-content-bg: rgba(30, 30, 32, 0.78);
--mac-border: rgba(255, 255, 255, 0.10);
--mac-text: rgba(255, 255, 255, 0.92);
--mac-selected-bg: rgba(10, 132, 255, 0.28);
```

新页面至少保证在深色桌面背景（`.desktop`）下文字可读。

### 强调色

主色：`--color-accent` / `#007AFF`。辅助色（indigo、violet、cyan、emerald、amber）仅用于状态、徽标、图标点缀。

**禁止：** 大面积蓝紫渐变背景、亮粉主视觉、高饱和 neon、纯黑纯白硬切。

---

## 背景与玻璃质感

### 路由页背景（`app-backdrop`）

低对比 mesh gradient + 轻微 grain（见 `shell.css`）。不要强烈渐变。

### 桌面背景（`.desktop`）

深色壁纸风格，柔和 radial gradient（见 `desktop.css`）。

### 窗口玻璃

项目窗口 frame 样式（优先复用，不要重写）：

```css
.window-shell__frame,
.app-window__frame {
  background: var(--color-surface-glass);          /* 或 --color-surface-glass-strong */
  backdrop-filter: blur(var(--blur-glass));      /* 20px */
  border: 1px solid var(--color-border-glass);
  box-shadow: var(--shadow-window);
  border-radius: var(--radius-window);
}
```

**关键：** 不要让每个子卡片都强 blur。通常只有窗口 frame、sidebar、toolbar 有玻璃质感；内容卡片用 `glass-surface--panel` 轻透明即可。

---

## 排版规范

### 字体

```css
font-family: var(--font-ui);
/* -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", ... */
```

展示标题（登录页等）可用 `--font-display`（Instrument Serif），**桌面 App 内页默认不用 display 字体**。

### 字号（macOS 桌面偏紧凑）

| 场景 | 字号 |
|------|------|
| sidebar item | 13px |
| toolbar / titlebar title | 13px |
| 列表项标题 | 13–14px |
| 列表项描述 | 12px |
| 页面标题 | 20–24px |
| 设置分组标题 | 13–15px |
| Dock 标签 | 11px |

**禁止** 营销页式 `text-4xl` 大标题。

### 字重

常规 400、标签 500、标题 600。**少用 `font-bold`**。

---

## 标题栏 / Toolbar

必须具备：左侧交通灯 → 居中/左对齐标题 → 右侧工具按钮 → 底部分割线。

项目参考（`WindowShell`）：

```tsx
<header className="window-shell__titlebar">
  <div className="window-shell__traffic" aria-hidden>
    <span className="window-shell__dot window-shell__dot--red" />
    <span className="window-shell__dot window-shell__dot--yellow" />
    <span className="window-shell__dot window-shell__dot--green" />
  </div>
  <div className="window-shell__title">{title}</div>
  <div className="window-shell__toolbar">{toolbar}</div>
</header>
```

App 内 toolbar（无交通灯）参考 ChatPDF：

```css
.chatpdf-toolbar {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
```

---

## Sidebar

### 结构

```tsx
<Sider width={220} className="window-shell__sidebar">
  <Menu className="mac-menu" theme="light" mode="inline" items={...} />
</Sider>
```

### 样式要点（`shell.css` 已定义）

- 背景：`rgba(255, 255, 255, 0.25)` + `blur(12px)`
- 右边框：`var(--color-border-subtle)`
- 菜单项圆角：`var(--radius-sm)` (8px)
- selected：`rgba(0, 122, 255, 0.1)` + `color: var(--color-accent)`
- hover：`rgba(0, 0, 0, 0.04)`

### 图标

- sidebar：**16px**，`strokeWidth={1.75}`
- toolbar：15–17px
- 内容区：18–20px
- **禁止** 大图标堆叠

---

## Content Area

```tsx
<Content className="window-shell__content">
  <GlassSurface variant="panel" padding="none" flex>
    <Outlet />
  </GlassSurface>
</Content>
```

App 内页模式（ChatPDF 三栏）：

```css
.my-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;           /* 滚动链必须 */
  background: rgba(255, 255, 255, 0.45);
}
.my-page__body {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}
```

---

## Cards / 面板

用 `GlassSurface`，不要 SaaS 重阴影：

```tsx
<GlassSurface variant="panel" padding="md">...</GlassSurface>
<GlassSurface variant="subtle" padding="sm">...</GlassSurface>
```

对应 CSS：轻边框 + `--shadow-soft`，**禁止** 每张卡片 `shadow-2xl backdrop-blur-3xl rounded-3xl bg-gradient-to-br`。

---

## Buttons

### 默认（次要）

```css
height: 30px;
padding: 0 12px;
border-radius: var(--radius-sm);
font-size: 13px;
font-weight: 500;
background: rgba(255, 255, 255, 0.62);
border: 1px solid rgba(0, 0, 0, 0.10);
box-shadow: 0 1px 1px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.72);
```

### 主按钮

Ant Design `type="primary"` 已通过 `colorPrimary: #007AFF` 对齐。**一个区域最多一个 primary**。

项目局部按钮示例（ChatPDF）：

```css
.chatpdf-toolbar__btn {
  padding: 4px 12px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: rgba(255, 255, 255, 0.8);
}
```

---

## Inputs

```css
height: 32px;
padding: 0 10px;
border-radius: var(--radius-sm);
font-size: 13px;
background: rgba(255, 255, 255, 0.66);
border: 1px solid rgba(0, 0, 0, 0.11);
```

focus：`border-color: rgba(0, 122, 255, 0.65)` + `box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.18)`。

搜索框：`background: rgba(0, 0, 0, 0.055)`，高度 30px。

---

## Lists

Finder / Mail 风格：

```css
.mac-list-item {
  min-height: 38px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
}
.mac-list-item:hover { background: rgba(0, 0, 0, 0.045); }
.mac-list-item.selected { background: rgba(0, 122, 255, 0.14); }
```

表格行：`height: 38px`，`border-bottom: 1px solid rgba(0, 0, 0, 0.065)`。

---

## Settings Page

模仿 System Settings：左导航 + 右详情分组。

```css
.settings-group {
  border-radius: var(--radius-lg);
  background: var(--color-surface-glass);
  border: 1px solid var(--color-border-subtle);
  overflow: hidden;
}
.settings-row {
  min-height: 48px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.settings-row + .settings-row {
  border-top: 1px solid var(--color-border-subtle);
}
```

---

## Dock

项目已实现（`desktop.css`）。关键尺寸：

| 元素 | 值 |
|------|-----|
| Dock 容器 | `border-radius: 18px`，`padding: 8px 14px` |
| Dock 图标 | 48×48px，`border-radius: 12px` |
| hover | `translateY(-6px) scale(1.06)` — 可略减至 -4px / 1.06 |

---

## 动效

```css
--motion-fast: 150ms ease;   /* tokens.css */
--motion-base: 200ms ease;
/* 推荐 ease: cubic-bezier(0.2, 0.8, 0.2, 1) */
```

常规 transition：`background-color`、`border-color`、`box-shadow`、`transform`，**160–200ms**。

**禁止：** 弹跳过强、卡片飞入、大幅旋转、复杂 loading、粒子效果。

---

## 滚动条

页内滚动容器加细滚动条类：

```css
.mac-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.22) transparent;
}
.mac-scrollbar::-webkit-scrollbar { width: 10px; }
.mac-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.22);
  border-radius: 999px;
  border: 3px solid transparent;
  background-clip: content-box;
}
```

---

## Tailwind 使用规则

可用 Tailwind，但写 **精确值**，不要 Web 默认语义类：

```tsx
// 推荐
<div className="overflow-hidden rounded-[20px] border border-white/40 bg-white/70 shadow-[0_24px_64px_rgba(0,0,0,0.12)] backdrop-blur-[20px]" />

// 常用精确 token
rounded-[20px]  h-[52px]  w-[244px]  text-[13px]  text-[12px]
bg-white/[0.72]  border-black/[0.08]  backdrop-blur-[20px]
```

**少用：**

```tsx
rounded-3xl  shadow-2xl  text-lg  p-10  gap-10
bg-gradient-to-br  from-blue-500  to-purple-500
```

优先 CSS 模块 / 页面 CSS + `tokens.css` 变量；Tailwind 用于局部微调。

---

## Ant Design 适配

通过 `apps/web/src/theme/antdTheme.ts` 统一覆盖。现状与目标：

| Token | 现状 | 目标 |
|-------|------|------|
| `colorPrimary` | `#007AFF` | 保持 |
| `borderRadius` | 8 | 8–12 |
| `fontFamily` | SF Pro 栈 | 保持 |
| `Button.controlHeight` | 36 | 可降至 30–32 |
| `Menu.itemHeight` | 40 | 可降至 32–36 |
| `colorBorderSecondary` | `rgba(0,0,0,0.06)` | 保持 |

组件风格：

- **Button**：紧凑、轻阴影、低对比边框
- **Input / Select**：32px 高，圆角 8px
- **Modal**：圆角 16px，轻透明背景
- **Table**：行高 38px，极细分割线
- **Menu**：sidebar 用 `.mac-menu`，selected 浅蓝底，不要深色大块

---

## 执行流程

生成 UI 前按顺序自检：

1. **哪种 macOS App 模式？** Finder / Settings / Notes / Mail / Dashboard / Floating Panel
2. **是否需要窗口壳？** 路由页 → `WindowShell`；桌面 App → 仅内容（`AppWindow` 已有 chrome）
3. **能否复用 shell/desktop？** 优先 `WindowShell`、`GlassSurface`、`mac-menu`
4. **布局是否桌面化？** titlebar / sidebar / toolbar / content / detail panel
5. **样式是否克制？** 无强渐变、无大留白、控件紧凑
6. **滚动链是否正确？** 读 `scrollable-layout` skill，`min-height: 0` + `overflow: auto` 在正确容器
7. **loading/error/empty？** 请求态必须处理

---

## 验收标准

生成结果必须满足：

- [ ] 第一眼像 macOS 桌面应用，不是普通网页
- [ ] 有明确窗口 chrome 或正确的 App 内页结构（不重复交通灯）
- [ ] 交通灯 12px，gap 7–8px
- [ ] sidebar 半透明、紧凑、分组明确；selected 淡蓝
- [ ] toolbar 高度、边框、按钮接近 macOS
- [ ] 主内容留白克制，字号多数 12–14px
- [ ] 图标多数 15–18px
- [ ] 卡片阴影轻、边框细
- [ ] hover/active 动效细腻（150–200ms）
- [ ] 无随机渐变、霓虹色、重投影、`rounded-3xl` 滥用
- [ ] 使用了 `tokens.css` 或项目 shell 类名

---

## 禁止项

绝对不要：

- 使用全局 `frontend-design`
- 使用营销页 Hero 风格
- 赛博朋克 / 霓虹风
- 大面积纯蓝 / 纯紫背景
- 巨大渐变卡片
- 每个卡片都 `backdrop-blur-xl`
- 大量 `shadow-2xl`、`rounded-3xl`、`text-4xl+`
- 页面像 Admin Dashboard
- 忽略 `tokens.css` 和 `shell/` / `desktop/` 组件
- 在 `AppWindow` 内再套一层 `WindowShell`

---

## 项目示例

### 示例 A：路由页标准布局

参考 `apps/web/src/layout/RootLayout.tsx` — `WindowShell` + `mac-menu` 侧栏 + `GlassSurface` 内容。

### 示例 B：桌面 App 内页（三栏）

参考 `apps/web/src/pages/chatpdf/`：

```tsx
// index.tsx — 无 WindowShell，填满 app-window__body
<div className="chatpdf-page">
  <ChatPdfToolbar ... />
  <div className="chatpdf-layout">
    <ChatPdfViewer ... />      {/* flex: 1 */}
    <ChatPdfSummaryPanel ... /> {/* width: 360px, flex-shrink: 0 */}
  </div>
</div>
```

```css
/* chatpdf.css — 关键模式 */
.chatpdf-page { height: 100%; min-height: 0; display: flex; flex-direction: column; }
.chatpdf-layout { flex: 1; min-height: 0; display: flex; overflow: hidden; }
.chatpdf-viewer__doc { flex: 1; min-height: 0; overflow: auto; }
```

### 示例 C：登录页（独立窗口卡片）

参考 `apps/web/src/pages/login/` — `GlassSurface variant="strong"` + `DisplayHeading`（仅登录/展示页使用 display 字体）。

### 反例（不要这样做）

```tsx
// BAD: AppWindow 内再套 WindowShell → 双层交通灯
<AppWindow>
  <WindowShell title="Chat">...</WindowShell>
</AppWindow>

// BAD: 营销页风
<h1 className="text-5xl font-bold bg-gradient-to-r from-purple-500 to-pink-500">
  Welcome
</h1>

// BAD: 每张卡片强 blur + 大阴影
<div className="rounded-3xl shadow-2xl backdrop-blur-3xl bg-gradient-to-br from-blue-400 to-purple-600 p-12">
```

---

## 工程化资产

三部分已落地，生成 UI 时 **直接引用** 而非重写：

### 1. `tokens.css` — 设计令牌

路径：`apps/web/src/theme/tokens.css`

关键变量：

| 类别 | 变量示例 |
|------|----------|
| 布局 | `--mac-titlebar-height`、`--mac-sidebar-width`、`--mac-traffic-size` |
| 表面 | `--mac-titlebar-bg`、`--mac-sidebar-bg`、`--mac-app-page-bg` |
| 交互 | `--mac-hover-bg`、`--mac-selected-bg`、`--mac-focus-ring` |
| 字号 | `--text-base` (13px)、`--text-sm` (12px)、`--text-title` (24px) |
| 控件 | `--mac-control-height`、`--mac-button-height`、`--mac-list-item-height` |
| 深色 | `[data-theme="dark"]` 块（预留，未默认启用） |

### 2. Shell 组件 — React 骨架

路径：`apps/web/src/components/shell/`

```tsx
import {
  WindowShell,
  MacSidebar,
  MacAppPage,
  MacToolbar,
  GlassSurface,
} from "@/components/shell";
```

### 3. Skill 示例 — 完整页面模板

路径：`.cursor/skills/macbook-ui/examples/`

| 文件 | 场景 |
|------|------|
| `route-page-layout.tsx` | 路由页：WindowShell + MacSidebar + GlassSurface |
| `app-inner-page.tsx` | 桌面 App：MacAppPage + MacToolbar + 三栏 |
| `settings-page-layout.tsx` | System Settings 风格分组表单 |

---

## 相关 Skill

| Skill | 何时读 |
|-------|--------|
| `ui-page-development` | 新页面入口流程 |
| `css-layout` | Flex 布局 |
| `scrollable-layout` | 页内滚动链 |
| `frontend-component` | 组件 / hook 拆分 |
