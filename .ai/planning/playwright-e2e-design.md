# Playwright Test 方案（E2E）

> 状态：Phase 1 已落地（脚手架 + smoke）  
> 日期：2026-06  
> 与 Playwright MCP 分工见文末。

---

## 目标

- **可重复**的浏览器自动化测试（非 Agent 临时点一点）
- 覆盖登录、桌面壳、知识库、Dock 应用等核心路径
- 本地 `pnpm test:e2e`；后续接 CI（F-07）
- **不**在 pre-commit 跑（太慢）；PR / 手动 / nightly 跑

---

## 目录与命令

```
e2e/
  playwright.config.ts    # 见 playwright.config.mts
  helpers/
    auth.ts               # API 登录 + 注入 localStorage
    env.ts                # 环境变量读取
  tests/
    smoke/                # @smoke — CI / 合码前推荐跑
      login.spec.ts
      desktop.spec.ts
    integration/          # @integration — 依赖 LLM/SSE，默认 CI 跳过
      (Phase 2)
  .env.example
  README.md
```

| 命令 | 说明 |
|------|------|
| `pnpm test:e2e` | 跑全部 E2E |
| `pnpm test:e2e:smoke` | 只跑 `@smoke` |
| `pnpm test:e2e:ui` | Playwright UI 模式（调试） |
| `pnpm exec playwright install` | 首次安装浏览器（本机一次） |

---

## 环境约定

| 变量 | 默认 | 说明 |
|------|------|------|
| `E2E_BASE_URL` | `http://localhost:5173` | 前端 |
| `E2E_API_URL` | `http://localhost:3001` | 后端 |
| `E2E_USER_EMAIL` | — | **必填**，与后端已存在用户一致 |
| `E2E_USER_PASSWORD` | — | **必填** |

推荐：与 `apps/backend/.env` 中 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 相同（启动时自动建管理员）。

复制 `e2e/.env.example` → `e2e/.env`（已在 gitignore）。

---

## 鉴权策略

前端 accessToken 在 `localStorage.accessToken`；refresh 在 httpOnly cookie。

**E2E 统一走 API 登录，再注入 token**（比纯 UI 登录快、稳）：

```
POST /api/auth/login  →  accessToken
page.addInitScript / evaluate  →  localStorage
page.goto('/')
```

UI 登录仍保留单独 smoke spec 验证表单路径。

---

## webServer（自动起服）

`playwright.config.ts` 配置两项：

1. `pnpm dev:backend` → 等 `http://localhost:3001/health`
2. `pnpm -C apps/web dev` → 等 `http://localhost:5173`

本地已有 dev 进程时 `reuseExistingServer: true`（非 CI）。

**前提：** MySQL 与 backend `.env` 已配置；与日常开发相同。

---

## 测试分层

| 标签 | 范围 | 何时跑 |
|------|------|--------|
| `@smoke` | 登录、桌面菜单、Dock 打开 RAG 窗口 | PR / 本地合码前 |
| `@integration` | 聊天 SSE、RAG 流式、上传文档 | 本地 / nightly；CI 需 mock 后端 |

### Phase 1（当前）

- [x] 未登录访问 `/` → 跳转登录
- [x] UI 登录进入桌面
- [x] API 登录 + 桌面顶栏 / 新建知识库
- [x] Dock 打开「RAG 对话」窗口

### Phase 2

- [x] 新建知识库 → 桌面出现文件夹 → 打开 Finder 窗口
- [x] 上传小文件（txt）→ 列表出现文档
- [x] `@integration` 聊天发一条（mock SSE 或 stub backend）

### Phase 3（CI）

- [x] `.github/workflows/ci.yml` — lint + build + `@smoke` E2E
- [x] MySQL service container + 种子管理员（workflow env）
- [x] 失败上传 `playwright-report` / `test-results` artifact
- [ ] 可选：仓库 Secret `QWEN_API_KEY` 以在 CI 跑 embedding 上传用例（无则 skip）

---

## SSE / LLM 测试策略

**不在 smoke 里调真实 LLM。**

| 方式 | 适用 |
|------|------|
| **Mock 路由** | `page.route('**/api/chat/**', …)` 返回固定 SSE |
| **测试专用 API** | 后端 `NODE_ENV=test` 返回 stub（远期） |
| **仅断言 UI 状态** | 发送按钮 loading、消息列表出现 user 气泡 |

Chat 全链路标 `@integration`，CI 默认 `grep @smoke` 排除。

---

## 选择器约定

1. 优先 `getByRole` / `getByLabel` / `getByTitle`（Dock 按钮有 `title`）
2. 避免脆弱 CSS 类名
3. 必要时加 `data-testid`（仅 stable 壳层：登录表单、窗口标题栏）

---

## Harness 接入

| 文件 | 变更 |
|------|------|
| `.ai/workflows/ui-page-development.md` | 验证步增加 `pnpm test:e2e:smoke` |
| `.ai/gates/ui-quality.md` | UI 改动推荐跑 smoke |
| `.cursor/rules/ai-harness.mdc` | 路由：E2E → `e2e/README.md` |
| `.cursor/MCP.md` | MCP 探路 → 沉淀为 spec |

---

## Playwright MCP vs Playwright Test

| | Playwright MCP | Playwright Test |
|--|----------------|-----------------|
| 谁跑 | Cursor Agent | 开发者 / CI |
| 用途 | 开发时探路、截图、查 selector | 回归、门禁 |
| 产出 | 无代码 | `e2e/tests/*.spec.ts` |
| 关系 | 写 spec **前**用 MCP 摸清页面；spec **定稿**后 MCP 仅作补充 |

---

## 风险

| 风险 | 缓解 |
|------|------|
| 无 E2E 账号 | `.env.example` + README；缺变量时测试 skip 并提示 |
| 端口占用 | `reuseExistingServer` |
| 测试数据污染 | Phase 2 用随机 KB 名；或 `@afterEach` 调 API 删库 |
| CI 无 MySQL | Phase 3 再加；之前仅本地 smoke |

---

## 下一步（你确认后）

1. Phase 2 spec：知识库 + 上传  
2. Chat SSE mock spec（`@integration`）  
3. GitHub Actions workflow
