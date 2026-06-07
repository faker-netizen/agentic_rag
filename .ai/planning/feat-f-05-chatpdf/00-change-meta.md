# 变更元数据（定级记录）

> **落盘路径**：`.ai/planning/feat-f-05-chatpdf/00-change-meta.md`

## 定级（Agent 提议 → 用户确认）

| 项 | 值 |
|----|-----|
| change-tier | **T3** |
| change-type | feature |
| slug | `feat-f-05-chatpdf` |
| backlog | **F-05**（ChatPDF 应用） |
| workflow | requirements-design-full |
| 定级理由 | 新桌面应用（PDF 阅读器 + 分点引用总结）；PDF 按页结构化存储；引用跳转（页码 + 页内搜索高亮）；跨 web + backend；新 API/文件流。 |

## 定级确认记录

| 项 | 值 |
|----|-----|
| 状态 | **已确认** |
| 确认人 | 用户 |
| 确认时间 | 2026-06-04 |
| 备注 | T3；MVP 页码+搜索高亮；方案确认后 **不与知识库关联** |

## 本档位落盘清单

- [x] `01-requirements.md`（已确认）
- [x] `02-solution-design.md`（已确认 2026-06-04；与 KB 解耦修订）
- [ ] `03-implementation-plan.md`（02 确认后推荐）

## 链接

- FEATURE-PLAN：[F-05 ChatPDF](../../planning/FEATURE-PLAN.md)
- 依赖：[feat-f-00-domain-skill](../feat-f-00-domain-skill/)（SSE、Skill 模式可复用）
- 关联：[feat-f-12-doc-index-summary](../feat-f-12-doc-index-summary/)（KB 文档打开入口，非阻塞）
