---
name: macbook-ui
description: >-
  design_to_code macOS 桌面壳视觉：玻璃拟态、大圆角、克制配色。UI 页面与桌面壳专用；
  配合 tokens.css / shell / desktop。勿用全局 frontend-design（风格冲突）。
paths: apps/web/**/*.{tsx,css}, packages/components/**/*.{tsx,css}
---

# MacBook UI（design_to_code）

## 目标

生成具有 macOS / MacBook 风格的前端界面——干净、高级、克制、产品级桌面应用质感。

**本仓库 UI 视觉以本 skill 为准。** 不要使用全局 `frontend-design`（非常规字体、大胆创意风与本项目冲突）。

## 项目锚点

- 设计令牌：`apps/web/src/theme/tokens.css`
- Ant Design 主题：`apps/web/src/antdTheme.ts`
- 参考实现：`apps/web/src/desktop/`、`apps/web/src/components/shell/`

## 适用场景

- 新页面、聊天面板、侧边栏、设置页
- 桌面窗口 chrome、Dock、Finder 风格列表
- 优化现有页面视觉（在 shell 体系内）

## 视觉方向

- macOS 风格布局、浅色或深色玻璃面板
- 细腻渐变、大圆角、柔和阴影、半透明背景
- 清晰排版、充足留白、克制图标
- 冷静高级配色、类桌面窗口结构

## 布局模式

1. **应用窗口** — 大圆角容器、标题栏、红黄绿控制点、侧栏 + 主内容
2. **设置页** — 左导航 + 右详情、分组表单
3. **仪表盘** — 半透明卡片、细分割线、紧凑指标

布局 CSS 先读 `css-layout` + `scrollable-layout` skill，再套视觉样式。

## 配色

推荐：slate、zinc、neutral、stone；表面 white/black 透明；边框 white/10、zinc-200；强调 blue、indigo、violet、cyan、emerald。

避免：高饱和、随机渐变、赛博霓虹、大面积纯主色块。

## 字体

- Inter、SF Pro 风格、ui-sans-serif、system-ui
- 标题明确、描述简洁、字号层级少

## 组件风格

- 大圆角（rounded-2xl / rounded-3xl）
- backdrop-blur、bg-white/70、轻边框、shadow-xl
- 细腻 hover、弱化辅助文字色

Tailwind 示例：

```tsx
<div className="rounded-3xl border border-white/20 bg-white/70 shadow-2xl backdrop-blur-xl">
  ...
</div>
```

优先复用 `shell/`、`desktop/` 已有组件，不要另起一套视觉体系。
