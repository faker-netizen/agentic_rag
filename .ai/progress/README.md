# 项目进度（存档点）

**文档 AI 工作平台**（RAG、知识库、桌面壳、业务域 Skill 规划）的跨会话续作入口。  
新会话或换 Agent 时：**先读 [CURRENT.md](./CURRENT.md)，再写代码**。

---

## 项目是做什么的

用户把文档沉淀在平台内，通过 RAG 对话、ChatPDF（规划中）等对文档问答与整理；**当前产品核心（F-00）** 是按业务域 Skill + Tool Call，在用户文档范围内给出可溯源反馈。详见 [功能规划](../planning/FEATURE-PLAN.md)。

| 已有能力 | 代码位置（速查） |
|----------|------------------|
| 鉴权（JWT 双 token） | `apps/web/src/service/token.ts`、backend auth |
| 知识库 / 文档入库 | `knowledgeBaseService`、`documentService` |
| RAG + LangGraph 检索 | `apps/backend/src/services/ragService.ts` |
| 聊天会话（**SSE 流式**） | `chatService.ts`、`POST .../messages` |
| RAG 独立查询页（**SSE**） | `apps/web/src/pages/rag/`、`POST /api/rag/query` |
| macOS 桌面壳 | `apps/web/src/desktop/`、Dock 应用 `chat` |
| 开发侧 Harness | `.cursor/rules/`、`.cursor/skills/`、`.ai/` |

LLM 生成回答 **仅 SSE**，无 JSON 一次性返回（会话 CRUD、消息列表等仍为 JSON）。

---

## 文件说明

| 文件 | 用途 |
|------|------|
| [CURRENT.md](./CURRENT.md) | **新会话入口**：一句话现状、进行中、下一步（保持短，常更新） |
| [log/](./log/) | 已完成功能存档（只增不改，`YYYY-MM-DD-简短slug.md`） |

### 已有存档索引

| 存档 | 内容 |
|------|------|
| [2026-05-jwt-dual-token](./log/2026-05-jwt-dual-token.md) | JWT 双 token |
| [2026-05-rag-backend](./log/2026-05-rag-backend.md) | RAG 后端与知识库 |
| [2026-05-rag-agentic](./log/2026-05-rag-agentic.md) | RAG Agentic |
| [2026-05-chat-raf-stream](./log/2026-05-chat-raf-stream.md) | 聊天流式 + rAF |
| [2026-05-macos-desktop-shell](./log/2026-05-macos-desktop-shell.md) | macOS 桌面壳 |
| [2026-05-ai-harness](./log/2026-05-ai-harness.md) | 开发侧 AI harness |
| [2026-05-product-pivot-doc-platform](./log/2026-05-product-pivot-doc-platform.md) | 产品方向调整 |

> 较大变更若尚未单独写 log，以 `git log` 与 CURRENT 为准；完成后应补 log。

---

## 新会话怎么读（推荐顺序）

1. [CURRENT.md](./CURRENT.md) — 停在哪、下一步做什么  
2. [FEATURE-PLAN.md](../planning/FEATURE-PLAN.md) — 若要做新功能，对齐 backlog（如 F-00 业务域 Skill）  
3. 相关 [log/](./log/) — 了解某模块历史上下文  
4. [.cursor/rules/ai-harness.mdc](../../.cursor/rules/ai-harness.mdc) — Agent 任务路由与 gates  

本地启动：

```bash
pnpm dev          # web + backend
pnpm lint
pnpm build
```

---

## 何时写存档

功能 **实现 + gate 验证 + git commit**（或 PR 合并）后：

1. 复制 [progress-checkpoint 模板](../templates/progress-checkpoint.md) → `log/YYYY-MM-DD-简短slug.md`  
2. 更新 [CURRENT.md](./CURRENT.md)：已完成表、进行中、下一步、最后更新日期  

详细步骤：项目 skill **`project-progress`**（`.cursor/skills/project-progress/SKILL.md`）。

---

## 与 `.ai/` 其他目录的分工

| 路径 | 记什么 |
|------|--------|
| `planning/FEATURE-PLAN.md` | **要做什么**（愿景、阶段、backlog） |
| **`progress/`（本目录）** | **做到哪了**（续作入口 + 功能存档） |
| `memory/project-decisions.md` | **为什么这样设计** |
| `memory/common-failures.md` | **踩过什么坑** |
| `workflows/`、`gates/` | 怎么做、怎么验（流程与清单，非进度） |

**产品「业务域 Skill」** 与 **Cursor `.cursor/skills/`** 是两套东西，勿混淆（见 [project-decisions](../memory/project-decisions.md)）。

---

## 当前阶段（摘要）

- **Phase 1**：技术底座已具备；**进行中** — 业务域 Skill 框架（F-00）  
- **工程债**：`chatService` / 聊天页拆分、CI、ChatPDF、内容采集等见 FEATURE-PLAN  

细节以 [CURRENT.md](./CURRENT.md) 为准，本 README 不重复维护长列表。
