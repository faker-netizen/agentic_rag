# 变更定级门禁（S0.5）

任何非「用户已明确档位」的任务，在写 planning / fixes 文档或业务代码**之前**通过。

## 流程

1. Agent 根据 [change-tier 规则](../planning/README.md#变更档位-change-tier) **提议**档位（T0–T3）+ slug + 理由
2. **停止**，请用户确认或调整档位
3. 用户确认 ✅ → 落盘 `00-change-meta.md`（T1+）或 `fixes/<slug>/00-bugfix.md`（T0）
4. 按档位进入对应 workflow

**禁止**未经用户确认档位就写 `01-requirements.md` / `02-solution-design.md` / 开始编码。

## 提议格式（对话）

```markdown
## 变更定级提议

| 项 | 值 |
|----|-----|
| 提议档位 | T0 / T1 / T2 / T3 |
| 类型 | bugfix / minor / refactor / feature |
| slug | xxx |
| 理由 | （1–3 句，对照定级规则） |
| 将落盘 | `.ai/fixes/...` 或 `.ai/planning/...` |
| 后续 workflow | bugfix / requirements-design(T1 lite) / requirements-design(完整) |

请确认档位是否正确。
```

## 定级检查清单

- [ ] 已对照四档定义，而非默认 T3
- [ ] slug 与目录规划一致
- [ ] T0 未要求完整需求/方案两阶段
- [ ] T1 未要求 01+02 双停点（仅 lite + 1 停点）
- [ ] T2/T3 未跳过需求或方案落盘
- [ ] 用户已确认档位

## 用户可直接指定

用户说「这是个小改 T1」「修 bug」→ 仍建议写 meta / bugfix 落盘，但可跳过提议对话。

## 未确认时

不得进入 requirements-design、bugfix 实现或 feature-development。
