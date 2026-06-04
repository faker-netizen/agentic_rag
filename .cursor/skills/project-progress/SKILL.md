---
name: project-progress
description: >-
  读写 design_to_code 项目进度存档——新会话先读 CURRENT.md，功能完成并提交后写
  log 存档点并更新摘要。用户说续作、存档、进度、上次做到哪、新会话时使用。
---

# 项目进度存档

## 新会话开始（先读）

1. `.ai/progress/CURRENT.md` — 现状、进行中、下一步
2. 若规划新功能：`.ai/planning/FEATURE-PLAN.md`
3. 若做具体功能，打开 `log/` 里相关存档了解上下文
3. 再按 `ai-harness.mdc` 路由到 workflow / skill

## 功能完成后（必写）

触发条件：**实现 + gate 验证 + git commit**（或 PR 合并）后。

### 步骤

1. 复制 `.ai/templates/progress-checkpoint.md` →  
   `.ai/progress/log/YYYY-MM-DD-简短slug.md`（英文 slug，小写连字符）
2. 填写：做了什么、主要文件、如何验证、遗留项、commit hash
3. **链接** `.ai/planning/<slug>/` 或 `.ai/fixes/<slug>/`（含 `00-change-meta` / bugfix 记录）
4. 更新 `.ai/progress/CURRENT.md`：
   - 「已完成」表加一行链接
   - 清空或更新「进行中」
   - 调整「下一步建议」
   - 更新文首「最后更新」日期

### CURRENT.md 保持短

- 只留摘要与链接，细节放在 `log/` 单文件
- 避免把 CURRENT 写成冗长 changelog

## 与 memory 区别

| 写什么 | 放哪 |
|--------|------|
| 功能做完、停在哪 | `progress/log/` + `CURRENT.md` |
| 需求 / 方案（T1–T3） | `planning/<slug>/` |
| Bug 修复（T0） | `fixes/<slug>/` |
| 架构为什么这样 | `memory/project-decisions.md` |
| 踩坑 | `memory/common-failures.md` |

## 示例话术（用户）

- 「读一下项目进度，继续上次的工作」
- 「这个功能做完了，写存档点」
- 「更新 CURRENT，我们下一步做 xxx」
