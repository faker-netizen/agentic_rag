# 变更元数据（定级记录）

> **落盘路径**：`.ai/planning/feat-f-12-doc-index-summary/00-change-meta.md`

## 定级（Agent 提议 → 用户确认）

| 项 | 值 |
|----|-----|
| change-tier | **T3** |
| change-type | feature |
| slug | `feat-f-12-doc-index-summary` |
| backlog | **F-12**（文档索引策略 + 文档预摘要 + 全库级 Skill 能力） |
| workflow | requirements-design-full |
| 定级理由 | 改变上传后默认行为（入库 ≠ 自动向量化）；新持久化字段与异步 Job；Finder UI；新 Platform Tools 与 Skill；跨 `apps/backend` + `apps/web` + `domainSkill`；依赖已交付的 F-00 执行器。 |

## 定级确认记录

| 项 | 值 |
|----|-----|
| 状态 | **已确认** |
| 确认人 | 用户 |
| 确认时间 | 2026-06-03 |
| 备注 | 用户回复「没问题」确认 T3；默认策略见 `01-requirements.md` §已决策 |

## 本档位落盘清单

- [x] `01-requirements.md`（已确认 2026-06-03）
- [x] `02-solution-design.md`（待确认）
- [ ] `03-implementation-plan.md`（02 确认后，T3 推荐）

## 链接

- FEATURE-PLAN：[F-12 文档索引与摘要](../../planning/FEATURE-PLAN.md)
- 前置实现：[feat-f-00-domain-skill](../feat-f-00-domain-skill/02-solution-design.md)（§文档索引策略）
- 关联：F-11 Skill 工坊（可读摘要/全文）；F-00a 域路由（后续）
