# 需求分析与方案设计工作流

适用于**尚未写正式业务代码**的阶段（**T1 / T2 / T3**）。**T0** 走 [bugfix](./bugfix.md)。

**生命周期**：[agent-lifecycle.md](./agent-lifecycle.md)  
**档位与落盘**：[planning/README.md](../planning/README.md)

---

## 0. 建立上下文 + 定级 ⏸

- 读 [FEATURE-PLAN](../planning/FEATURE-PLAN.md)、[CURRENT](../progress/CURRENT.md)
- Agent **提议** T0–T3 + slug + 理由（见 [tier-classification](../gates/tier-classification.md)）
- **停止**，请用户确认档位
- **T0** → 转 [bugfix](./bugfix.md)，**退出本 workflow**
- **T1+** → 创建目录，**先写** `.ai/planning/<slug>/00-change-meta.md`（定级确认记录：已确认）

---

## T1 小改（1 停点 + lite 文档）

> 禁止写 `01-requirements.md` + `02-solution-design.md` 双文件流程。

1. 调研邻近代码（简要）
2. 按 `.ai/templates/change-lite.md` **写入** `01-change-lite.md`
3. Gate：[change-lite-review](../gates/change-lite-review.md)
4. **停止**，请用户 review lite 文档
5. 确认 ✅ → [功能开发](./feature-development.md)

---

## T2 / T3 完整流程（2 停点）

### 阶段 1：需求分析 ⏸

1. 按 `.ai/templates/feature-brief.md` **写入** `01-requirements.md`
2. Gate：[requirements-review](../gates/requirements-review.md)
3. **停止** → 用户确认 → 更新确认记录

### 阶段 2：方案设计 ⏸

1. 调研代码；T2 侧重回归/迁移，T3 侧重多方案对比
2. 按 `.ai/templates/solution-design.md` **写入** `02-solution-design.md`（AC + 变更范围必填）
3. Gate：[design-review](../gates/design-review.md)
4. **停止** → 用户确认 → 可选 `03-implementation-plan.md`（T3 推荐）→ [功能开发](./feature-development.md)

---

## 分工摘要

```text
S0.5  定级 ⏸
T1    00-meta + 01-change-lite ⏸ → 实现
T2/T3 00-meta + 01 ⏸ + 02 ⏸ (+03) → 实现
T0    → bugfix（fixes/ 目录）
```

## 记忆与规划

- backlog → 提议更新 `FEATURE-PLAN.md`
- 架构决策 → `memory/project-decisions.md`
