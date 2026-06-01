# macOS 桌面壳与前端重构

- **日期**：2026-05-31
- **Commit**：`8af15e0`
- **状态**：已完成

## 做了什么

- macOS 风格桌面壳：`DesktopShell`、Dock、多窗口、`WindowShell` / `GlassSurface`
- 路由懒加载、`antdTheme` + design tokens
- 聊天页 UI 适配新壳层
- Husky + lint-staged pre-commit（web TS/TSX ESLint）

## 涉及范围

- **Packages / Apps**：`apps/web`
- **主要文件**：`apps/web/src/desktop/`、`components/shell/`、`router/`、`theme/`

## 如何验证

```bash
pnpm -C apps/web dev
# 登录后桌面、dock 开窗口；/chat 重定向 ?open=chat
pnpm exec lint-staged
```

## 遗留 / 下一步

- 部分页面仍走旧 layout 模式，可逐步迁入 desktop appRegistry

## 相关链接

- `.ai/memory/project-decisions.md` — 桌面壳路由决策
