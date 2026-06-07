# 项目决策

记录非显而易见的架构选择。每条决策一条记录。

---

## 2026-05 — 产品方向：文档 AI 工作平台

- **决策：** 产品主线由「Design to Code」调整为 **文档 AI 工作平台**（RAG、ChatPDF、内容采集、业务域 Skill）；D2C 搁置。
- **原因：** 优先交付文档沉淀、问答与按业务域 Tool Call 反馈；仓库名暂保留 `design_to_code`。
- **核心功能：** 用户平台内已有文档 + 用户输入 → **业务域 Skill（Tool Call 封装）** → 可溯源反馈。
- **参考：** `.ai/planning/FEATURE-PLAN.md`

## 2026-05 — 业务域 Skill vs Cursor Skill

- **决策：** 产品「业务域 Skill」指运行时对 **用户文档** 的 Tool Call 能力包；与 `.cursor/skills/`（开发 Harness）命名相近但 **完全分层**，文档与代码中需区分。
- **原因：** 避免实现时与 IDE Agent skill 混淆。

## 2026-05 — AI harness 目录布局

- **决策：** `.cursor/skills/` 作为 Cursor 可发现的入口；`.ai/` 存放 workflows/gates/templates/memory。
- **原因：** Skills 自动注册；长文档按需加载，不占常驻 context。
- **未采纳方案：** 全部放在 skills（context 过大）；仅 `.ai/skills/` 无 `.cursor/skills/`（无法自动发现）。

## 2026-05 — 进度存档 progress/

- **决策：** `.ai/progress/CURRENT.md` 为新会话入口；每完成功能写 `log/YYYY-MM-DD-*.md` 只增不改。
- **原因：** 跨会话续作；与 `memory/`（决策/踩坑）职责分离。
- **参考：** `project-progress` skill、`.ai/templates/progress-checkpoint.md`

## 2026-05 — 桌面壳路由

- **决策：** 登录后使用 `DesktopShell`（dock/多窗口）；旧 `/chat` 重定向到 `/?open=chat`。
- **原因：** macOS 风格多窗口体验。
- **参考：** `apps/web/src/router/index.tsx`、`apps/web/src/desktop/`

## 2026-05 — 文件存储迁移阿里云 OSS

- **决策：** 文档二进制由本地 `uploads/` 迁至 **阿里云 OSS**；通过 `StorageProvider` 抽象，开发环境可 `STORAGE_DRIVER=local`。
- **原因：** 后端无状态、多实例一致；本地磁盘已清空，不适合继续作为生产方案。
- **范围：** Phase 1 服务端中转上传 + OSS Multipart 对接现有分片 API；Phase 2 可选 STS 直传。
- **参考：** `.ai/planning/oss-storage-design.md`

## 2026-05 — 需求设计与实现分层

- **决策：** 新增全局 skill `requirements-design`（需求分析 + 方案设计），与 `feature-development`（实现）分离；非 trivial 需求先过 `design-review` gate。
- **原因：** 避免 Agent 未澄清即写代码；方案可评审、可存档，再进入实现。
- **决策：** 变更四档 T0–T3；Agent 提议 + 用户确认；T0→`.ai/fixes/`；T1→lite 单停点；T2/T3→完整 01+02。见 `planning/README.md`。
- **参考：** `.ai/workflows/requirements-design.md`、`.ai/gates/design-review.md`

## 2026-06 — F-05 ChatPDF MVP 引用模型

- **决策：** ChatPDF 总结为 **分点 + 递增数字引用**；跳转采用 **页码 + 页内 excerpt 搜索高亮**；文档 **`origin=chatpdf`、`knowledge_base_id=NULL`**，仅 Dock/ChatPDF 上传，**不**与知识库/Finder 打通。
- **参考：** `.ai/planning/feat-f-05-chatpdf/`

## 2026-06 — F-12：入库 ≠ 索引 ≠ 摘要

- **决策：** 文档上传默认 **仅落库全文**；**向量索引**与 **LLM 预摘要** 由用户在知识库 Finder **分别显式触发**；全库总结类问答走 Skill **`kb-catalog`**（列举文档 + 读已存摘要），不在聊天内自动批量摘要（MVP）。
- **原因：** 对齐「总结库里所有文件」产品预期；控制成本；与 F-00 `kb_search` 语义检索分工。
- **参考：** `.ai/planning/feat-f-12-doc-index-summary/01-requirements.md`

## 2026-06 — F-13 Android 客户端：搁置与路线

- **决策：** Android 客户端 **本期搁置**；方案落盘于 `feat-f-13-android-webview-shell`。**首期**采用 **薄 WebView 壳加载线上已部署 Web**；**后期**可迁 **Capacitor 内嵌 H5**。**不做** React Native 首期、**不做** iOS。
- **原因：** 优先 Web 主线（F-00 / F-05 / F-12）；远程壳实现成本最低；内嵌 Hybrid 与 JS Bridge 留待 mobile 布局与部署稳定后再做。
- **迁移认知：** 远程壳 → 内嵌 Hybrid 的主线是 **构建产物打包 + 发布流程 + API/路由在 WebView 内验通**；JS Bridge 仅在需要原生能力（文件、推送等）时增量接入，非迁移唯一工作。
- **参考：** `.ai/planning/feat-f-13-android-webview-shell/`

## 2026-05 — Cursor MCP（Context7 + Playwright）

- **决策：** 项目启用 **Context7**（库文档）与 **Playwright MCP**（浏览器验证）；配置在 `.cursor/mcp.json`，说明在 `.cursor/MCP.md`。
- **原因：** 减少 Agent 凭记忆写错第三方 API；UI/SSE 改动可在真实浏览器中复验，与 gates / lint 互补而非替代。
- **约定：** MCP 查外部库；业务逻辑以仓库代码为准；Token/API Key 只放 Cursor 设置或环境变量。
- **未采纳：** 仅用户级 `~/.cursor/mcp.json` 不写进仓库（不利于团队一致）；GitHub MCP 暂可选、未默认启用。
