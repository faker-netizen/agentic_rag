---
name: requirements-design
description: >-
  需求分析与方案设计——澄清目标、划定范围、对比方案、产出设计文档后再实现。用于新需求、
  功能规划、技术方案、架构讨论、PRD/Spec 编写，或用户说「先分析」「怎么设计」「出个方案」时。
---

# 需求分析与方案设计

**只分析、先设计、后编码。** 非 trivial 需求在写业务代码前走本 skill；实现阶段转 `feature-development`。

## 何时使用

| 场景 | 用本 skill | 跳过（直接实现） |
|------|------------|------------------|
| 新功能 / 新模块 / 跨前后端 | ✅ | |
| 架构或数据流变更 | ✅ | |
| 多种实现路径需取舍 | ✅ | |
| 用户说「分析需求」「出方案」「怎么设计」 | ✅ | |
| 单文件小修、意图明确 | | ✅ |
| 纯 Bug 修复（行为已定义） | | 用 `bugfix` workflow |

## 快速步骤

1. **上下文** — 续作读 `.ai/progress/CURRENT.md`；本产品读 `.ai/planning/FEATURE-PLAN.md` 对齐 backlog。
2. **流程** — 阅读 `.ai/workflows/requirements-design.md`。
3. **澄清** — 信息不足时先提问，勿凭假设写大段方案。
4. **调研** — grep / 读邻近代码，列出现有可复用模块（Service、组件、路由、SSE 等）。
5. **产出** — 按复杂度选用模板（见下表）。
6. **门禁** — 方案定稿前过 `.ai/gates/design-review.md`。
7. **交接** — 用户确认或明确「按方案实现」→ `feature-development` + `implementation-plan.md`。

## 产出物模板

| 复杂度 | 模板 |
|--------|------|
| 小（单端、≤3 文件） | `.ai/templates/feature-brief.md` |
| 中以上（跨层、新 API、新数据流） | `.ai/templates/solution-design.md` |
| 已确认方案、待拆任务 | `.ai/templates/implementation-plan.md` |

## 本仓库设计要点（摘要）

- **产品核心**：文档 AI 平台；F-00 为业务域 Skill + Tool Call（勿与 `.cursor/skills/` 混淆）。
- **LLM 回答**：仅 SSE 流式；设计 API 时勿引入同步 JSON 生成路径。
- **分层**：`apps/web` / `apps/backend` / `packages/*`；优先复用桌面壳、SSE 客户端、现有 Service。
- **非显而易见决策** → 实现后写入 `.ai/memory/project-decisions.md`。

## 完成标准

- [ ] Gate：`design-review`
- [ ] 范围 in/out 已写清
- [ ] 至少一种备选方案或明确「无合理替代」
- [ ] 推荐方案含验证方式（gates / 冒烟点）
- [ ] 用户确认或明确授权进入实现

详细步骤：`.ai/workflows/requirements-design.md`
