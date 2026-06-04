# 小改评审门禁（T1）

**T1 小改**唯一设计停点：用户确认 `01-change-lite.md` 后才开始编码。

## 前置

- [ ] [tier-classification](./tier-classification.md) 已确认档位为 **T1**
- [ ] `.ai/planning/<slug>/00-change-meta.md` 已写入且定级「已确认」

## 检查清单

- [ ] **改动清晰**：一句话说清改什么、为什么
- [ ] **范围小**：通常单端、少量文件（无静默扩 scope）
- [ ] **验收标准**：3～5 条可观察行为（lite 文档内）
- [ ] **变更范围**：文件/目录表已列
- [ ] **已落盘**：`01-change-lite.md` 已写入

## 通过后

**停止**，请用户 review `01-change-lite.md`：「小改方案是否 OK？确认后开始实现。」

确认后 → 更新 lite 文档确认记录 → `feature-development`

## 未通过

修订 `01-change-lite.md`；若发现实为 T2 → 升级档位，改写完整 01+02 流程。
