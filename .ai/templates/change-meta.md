# 变更元数据（定级记录）

> **落盘路径**：`.ai/planning/<slug>/00-change-meta.md`  
> **时机**：用户确认档位后**首先**写入本文件（T1 / T2 / T3）

## 定级（Agent 提议 → 用户确认）

| 项 | 值 |
|----|-----|
| change-tier | T1 / T2 / T3 |
| change-type | minor / refactor / feature |
| slug | |
| backlog | F-xx（T3 建议填；T2 可选） |
| workflow | requirements-design-lite / requirements-design-full |
| 定级理由 | |

## 定级确认记录

| 项 | 值 |
|----|-----|
| 状态 | 待确认 / 已确认 |
| 确认人 | 用户 |
| 确认时间 | |
| 备注 | |

## 本档位落盘清单

<!-- Agent 按 tier 勾选将创建的文件 -->

- [ ] T1：`01-change-lite.md`
- [ ] T2/T3：`01-requirements.md` → `02-solution-design.md`
- [ ] T3 推荐：`03-implementation-plan.md`

## 链接

- FEATURE-PLAN：
- 相关 progress log：
