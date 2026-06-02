# 后端代码质量门禁

变更 `apps/backend/**/*.ts` 时，在 **commit** 或宣称完成**之前**通过。

## 自动化（必须通过）

```bash
pnpm -C apps/backend lint          # ESLint：no-any、ban-ts-comment、max-lines-per-function ≤40
pnpm -C apps/backend exec tsc --noEmit
pnpm build
```

`pnpm lint`（根目录 / CI）已包含 backend ESLint。

## 函数与 Service 结构

- [ ] **无超过 40 行的函数**（不含空行/注释），或已拆分且公开方法变短 — **ESLint `max-lines-per-function` 强制执行**
- [ ] 每个函数 **单一职责**（未在同一函数内混 SQL + RAG/外部 API + 多段业务分支）
- [ ] Service **公开方法** 以编排为主，读起来像步骤列表
- [ ] **无 copy-paste**：相同逻辑（history、sources、title 更新等）已抽取共享
- [ ] 流式 / 非流式变体共享核心逻辑，仅 stream 层保留 SSE/迭代

## 快速自检（改 Service 时）

1. 打开改动文件，扫一眼最长函数 — 超过一屏则拆
2. 搜索相似代码块 — 出现 2 次即抽函数
3. 公开方法能否用 5–7 个步骤名概括？不能则未拆够

## 类型与安全

- [ ] 禁止 `@ts-ignore`、禁止随意 `any`
- [ ] 外部输入已校验；错误明确抛出或返回
- [ ] 无密钥、token 写入代码或日志
- [ ] API 新增/变更时已读 `.ai/gates/api-contract.md`

## 与前端 gate 的关系

- 仅 backend → 本 gate + `code-quality.md` 中的 build 项
- 全栈功能 → 另过 `code-quality.md`（含 lint-staged）及适用的 `ui-quality.md`

拆分指南：`.cursor/skills/backend-service/SKILL.md`
