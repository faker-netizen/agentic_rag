---
name: feature-development
description: >-
  design_to_code monorepo 端到端功能开发——需求澄清、计划、实现、验证。用于新功能、
  用户故事或多文件能力开发。
---

# 功能开发

## 快速开始

1. 新会话续作：先读 `.ai/progress/CURRENT.md`
2. 新功能：先读 `.ai/planning/FEATURE-PLAN.md` 对齐范围与优先级
3. 阅读 `.ai/workflows/feature-development.md`
4. 写代码前通过 `.ai/gates/pre-implementation.md`
5. 范围较大时使用 `.ai/templates/feature-brief.md` 和 `.ai/templates/implementation-plan.md`
6. 实现时遵循 `.cursor/rules/project.mdc` 及文件级 rules
7. 提交前通过 `.ai/gates/code-quality.md`
8. 提交时使用 `commit-workflow` skill
9. 提交后使用 `project-progress` skill 写存档并更新 `CURRENT.md`

## 按层分工

| 层级 | 路径 | 还需阅读 |
|------|------|----------|
| 前端 UI | `apps/web` | `frontend.mdc`；UI 为主用 `ui-page-development`；复杂组件用 `frontend-component`；gates：`frontend-quality`、`ui-quality` |
| API | `apps/backend` | `backend.mdc`、`backend-service` skill、`.ai/gates/backend-quality.md`、`api-contract` |
| 共享 UI | `packages/components` | `frontend.mdc` |

## 完成标准

- [ ] Gate：`pre-implementation`（有计划或用户明确免计划）
- [ ] Gate：`code-quality`（lint-staged / lint 通过）
- [ ] 新数据流已处理 loading / error / empty
- [ ] 同一 commit 无无关重构
- [ ] 已更新 `.ai/progress/` 存档（功能完成时）

详细步骤：`.ai/workflows/feature-development.md`
