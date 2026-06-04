# 功能开发工作流

**前置**：档位已定且设计文档已确认（T1 lite / T2-T3 完整 / T0 走 bugfix 非本 flow）。  
**生命周期**：[agent-lifecycle.md](./agent-lifecycle.md)

## 1. 实现前

- 确认 `pre-implementation` 中**该档位**所需文档均为「已确认」：
  - **T1**：`01-change-lite.md`
  - **T2/T3**：`02-solution-design.md`（对照 AC + 变更范围）
- 通过 [pre-implementation](../gates/pre-implementation.md)

## 2. 实现

- 前端 → `frontend.mdc`；UI → `ui-page-development`
- 后端 → `security.mdc`；API → `api-contract`
- 范围不超过已确认文档

## 3. 实现后自验

[post-implementation](../gates/post-implementation.md)：硬门禁 + 软门禁；**禁止**未经用户同意跑 E2E。

## 4. 用户验收 ⏸

目视验收 → 询问 E2E → 不认可则 [spec-deviation](./spec-deviation.md)

## 5. 收尾

提交（用户要求）→ `commit-workflow` → progress log 链接 `planning/<slug>/` 或 `fixes/<slug>/`
