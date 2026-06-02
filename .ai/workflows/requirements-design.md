# 需求分析与方案设计工作流

适用于**尚未写正式业务代码**的阶段。与 [功能开发](./feature-development.md) 衔接：本流程产出设计 → 下一流程实现。

## 1. 建立上下文

- 读 [FEATURE-PLAN](../planning/FEATURE-PLAN.md)（本产品范围、阶段、F-00 等）
- 读 [CURRENT](../progress/CURRENT.md)（续作时）
- 确认用户意图：要解决什么问题？谁用？成功长什么样？

**停止条件：** 关键信息缺失 → 列出问题清单，等用户回复后再继续。

## 2. 需求澄清

按下面维度整理（不必全写进文档，但 Agent 须心里有数）：

| 维度 | 问题 |
|------|------|
| 目标 | 用户痛点 / 业务价值是什么？ |
| 范围 | 纳入什么？明确不做什么？ |
| 用户 | 谁操作？鉴权边界？ |
| 数据 | 读写什么？与知识库/会话/文档的关系？ |
| 交互 | 页面还是 API？是否 SSE 流式？ |
| 约束 | 性能、安全、兼容、工期 |

可选产出：`.ai/templates/feature-brief.md`

## 3. 现状调研

在仓库内搜索，避免重复造轮子：

```text
- 类似 UI / 页面 → apps/web/src/pages、desktop/
- 类似 API → apps/backend/src/routes、services/
- 共享能力 → packages/components、utils/
- 流式/SSE → apps/backend/src/utils/sse.ts、apps/web/src/service/sseClient.ts
```

记录：**可复用** / **需扩展** / **需新建**。

## 4. 方案设计

至少给出 **1 个推荐方案**；存在明显 trade-off 时给出 **2+ 备选** 并对比：

| 对比项 | 方案 A | 方案 B |
|--------|--------|--------|
| 实现复杂度 | | |
| 与现有架构一致性 | | |
| 可测试性 / 可维护性 | | |
| 风险 | | |

说明推荐理由。涉及 API 时草拟路径与方法；涉及 UI 时说明入口（桌面壳窗口 / 路由）。

可选产出：`.ai/templates/solution-design.md`

## 5. 设计评审（Gate）

阅读并通过 `.ai/gates/design-review.md`。

- 用户要求「先出方案不要写代码」→ 到此步停止，交付文档
- 用户确认方案 → 可生成 `.ai/templates/implementation-plan.md` 并进入 [功能开发](./feature-development.md)

## 6. 记忆与规划

- 与 FEATURE-PLAN 新增/调整 backlog → 提议更新 `FEATURE-PLAN.md`（经用户同意）
- 架构级决策 → 实现后写入 `memory/project-decisions.md`

## 与 feature-development 的分工

```
requirements-design（本流程）  →  问清楚、调研、比方案、出文档
feature-development           →  pre-implementation gate、编码、lint、提交、存档
```

Trivial 改动（用户明确、单文件、< ~20 行）可跳过本流程，直接 feature-development 或 bugfix。
