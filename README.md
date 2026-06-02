# 文档 AI 工作平台

基于 RAG 的 **文档 AI 工作平台** monorepo：知识库管理、流式对话、桌面化 Web 界面。用户将文档沉淀在平台内，通过 RAG / 聊天进行问答与整理；正在建设 **业务域 Skill（Tool Call）**，在用户文档范围内给出可溯源的业务反馈。

> 仓库名 `design_to_code` 为历史命名，当前产品定位见 [.ai/planning/FEATURE-PLAN.md](./.ai/planning/FEATURE-PLAN.md)。

## 功能概览

| 能力 | 状态 | 说明 |
|------|------|------|
| 知识库与文档入库 | ✅ | 上传、解析、分块、向量检索 |
| RAG 对话（SSE） | ✅ | 会话、流式输出、引用来源 |
| RAG 查询页（SSE） | ✅ | 独立知识库问答 |
| macOS 风格桌面壳 | ✅ | Dock、多窗口、玻璃拟态 UI |
| JWT 双 token 鉴权 | ✅ | 登录 / 刷新 |
| Agentic RAG | 🟡 | LangGraph 检索链路 |
| ChatPDF | 📋 | Dock 已占位 |
| 业务域 Skill + Tool Call | 📋 | 当前核心规划（F-00） |
| 外链内容采集（公众号等） | 📋 | 远期 |

LLM **生成回答仅走 SSE 流式**；会话/知识库等 CRUD 接口仍为 JSON。

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19、Vite、Ant Design、React Router |
| 后端 | Node.js、Express 5、TypeScript |
| RAG | LangChain、LangGraph、OpenAI 兼容 API（如千问 / DeepSeek） |
| 数据 | MySQL |
| 工程 | pnpm workspace、Husky、lint-staged、ESLint |

## 仓库结构

```
apps/
  web/          # 前端（桌面壳、聊天、知识库、RAG 页）
  backend/      # API、RAG、聊天、鉴权
packages/
  components/   # 共享 React 组件
  utils/        # 共享工具
.ai/            # 功能规划、进度存档、workflows、gates（协作 / Agent 用）
.cursor/        # Cursor rules & skills（开发 Harness）
```

## 快速开始

### 环境要求

- Node.js 20+
- pnpm 10+
- MySQL

### 安装与运行

```bash
pnpm install

# 配置后端环境变量（见 apps/backend/RAG_README.md）
# cp apps/backend/.env.example apps/backend/.env

pnpm dev          # 同时启动 web + backend
# 或
pnpm dev:frontend
pnpm dev:backend
```

### 常用命令

```bash
pnpm lint         # 递归 lint
pnpm build        # 递归构建
pnpm exec lint-staged   # 模拟 pre-commit（web TS/TSX）
```

## 主要 API（摘要）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/chat/sessions/:id/messages` | 发送消息（**SSE**：meta / sources / token / done） |
| POST | `/api/rag/query` | RAG 查询（**SSE**：sources / token / done） |
| * | `/api/chat/sessions` | 会话 CRUD |
| * | `/api/knowledge-bases` | 知识库 |
| * | `/api/documents` | 文档上传与管理 |

详情见 [apps/backend/README.md](./apps/backend/README.md)、[apps/backend/RAG_README.md](./apps/backend/RAG_README.md)。

## 开发与协作

### Git 提交

- pre-commit 对 staged 的 `apps/web`、`packages/components` 下 TS/TSX 跑 ESLint
- 流程说明：`.cursor/skills/commit-workflow/SKILL.md`

### 文档入口（Contributor / Agent）

| 文档 | 用途 |
|------|------|
| [.ai/planning/FEATURE-PLAN.md](./.ai/planning/FEATURE-PLAN.md) | 产品规划与 backlog |
| [.ai/progress/CURRENT.md](./.ai/progress/CURRENT.md) | 当前进度与下一步 |
| [.ai/progress/README.md](./.ai/progress/README.md) | 进度存档说明 |
| [.cursor/rules/ai-harness.mdc](./.cursor/rules/ai-harness.mdc) | Agent 任务路由 |
| [.cursor/skills/requirements-design/SKILL.md](./.cursor/skills/requirements-design/SKILL.md) | 需求分析与方案设计（实现前） |
| [.cursor/MCP.md](./.cursor/MCP.md) | MCP（Context7 / Playwright）配置与 Agent 约定 |

### Cursor MCP（可选）

Agent 可通过 MCP 查库文档与做浏览器验证。配置见 [`.cursor/mcp.json`](./.cursor/mcp.json)，说明见 [`.cursor/MCP.md`](./.cursor/MCP.md)。

- **Context7** — LangChain、Ant Design 等第三方文档
- **Playwright** — 本地 UI / SSE 流式页面验证（首次需 `npx playwright install`）

## 路线图

- **Phase 1（进行中）**：业务域 Skill 框架、Tool Call、域路由
- **Phase 2**：ChatPDF、知识库 Dock 应用
- **Phase 3**：公众号 / URL 内容采集与整理
- **Phase 4**：CI、E2E、生产部署

完整规划见 [FEATURE-PLAN.md](./.ai/planning/FEATURE-PLAN.md)。

## License

Private — 未指定开源协议。
