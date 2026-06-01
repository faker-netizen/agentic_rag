# AI Harness 工程体系

- **日期**：2026-05-31
- **Commit**：（待 commit）
- **状态**：已完成（工作区）

## 做了什么

- `.cursor/rules/`：`ai-harness`、`project`、`frontend`、`backend`、`security` 等
- `.cursor/skills/`：commit、feature、ui-page、backend-service、frontend-component、harness-engineering 等
- `.ai/workflows/`、`gates/`、`templates/`、`memory/`
- 前后端代码质量 gate（函数粒度 ≤40 行、Service/组件拆分指引）
- **本目录** `.ai/progress/` 进度存档

## 涉及范围

- **Packages / Apps**：仓库根、`.cursor/`、`.ai/`

## 如何验证

- 新开会话，Agent 应能读 `ai-harness.mdc` 与 `CURRENT.md` 续作
- 改 backend/frontend 时对应 rule + gate 生效

## 遗留 / 下一步

- [ ] 单独 git commit harness 文件
- [ ] 可选：ESLint `max-lines-per-function`
- [ ] 可选：GitHub CI

## 相关链接

- `.ai/memory/project-decisions.md` — harness 目录布局
