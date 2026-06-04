# Agent 生命周期（人机协作状态机）

> 入口地图：`.cursor/rules/ai-harness.mdc`  
> 档位定义：[planning/README.md](../planning/README.md)

每个 `⏸` 须用户确认后再进入下一状态。

## 状态图

```mermaid
stateDiagram-v2
    [*] --> S0_Context
    S0_Context --> S0_Tier: 读 CURRENT / PLAN

    S0_Tier --> S0_TierWait: Agent 提议 T0–T3
    S0_TierWait --> T0_Bugfix: T0 确认
    S0_TierWait --> T1_Lite: T1 确认
    S0_TierWait --> S1_Requirements: T2/T3 确认
    S0_TierWait --> S0_Tier: 用户改档

    T0_Bugfix --> T0_Fix: fixes/00-bugfix.md
    T0_Fix --> S4_Verify: 最小修复

    T1_Lite --> T1_Wait: 01-change-lite.md
    T1_Wait --> S3_Implement: 用户确认 ✅
    T1_Wait --> T1_Lite: 驳回

    S1_Requirements --> S1_Wait: 01-requirements.md
    S1_Wait --> S2_Solution: 用户确认 ✅
    S1_Wait --> S1_Requirements: 驳回

    S2_Solution --> S2_Wait: 02-solution-design.md
    S2_Wait --> S3_Implement: 用户确认 ✅
    S2_Wait --> S1_Requirements: 需求偏差
    S2_Wait --> S2_Solution: AC 需改

    S3_Implement --> S4_Verify
    S4_Verify --> S5_UserReview: post-implementation
    S5_UserReview --> S6_Done: 用户认可
    S5_UserReview --> S0_Tier: 需升/降档
    S5_UserReview --> T1_Lite: T1 规格偏差
    S5_UserReview --> S1_Requirements: 需求偏差
    S5_UserReview --> S2_Solution: AC 偏差
    S5_UserReview --> S3_Implement: 实现未达 AC

    S5_UserReview --> S7_E2EAsk: 用户同意 E2E
    S7_E2EAsk --> S6_Done
    S7_E2EAsk --> S3_Implement: E2E 失败

    S6_Done --> S8_Commit: 用户要求提交
    S8_Commit --> [*]
    S6_Done --> [*]
    T0_Fix --> S6_Done: 用户验证修复
```

## 档位与路径

| 档位 | 设计落盘 | 设计停点 |
|------|----------|----------|
| T0 | `.ai/fixes/<slug>/00-bugfix.md` | 定级确认 |
| T1 | `planning/<slug>/00-meta` + `01-change-lite.md` | 1 |
| T2/T3 | `planning/<slug>/00-meta` + `01` + `02` | 2 |

## 各状态职责

| 状态 | Skill / Workflow | Gate |
|------|------------------|------|
| S0.5 定级 | 所有任务入口 | `tier-classification` |
| T0 | `bugfix` | — |
| T1 设计 | `requirements-design` lite | `change-lite-review` |
| T2/T3 设计 | `requirements-design` full | `requirements-review` → `design-review` |
| S3 实现 | `feature-development` | `pre-implementation` |
| S4 自验 | — | `post-implementation` |
| S7 E2E | — | 须用户同意 |

## 规格偏差

[spec-deviation.md](./spec-deviation.md) — 先分类，更新 fixes/planning 文件，再改代码。
