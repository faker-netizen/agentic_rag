# AI Harness（design_to_code）

面向人类的概览。**Agent 应以 `.cursor/rules/ai-harness.mdc` 为权威路由地图。**

## 目录结构

```
.cursor/rules/     → 自动注入的约束
.cursor/skills/    → Cursor 可发现的任务入口
.cursor/mcp.json   → MCP 服务器（Context7、Playwright）
.cursor/MCP.md     → MCP 使用说明与 Agent 约定
.ai/workflows/     → 详细流程（按需阅读）
.ai/gates/         → 验证检查清单
.ai/templates/     → 产出物模板
.ai/memory/        → 决策记录与失败日志
.ai/progress/     → 进度存档（CURRENT + log/）
.ai/planning/     → 功能规划（FEATURE-PLAN.md）
```

## 快速链接

- [**功能规划 / Roadmap**](./planning/FEATURE-PLAN.md)
- [**项目现状 / 续作入口**](./progress/CURRENT.md)
- [进度说明](./progress/README.md)
- [需求分析与方案设计](./workflows/requirements-design.md)
- [功能开发](./workflows/feature-development.md)
- [UI 页面开发](./workflows/ui-page-development.md)
- [Bug 修复](./workflows/bugfix.md)
- [设计评审门禁](./gates/design-review.md)
- [代码质量门禁](./gates/code-quality.md)
- [后端代码质量门禁](./gates/backend-quality.md)
- [前端代码质量门禁](./gates/frontend-quality.md)
- [常见失败](./memory/common-failures.md)
- [MCP 配置说明](../.cursor/MCP.md)

## 维护

每次 harness 漏检（hook 失败、错误模式被合入）后：

1. 修复代码
2. 在 `memory/common-failures.md` 追加一条记录
3. 若检查应自动化，加强 gate 或 Husky 配置
