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
