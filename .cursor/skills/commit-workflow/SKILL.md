---
name: commit-workflow
description: >-
  为 design_to_code 创建 git 提交，含 pre-commit ESLint 验证。用户要求提交、git add、
  或 commit 前审查暂存变更时使用。
---

# Git 提交流程

## 步骤

1. **查看变更**（可并行执行）：
   ```bash
   git status
   git diff
   git diff --cached
   git log -5 --oneline
   ```
2. **范围** — 只提交相关文件；绝不提交密钥（`.env`、凭证等）。
3. **验证** — 阅读 `.ai/gates/code-quality.md`；对已暂存的 web TS/TSX：
   ```bash
   pnpm exec lint-staged
   ```
   或手动：`pnpm -C apps/web exec eslint --fix --max-warnings=0` 针对变更文件。
4. **修复** — ESLint 失败时读 `.ai/memory/common-failures.md`；修完重新暂存。
5. **提交** — 简洁的 commit message（本仓库风格：简短中文或英文，侧重 why）。
6. **确认** — 提交后执行 `git status`。

## 提交后（功能级变更）

若本次为完整功能交付，使用 `project-progress` skill：写 `.ai/progress/log/`，更新 `CURRENT.md`。

## Pre-commit 钩子

Husky 会自动跑 `lint-staged`。若 hook 失败：

- 除非用户明确要求，**不要**使用 `--no-verify`
- **不要** amend 已失败的提交；修复后创建**新** commit

## 较大变更可选检查

```bash
pnpm lint
pnpm build
```

仅改 backend 时 lint-staged 不会覆盖；若类型有变动，可跑 `pnpm -C apps/backend exec tsc`。
