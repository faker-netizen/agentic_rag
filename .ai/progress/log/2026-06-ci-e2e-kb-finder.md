# 存档点：知识库 Finder、Playwright E2E 与 GitHub CI

- **日期**：2026-06-01
- **Commit**：`7cc1004` → `1593639`（`dev` 分支）
- **状态**：已完成

## 做了什么

- **知识库 Finder**：桌面壳内独立 Finder 窗口，浏览 KB 文档、分块上传、文档列表与状态；`useKnowledgeBaseDocuments` / `useKnowledgeBaseList` hooks 拆分页面逻辑
- **Playwright E2E**：根目录 `e2e/`，smoke（登录、桌面壳、KB 新建+Finder+上传）与 integration（聊天 SSE mock）；`pnpm test:e2e:smoke` 等脚本
- **GitHub Actions CI**：`.github/workflows/ci.yml`，`lint` → `build` → `@smoke` E2E（MySQL 8 service + 种子管理员）；触发 `main` / `dev` push 与 PR
- **Backend ESLint**：`apps/backend/eslint.config.js`，函数 ≤40 行、`no-explicit-any`；lint-staged 对 backend 变更跑 ESLint + `tsc --noEmit`
- **CI 构建修复**：移除误提交的 `tsbuildinfo`（导致 CI 上 `tsc` 跳过 emit、web 找不到 `@d2c/utils` 类型）；共享包增量缓存改到 `node_modules/.tmp/`
- **Harness 收拢**：`scrollable-layout`、`macbook-ui`、`css-layout` 迁入 `.cursor/skills/`；补充 requirements-design 工作流与 E2E 设计文档

## 涉及范围

- **Packages / Apps**：`apps/web`（KB Finder、desktop 窗口）、`apps/backend`（路由/Service 拆分）、`packages/utils` & `components`（构建配置）
- **主要文件**：
  - `apps/web/src/pages/knowledge-bases/KnowledgeBaseFinder.tsx`
  - `apps/web/src/hooks/useKnowledgeBaseDocuments.ts`
  - `e2e/playwright.config.mts`、`e2e/tests/smoke/*.spec.ts`
  - `.github/workflows/ci.yml`
  - `apps/backend/eslint.config.js`、`lint-staged.config.mjs`

## 如何验证

```bash
pnpm lint
pnpm build
pnpm test:e2e:smoke          # 需 MySQL + e2e/.env
pnpm test:e2e:integration    # 聊天 SSE mock，无需 LLM
```

CI：push 到 `dev` / `main` 后 GitHub Actions 自动跑 lint、build、smoke E2E。

## 遗留 / 下一步

- [ ] 前端 ESLint `max-lines-per-function` ≤80（12 处违规，待大页面拆分后启用）
- [ ] E2E 上传 smoke 需仓库 Secret `QWEN_API_KEY`（无则 skip embedding 用例）
- [ ] **F-00** 业务域 Skill 框架（产品 P0，见 FEATURE-PLAN）
- [ ] `chatService` refactor，演进为 Skill 执行入口

## 相关链接

- E2E 设计：`.ai/planning/playwright-e2e-design.md`
- CI workflow：`.github/workflows/ci.yml`
- 功能规划：`.ai/planning/FEATURE-PLAN.md`
