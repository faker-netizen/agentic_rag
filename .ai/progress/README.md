# 项目进度（存档点）

跨会话续作时，**先读这里，再写代码**。

## 文件说明

| 文件 | 用途 |
|------|------|
| [CURRENT.md](./CURRENT.md) | **新会话入口**：现状摘要、进行中、下一步（保持短，常更新） |
| [log/](./log/) | 每个已完成功能一条存档（只增不改，按日期命名） |

## 何时写存档

功能 **实现 + 验证 + commit（或 PR 合并）** 后：

1. 复制 [progress-checkpoint 模板](../templates/progress-checkpoint.md) 到 `log/YYYY-MM-DD-简短英文名.md`
2. 更新 [CURRENT.md](./CURRENT.md) 的「已完成 / 进行中 / 下一步」

## 与 memory 的分工

| 目录 | 记什么 |
|------|--------|
| `planning/FEATURE-PLAN.md` | **要做什么**（模块、阶段、backlog） |
| `progress/` | **做了什么功能**、停在哪、下一步干嘛（会话续作） |
| `memory/project-decisions.md` | **为什么这样设计**（架构决策） |
| `memory/common-failures.md` | **踩过什么坑**（避免重犯） |

## Agent / 开发者

- 新会话开始：读 `CURRENT.md`
- 功能完成：写 `log/` + 更新 `CURRENT.md`
- 详细步骤：项目 skill `project-progress`（`.cursor/skills/project-progress/SKILL.md`）
