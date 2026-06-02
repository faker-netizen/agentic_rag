---
name: ui-page-development
description: >-
  在 apps/web 中构建或重构 React 页面——桌面壳、玻璃拟态 UI、可滚动布局、Ant Design。
  用于新页面、聊天面板、侧边栏或 macOS 风格界面。
---

# UI 页面开发

## 快速开始

1. 阅读 `.ai/workflows/ui-page-development.md`
2. 新建基础组件前，优先复用 `apps/web/src/components/shell/` 和 `apps/web/src/desktop/`
3. 布局 CSS → `css-layout` skill；页内滚动 → `scrollable-layout` skill（或 `.cursor/rules/scrollable-layout.mdc`）
4. 视觉风格 → `macbook-ui` skill + `theme/tokens.css`（**勿用**全局 `frontend-design`）
5. 复杂页面 / 长组件 → `frontend-component` skill
6. 通过 `.ai/gates/frontend-quality.md`、`.ai/gates/ui-quality.md` 和 `.ai/gates/code-quality.md`

## 参考实现

- 桌面壳：`apps/web/src/desktop/`
- 窗口 chrome：`apps/web/src/components/shell/`
- 可滚动聊天：`apps/web/src/pages/chat/`

## 反模式

- 内容在固定壳内却用整页 document 滚动
- 用 `<Spin>` 包裹滚动容器（应使用 overlay loader）
- 大段业务逻辑写在 JSX 里
- 在组件文件中 export hook/工具函数（触发 ESLint react-refresh）

详细步骤：`.ai/workflows/ui-page-development.md`
