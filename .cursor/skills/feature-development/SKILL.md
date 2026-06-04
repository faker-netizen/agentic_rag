---
name: feature-development
description: >-
  档位与 design 文档已确认后的实现——对照 lite 或 02 中 AC，自验软硬门禁，
  用户目视验收、经同意才跑 E2E。T0 用 bugfix skill。
---

# 功能开发

**前置**：`tier-classification` 已确认；设计文档已确认：

| 档位 | 判据文档 |
|------|----------|
| T1 | `planning/<slug>/01-change-lite.md` |
| T2/T3 | `planning/<slug>/02-solution-design.md` |

T0 → 使用 `bugfix` skill，非本 skill。

## 快速开始

1. 续作 — `CURRENT.md`；打开对应 planning/fixes 文档
2. `feature-development.md` workflow + `agent-lifecycle.md`
3. `pre-implementation` gate
4. 实现 — 不超变更范围
5. `post-implementation` → 用户目视 → 问 E2E
6. 偏差 — `spec-deviation.md`
7. 提交 / progress — 链接 planning 或 fixes 路径

详细：`.ai/workflows/feature-development.md`
