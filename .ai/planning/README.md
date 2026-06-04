# 功能规划目录

## 总览

| 路径 | 用途 |
|------|------|
| `FEATURE-PLAN.md` | 产品 roadmap、backlog（F-00…） |
| `*-design.md` | 跨功能/基础设施级设计 |
| `<slug>/` | **T1 / T2 / T3** 变更的需求与设计落盘 |
| `../fixes/<slug>/` | **T0** Bug 修复落盘（见 [fixes/README.md](../fixes/README.md)） |

## 变更档位（Change Tier）

**任何任务开工前**：Agent **提议**档位 → 用户 **确认**（[tier-classification gate](../gates/tier-classification.md)）。

| 档位 | 类型 | 典型场景 | Workflow | 落盘 |
|------|------|----------|----------|------|
| **T0** | bugfix | 行为已定义，实现错了 | [bugfix](../workflows/bugfix.md) | `.ai/fixes/<slug>/00-bugfix.md` |
| **T1** | minor | 小改、少量文件、意图明确 | requirements-design **lite** | `planning/<slug>/00-change-meta.md` + `01-change-lite.md` |
| **T2** | refactor | 大改、跨模块、要重定 AC | requirements-design **完整** | `00-change-meta.md` + `01` + `02` (+03) |
| **T3** | feature | 新能力、新数据流 | requirements-design **完整** | 同上；**推荐** `03-implementation-plan.md` |

### 定级参考

```text
改变用户可感知的行为契约？  否 → 倾向 T0/T1；是 → T2/T3
跨 web + backend + packages？  否 → T0/T1；是 → T2/T3
新 API / 新路由 / 新持久化？  是 → 至少 T2；全新能力 → T3
```

### 停点数量

| 档位 | 设计阶段停点 |
|------|--------------|
| T0 | 0（定级确认后即可修；修完请你验证） |
| T1 | **1**（确认 `01-change-lite.md`） |
| T2 / T3 | **2**（确认 `01-requirements.md` → 确认 `02-solution-design.md`） |

---

## T1 / T2 / T3 子目录结构

### T1 小改

```text
.ai/planning/<slug>/
  00-change-meta.md      ← 定级记录（用户确认后写入）
  01-change-lite.md      ← 范围 + 3～5 条 AC；1 次停点
```

模板：`.ai/templates/change-meta.md`、`.ai/templates/change-lite.md`  
Gate：[change-lite-review](../gates/change-lite-review.md)

### T2 大改 / T3 新功能

```text
.ai/planning/<slug>/
  00-change-meta.md
  01-requirements.md
  02-solution-design.md
  03-implementation-plan.md   ← T3 推荐；T2 可选
```

模板：`.ai/templates/feature-brief.md`、`solution-design.md`、`implementation-plan.md`  
Gate：[requirements-review](../gates/requirements-review.md)、[design-review](../gates/design-review.md)

### slug 命名

- 英文小写连字符；可选前缀：`feat-`、`refactor-`、`chore-`（T1）
- 与 F-xx 对应时：`feat-f-00-domain-skill`
- 同一迭代**更新原目录**，勿重复建平行目录

### 确认记录

各文档文末「确认记录」表：`状态: 待确认` → 用户确认后改「已确认」。

---

## 与 progress 的关系

| 阶段 | T0 | T1–T3 |
|------|-----|-------|
| 实施前 | `fixes/<slug>/` | `planning/<slug>/` |
| 实施后 | `progress/log/` + `CURRENT.md`（链接上述路径） |
