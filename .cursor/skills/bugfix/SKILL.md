---
name: bugfix
description: >-
  T0 Bug 修复——Agent 提议定级、落盘 .ai/fixes/<slug>/00-bugfix.md、
  最小修复、自验、用户验证。用于行为已定义但实现错误的修复。
---

# Bug 修复（T0）

**档位 T0** · 落盘：[fixes/README.md](../../.ai/fixes/README.md) · 流程：[bugfix.md](../../.ai/workflows/bugfix.md)

## 何时使用

| 场景 | T0 bugfix | 改档位 |
|------|-----------|--------|
| CI 红、复现明确的错误 | ✅ | |
| 与 AC/文档不符的实现 | ✅ | |
| 要改交互/新行为 | | → T1/T2 |
| 新功能 | | → T3 |

## 步骤

1. 提议 T0 + slug → [tier-classification](../../.ai/gates/tier-classification.md) → **用户确认**
2. 写入 `.ai/fixes/<slug>/00-bugfix.md`
3. 最小修复 + 更新 bugfix 文档根因/范围
4. 自验 → 用户按复现步骤确认
5. 提交（用户要求时）→ progress 链接 fixes 路径

## 禁止

- 未经定级确认开始改代码
- 用 bugfix 名义做功能增强（应升档）
