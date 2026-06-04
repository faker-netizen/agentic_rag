# UI 页面开发工作流

## 1. 调研

- 阅读目标路由/页面及父级布局（`RootLayout`、`DesktopShell`、窗口 chrome）。
- 列出 `shell/`、`desktop/` 中可复用的现有组件。

## 2. 布局

- 壳内固定视口 → **页内滚动**，非 body 滚动
- 写 CSS/结构前：`css-layout` skill（flex 优先）→ `scrollable-layout` skill / rule
- DOM 固定三段时可用 grid `auto minmax(0, 1fr) auto`；子节点数量会变时用 flex 列

## 3. 视觉

- 设计令牌：`apps/web/src/theme/tokens.css`
- Ant Design：`antdTheme.ts`
- macOS 风格：`.cursor/skills/macbook-ui/SKILL.md`；参考 `desktop.css`、`shell.css`、`tokens.css`

## 4. 逻辑

- 数据请求与状态抽到 hooks；读 `frontend-component` skill 控制函数/组件粒度。
- UI 层处理 loading、error、empty（不要只在 console 里处理）。

## 5. 验证

依次通过 `.ai/gates/frontend-quality.md`、`.ai/gates/ui-quality.md`；实现后走 [post-implementation](../gates/post-implementation.md)（硬/软门禁 + 用户目视 + **询问 E2E**）。

DevTools 检查滚动区域：

- `clientHeight > 0`
- 内容溢出时：`clientHeight < scrollHeight`

**E2E：** 用户同意后执行（见 [post-implementation](../gates/post-implementation.md)）：

```bash
pnpm test:e2e:smoke
```

说明见 [`e2e/README.md`](../../e2e/README.md)、[Playwright 方案](../planning/playwright-e2e-design.md)。

参考：`apps/web/src/pages/chat/chat.css`

## 6. 提交

使用 `commit-workflow` skill。
