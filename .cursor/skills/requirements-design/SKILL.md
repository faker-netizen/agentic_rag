---
name: requirements-design
description: >-
  变更定级（Agent 提议+用户确认）后：T1 写 change-lite（1 停点）；
  T2/T3 写完整需求+方案（2 停点）。T0 转 bugfix skill。必须落盘。
---

# 需求分析与方案设计

定级 → 落盘 → 停点 → 实现。  
[planning/README.md](../../.ai/planning/README.md) · [agent-lifecycle.md](../../.ai/workflows/agent-lifecycle.md)

## 第一步：定级 ⏸

1. Agent 提议 T0–T3 + slug（[tier-classification](../../.ai/gates/tier-classification.md)）
2. **用户确认档位**
3. T0 → **转 `bugfix` skill**，退出本 skill

## 按档位

| 档位 | 落盘 | 停点 | Gate |
|------|------|------|------|
| **T1** | `planning/<slug>/00-change-meta.md` + `01-change-lite.md` | 1 | `change-lite-review` |
| **T2** | `00-meta` + `01-requirements` + `02-solution-design` (+03 可选) | 2 | `requirements-review` → `design-review` |
| **T3** | 同 T2；推荐 `03-implementation-plan` | 2 | 同上 |

## T1 流程

1. 写 `00-change-meta.md`（定级已确认）
2. 写 `01-change-lite.md` → 等用户确认 → `feature-development`

## T2/T3 流程

1. 写 `00-change-meta.md`
2. 写 `01-requirements.md` → 停点 → 确认
3. 写 `02-solution-design.md` → 停点 → 确认 → `feature-development`

## 完成标准

- [ ] 档位用户已确认
- [ ] 该档位要求的文件已落盘且确认记录为「已确认」
- [ ] 用户授权进入实现

详细：`.ai/workflows/requirements-design.md`
