# 变更元数据（定级记录）

> **落盘路径**：`.ai/planning/feat-f-00-domain-skill/00-change-meta.md`

## 定级（Agent 提议 → 用户确认）

| 项 | 值 |
|----|-----|
| change-tier | **T3** |
| change-type | feature |
| slug | `feat-f-00-domain-skill` |
| backlog | **F-00**（业务域 Skill 框架）；关联 F-00a 路由、F-00b 示例域、F-01 chat 演进 |
| workflow | requirements-design-full |
| 定级理由 | 新能力：注册表、平台 Tool Catalog、scope 约束、执行器、聊天 SSE 契约扩展；跨 `apps/backend` + `apps/web`；新持久化与 API；改变用户可感知的对话行为（Skill 名、引用、执行路径）。 |

## 定级确认记录

| 项 | 值 |
|----|-----|
| 状态 | **已确认** |
| 确认人 | 用户 |
| 确认时间 | 2026-06-03 |
| 备注 | T3 确认；待澄清 5 项已决策（见 `01-requirements.md` §已决策） |

## 本档位落盘清单

- [x] `01-requirements.md`（已确认 2026-06-03）
- [x] `02-solution-design.md`（待确认）
- [ ] `03-implementation-plan.md`（T3 推荐，方案确认后）

## 链接

- FEATURE-PLAN：[F-00 核心能力](../../planning/FEATURE-PLAN.md#核心能力当前最高优先级)
- 依赖规划：F-11 Skill 工坊依赖本变更
- 相关 progress：[CURRENT.md](../../progress/CURRENT.md)
