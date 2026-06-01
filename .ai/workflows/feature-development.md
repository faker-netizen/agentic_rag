# 功能开发工作流

## 1. 澄清需求

- 阅读 [功能规划](../planning/FEATURE-PLAN.md)，确认模块与 backlog 编号（如有）
- 解决什么用户问题？涉及哪些 apps/packages？
- 不清楚时，先问再写代码。

可选产出物：`.ai/templates/feature-brief.md`

## 2. 实现前门禁

阅读并通过 `.ai/gates/pre-implementation.md`。

可选产出物：`.ai/templates/implementation-plan.md`

## 3. 实现

按层级遵循对应规则：

- 前端 → `frontend.mdc`；UI 为主时使用 `ui-page-development` skill
- 后端 → `security.mdc`；新增/变更接口时读 `api-contract` gate
- 共享组件 → `packages/components`，复用 `@d2c/components`

控制 diff 范围；匹配现有命名与目录模式。

## 4. 验证

1. `.ai/gates/code-quality.md`
2. 必要时在浏览器或 API 客户端做冒烟测试
3. 涉及 UI：`.ai/gates/ui-quality.md`

```bash
pnpm lint
pnpm build
```

## 5. 提交

使用 `.cursor/skills/commit-workflow/SKILL.md`。

## 6. 存档（功能完成后）

1. 使用 `project-progress` skill
2. 写 `.ai/progress/log/YYYY-MM-DD-<slug>.md`（模板：`templates/progress-checkpoint.md`）
3. 更新 `.ai/progress/CURRENT.md`
4. 非显而易见的决策 → `.ai/memory/project-decisions.md`
