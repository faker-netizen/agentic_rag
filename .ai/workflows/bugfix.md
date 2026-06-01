# Bug 修复工作流

## 1. 复现

- 确认期望行为 vs 实际行为。
- 定位文件及层级（web / backend / 共享包）。

## 2. 最小修复

- 用最小改动修复根因。
- 不做顺手重构。

## 3. 验证

- `.ai/gates/code-quality.md`
- 按原复现步骤再测一遍

## 4. 记录

若属于 harness 漏洞（lint 本应拦住、文档模式有误）：

- 追加 `.ai/memory/common-failures.md`
- 考虑更新 rule 或 gate

## 5. 提交

使用 `commit-workflow` skill；commit message 应说明修复了什么。
