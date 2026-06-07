# 项目现状（新会话请先读此文件）

> 最后更新：2026-06-01

## 一句话

**文档 AI 工作平台**：RAG + 知识库 + 桌面壳 + **知识库 Finder** 已有；**GitHub CI + Playwright E2E** 已接入。**产品核心**仍是「平台内文档 + 用户输入 → 业务域 Skill（Tool Call）→ 反馈」— **F-00 尚未开工**。

## 产品方向（必读）

→ [功能规划 FEATURE-PLAN.md](../planning/FEATURE-PLAN.md)  
→ [方向决策](../memory/project-decisions.md#2026-05--产品方向文档-ai-工作平台)

## 已完成（技术底座）

| 存档 | 摘要 |
|------|------|
| [log/2026-05-jwt-dual-token.md](./log/2026-05-jwt-dual-token.md) | JWT 双 token 鉴权 |
| [log/2026-05-rag-backend.md](./log/2026-05-rag-backend.md) | RAG 后端与知识库基础 |
| [log/2026-05-rag-agentic.md](./log/2026-05-rag-agentic.md) | RAG Agentic 能力 |
| [log/2026-05-chat-raf-stream.md](./log/2026-05-chat-raf-stream.md) | 聊天流式 + rAF 节流 |
| [log/2026-05-macos-desktop-shell.md](./log/2026-05-macos-desktop-shell.md) | macOS 桌面壳 |
| [log/2026-05-ai-harness.md](./log/2026-05-ai-harness.md) | 开发侧 AI harness |
| [log/2026-05-product-pivot-doc-platform.md](./log/2026-05-product-pivot-doc-platform.md) | 产品方向 → 文档 AI 平台 |
| [log/2026-06-ci-e2e-kb-finder.md](./log/2026-06-ci-e2e-kb-finder.md) | **KB Finder、Playwright E2E、GitHub CI、Backend ESLint** |

## 进行中

- **产品：** 业务域 Skill 框架（F-00）、ChatPDF（F-05）等 — 见 FEATURE-PLAN

## 已搁置（方案已落盘）

- **F-13 Android 客户端** — 远程 WebView 壳 → 后期 Hybrid；见 `.ai/planning/feat-f-13-android-webview-shell/`

## 下一步建议（按新方向）

- [ ] 对齐 F-00：Skill 注册表、Tool Call 层、文档 scope、域路由
- [ ] 做 1～2 个示例业务域 Skill 原型（如通用文档问答）
- [ ] 演进 `chat` 为 Skill 执行入口；`chatService` refactor
- [ ] 工程债：前端 `max-lines-per-function` ≤80（大页面拆分后启用）

## 本地跑起来

```bash
pnpm dev
pnpm lint
pnpm build
pnpm test:e2e:smoke      # 需 e2e/.env + MySQL
```

## 关键路径速查

| 区域 | 路径 |
|------|------|
| **功能规划** | `.ai/planning/FEATURE-PLAN.md` |
| **CI** | `.github/workflows/ci.yml` |
| **E2E** | `e2e/`、`e2e/README.md` |
| RAG / 聊天 | `ragService.ts`、`chatService.ts` |
| 文档 / KB | `documentService.ts`、`KnowledgeBaseFinder.tsx` |
| 桌面壳 | `apps/web/src/desktop/` |
