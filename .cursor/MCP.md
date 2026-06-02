# MCP 配置与使用说明

本仓库为 Cursor Agent 配置了 **Model Context Protocol (MCP)** 服务器，用于查第三方库文档和在浏览器里验证 UI。

## 配置文件位置

| 位置 | 适用 |
|------|------|
| **`.cursor/mcp.json`**（本仓库） | 团队共享；clone 后开箱即用 |
| **`~/.cursor/mcp.json`**（用户级） | 仅本机；与项目配置二选一或合并同名 server |

当前已启用三个 server，定义见 [mcp.json](./mcp.json)。

## 已启用 Server

### Context7 — 库文档查询

- **包：** `@upstash/context7-mcp`
- **用途：** 查 LangChain、Ant Design、React Router、TanStack Virtual 等库的**最新官方文档与示例**，避免凭记忆写错 API。
- **何时用：**
  - 接入或升级依赖，需要确认参数、返回值、breaking change
  - RAG / LangGraph / SSE 相关 API 写法不确定
  - Ant Design 组件 props、主题 token 需核对
- **可选：** 若遇到速率限制，在 Cursor **Settings → MCP** 为 Context7 配置 API Key（勿写入 git）。

### Playwright MCP — 浏览器自动化

- **包：** `@playwright/mcp@latest`
- **用途：** 打开本地 dev 页面、点击、截图、读控制台，验证 **桌面壳、聊天 SSE、RAG 页、登录** 等前端行为。
- **何时用：**
  - UI / 布局 / 滚动相关改动完成后（配合 `scrollable-layout` skill）
  - 需要确认 SSE 流式输出、引用来源是否正常展示
  - Bug 复现需要「在浏览器里走一遍」
- **首次使用前**（本机一次）：

```bash
npx playwright install
```

### GitHub MCP — Issue / PR / CI

- **服务：** GitHub 官方托管 `https://api.githubcopilot.com/mcp/`（需 Cursor v0.48+）
- **用途：** 查 **Actions 运行状态、失败 job 日志、PR / Issue**，无需本地安装 `gh` CLI。
- **何时用：**
  - CI 红了，需要拉取 workflow run / job 详情
  - 创建或审查 PR、查 issue 评论
  - 远程分支与 commit 状态核对
- **认证（必做，勿写入 git）：**

  1. 在 [GitHub PAT 设置](https://github.com/settings/personal-access-tokens/new) 创建 token（建议 fine-grained，权限：`Actions: Read`、`Contents: Read`、`Pull requests: Read`）
  2. 本机设置环境变量 `GITHUB_TOKEN`（PowerShell 用户级持久化示例）：

```powershell
[System.Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "ghp_xxxx", "User")
```

  3. **完全重启 Cursor**（Settings → MCP 里 github 应显示绿点）
  4. 或在 Cursor **Settings → MCP** 点 github 旁铅笔，直接填入 PAT（仅本机，不进仓库）

- **备选：** 本地 Docker 跑 `ghcr.io/github/github-mcp-server`（见 [官方安装指南](https://github.com/github/github-mcp-server/blob/main/docs/installation-guides/install-cursor.md)）

## Agent 使用约定

1. **先 harness 后 MCP** — 任务仍按 [ai-harness.mdc](./rules/ai-harness.mdc) 路由；MCP 是**补充工具**，不替代读仓库代码与 gates。
2. **Context7** — 查**外部库**；业务逻辑、本项目 API 以 `apps/`、`.ai/` 源码为准。
3. **Playwright** — 本地需已 `pnpm dev:web`（或文档里写的端口）；失败时看终端与浏览器 console，并记入 `.ai/memory/common-failures.md`。
4. **GitHub** — 查 **远程 CI / PR / Issue**；业务代码仍以仓库为准。Token 只用 `GITHUB_TOKEN` 环境变量或 Cursor 用户 MCP 设置。
5. **密钥** — GitHub Token、LLM Key、Context7 Key 等只放环境变量或 Cursor 用户设置，**禁止**提交到 `mcp.json` 或仓库。

## 与 Harness 的关系

```
Rules / Skills / Gates  →  约束「做什么、怎么验」
MCP                     →  查文档（Context7）、浏览器验（Playwright）、CI/PR（GitHub）
Git / lint-staged       →  合入前强制 ESLint（MCP 不能替代）
```

## 扩展 MCP（可选）

| Server | 场景 | 注意 |
|--------|------|------|
| GitHub MCP | Issue / PR / CI 状态 | 已启用；Token 用 `GITHUB_TOKEN` 环境变量 |
| 自建 MCP | 内部 API、知识库 | 在 `mcp.json` 增加条目并更新本文 |

新增 server 后请同步更新 [ai-harness.mdc](./rules/ai-harness.mdc) 任务路由表。

## 故障排查

| 现象 | 处理 |
|------|------|
| MCP 未出现在 Agent 工具列表 | Cursor 重启；Settings → MCP 确认 server 为 Enabled |
| Context7 超时 / 限流 | 配置 API Key 或稍后重试 |
| Playwright 找不到浏览器 | 运行 `npx playwright install` |
| GitHub MCP 红 / 无工具 | 确认 `GITHUB_TOKEN` 已设且 Cursor 已重启；PAT 需 Actions Read |
| 重复 server 名称 | 项目级与用户级 `mcp.json` 勿配置同名重复实例 |
