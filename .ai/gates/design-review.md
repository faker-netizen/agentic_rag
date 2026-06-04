# 设计评审门禁（阶段 2）

**适用：T2 / T3**（T1 用 [change-lite-review](./change-lite-review.md)）。

在**方案与验收标准交付用户确认**或**进入实现前**通过。  
**前置**：`01-requirements.md` 确认记录为「已确认」。

## 检查清单

- [ ] **问题清晰**：与 `01-requirements.md` 一致，无静默扩 scope
- [ ] **已调研代码**：列出复用点，非凭空设计
- [ ] **方案可执行**：层（web/backend/packages）与主要路径已点名
- [ ] **有取舍**：多方案已对比，或说明为何不选其他路径
- [ ] **验收标准完整**（必填，见下）
- [ ] **变更范围明确**：新建 / 改动目录与文件
- [ ] **已落盘**：`.ai/planning/<feature-slug>/02-solution-design.md` 已写入
- [ ] **安全**：无密钥进仓库、鉴权边界已考虑
- [ ] **产品对齐**：文档 AI 平台；LLM 回答走 SSE

## 产出物（必须）

| 项 | 要求 |
|----|------|
| 路径 | `.ai/planning/<feature-slug>/02-solution-design.md` |
| 格式 | 基于 `.ai/templates/solution-design.md` |
| 确认记录 | 文末 `状态: 待确认` |

禁止仅用对话交付方案。

## 验收标准（必填）

方案中须含**可测试、可观察**条目。至少覆盖：交互状态、进度反馈、三态、成功/失败、鉴权（如适用）。

## 变更范围（必填）

表格：层 | 路径 | 变更类型（新建/扩展/复用）

## 通过后

**停止**，请用户 review `02-solution-design.md`。**不要**写业务代码。

用户确认后 → 更新确认记录为「已确认」→ 可选 `03-implementation-plan.md`。

## 未通过 / 用户驳回

修订 `02-solution-design.md`；需求偏差 → 回到阶段 1 并更新 `01-requirements.md`。  
详见 [spec-deviation](../workflows/spec-deviation.md)。

## 可豁免

无；请用 [tier-classification](./tier-classification.md) 定档。用户明确指定 T0–T3 时可跳过提议对话，仍须落盘。
