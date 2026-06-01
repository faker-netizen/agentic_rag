# UI 页面开发工作流

## 1. 调研

- 阅读目标路由/页面及父级布局（`RootLayout`、`DesktopShell`、窗口 chrome）。
- 列出 `shell/`、`desktop/` 中可复用的现有组件。

## 2. 布局

- 壳内固定视口 → 使用**页内滚动**，而非 body 滚动。
- 写 CSS/结构前阅读 `scrollable-layout` rule 及个人 skill。
- Grid 模式：header / body / footer 使用 `auto minmax(0, 1fr) auto`。

## 3. 视觉

- 设计令牌：`apps/web/src/theme/tokens.css`
- Ant Design：`antdTheme.ts`
- macOS 风格：`macbook-ui` 个人 skill；参考 `desktop.css`、`shell.css`

## 4. 逻辑

- 数据请求与状态抽到 hooks；读 `frontend-component` skill 控制函数/组件粒度。
- UI 层处理 loading、error、empty（不要只在 console 里处理）。

## 5. 验证

依次通过 `.ai/gates/frontend-quality.md`、`.ai/gates/ui-quality.md` 和 `.ai/gates/code-quality.md`。

DevTools 检查滚动区域：

- `clientHeight > 0`
- 内容溢出时：`clientHeight < scrollHeight`

参考：`apps/web/src/pages/chat/chat.css`

## 6. 提交

使用 `commit-workflow` skill。
