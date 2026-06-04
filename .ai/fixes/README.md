# Bug 修复落盘（T0）

修 Bug（**T0**）的文档放本目录，与功能规划（`.ai/planning/`）分离。

## 路径

```text
.ai/fixes/<slug>/
  00-bugfix.md    ← 必须（模板：`.ai/templates/bugfix-record.md`）
```

### slug 命名

- 前缀建议 `fix-`：`fix-e2e-utils-dist`、`fix-login-token-expired`
- 英文小写连字符

## 何时使用（T0）

| 条件 | 说明 |
|------|------|
| 期望行为已定义 | 既有 AC、文档、或明确 bug 报告 |
| 实现偏离预期 | 非新需求、非行为重设计 |
| 定级 | Agent 提议 **T0** → 用户确认 |

**不走** `requirements-design` 两阶段；走 [bugfix workflow](../workflows/bugfix.md)。

## 00-bugfix.md 必含

- 复现步骤 / 期望 vs 实际
- 根因（调查后更新）
- 修复范围（文件列表）
- 验证方式
- 确认记录（修复完成后可标注「已验证」）

## 与 planning 的关系

| 类型 | 目录 |
|------|------|
| T0 Bug | `.ai/fixes/<slug>/` |
| T1 小改 | `.ai/planning/<slug>/`（lite） |
| T2 大改 / T3 新功能 | `.ai/planning/<slug>/`（完整 01+02） |

progress log 完成时链接对应 fixes 或 planning 路径。
