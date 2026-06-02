---
name: harness-engineering
description: >-
  说明并应用 design_to_code 的 AI harness（.cursor/rules、.cursor/skills、.ai/workflows、
  gates、templates、memory）。在设计工作流、添加门禁、提升 Agent 可靠性，或用户提到
  harness / 约束工程时使用。
---

# Harness 工程（design_to_code）

## 本仓库的分层

```
Rules（自动注入）→ Skills（任务入口）→ Workflows（详细步骤）
        ↓                  ↓                      ↓
     约束边界          读 gates/templates      lint/build/hook 验证
```

## 何时读什么

| 需求 | 文件 |
|------|------|
| 总地图 / 路由 | `.cursor/rules/ai-harness.mdc` |
| 需求分析 / 方案设计 | `.cursor/skills/requirements-design/`、`.ai/workflows/requirements-design.md` |
| UI 布局 / 滚动 / 视觉 | `css-layout`、`scrollable-layout`、`macbook-ui` |
| 完整功能流程 | `.ai/workflows/feature-development.md` |
| 提交流程 | `.cursor/skills/commit-workflow/SKILL.md` |
| 质量检查清单 | `.ai/gates/code-quality.md` |
| 常见失败模式 | `.ai/memory/common-failures.md` |
| 续作 / 进度 | `.ai/progress/CURRENT.md` |
| 功能规划 | `.ai/planning/FEATURE-PLAN.md` |
| MCP 配置与约定 | `.cursor/MCP.md`、`.cursor/mcp.json` |

## MCP（补充工具）

- **Context7** — 查第三方库文档；不替代读本仓库源码
- **Playwright** — 浏览器验证 UI / SSE；本地需 dev server，首次 `npx playwright install`
- 密钥不进 git；路由见 `ai-harness.mdc`

## 如何扩展 harness

1. **新约束**（全局或按文件）→ `.cursor/rules/<name>.mdc`（保持 < 50 行）
2. **新多步骤任务** → `.cursor/skills/<name>/SKILL.md` + `.ai/workflows/<name>.md`
3. **新验证清单** → `.ai/gates/<name>.md`；机器检查对接 Husky/CI
4. **新产出物格式** → `.ai/templates/<name>.md`
5. **功能存档** → `.ai/progress/log/` + 更新 `CURRENT.md`
6. **更新路由** → 在 `ai-harness.mdc` 加一行

## 渐进式披露

- `SKILL.md`：触发条件、5–10 步摘要、链接即可
- `.ai/workflows/`：分支、示例、边界情况
- `.ai/gates/`：通过/不通过标准
- 不要在 rule、skill、workflow 之间重复大段内容

## 发现 harness 漏洞后

若 Agent 或人工绕过了某道检查：

1. 加强 **gate**（清单）和/或 **hook/CI**（强制执行）
2. 在 `.ai/memory/common-failures.md` **追加一行**
3. 若是新任务类型，在 `ai-harness.mdc` 增加路由行
