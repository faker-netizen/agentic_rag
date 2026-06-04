# 实现后自验门禁（阶段 4）

编码完成、**向用户汇报之前** Agent 自行通过。此阶段**禁止**未经用户同意运行 E2E。

## 硬门禁（机器，必须通过）

Agent 自行执行并贴出结果摘要（通过 / 失败）：

```bash
pnpm lint
pnpm build
```

涉及已暂存 web TS/TSX 时还可模拟：

```bash
pnpm exec lint-staged
```

失败 → 修复后重跑，**不要**进入用户验收。

## 软门禁（清单，Agent 自评并汇报）

阅读并对照勾选，在汇报中说明每项状态：

| Gate | 何时 |
|------|------|
| [code-quality.md](./code-quality.md) | 始终 |
| [frontend-quality.md](./frontend-quality.md) | 改了 web / components |
| [backend-quality.md](./backend-quality.md) | 改了 backend |
| [ui-quality.md](./ui-quality.md) | 改了 UI / 布局 |
| [api-contract.md](./api-contract.md) | 改了 API |

软门禁要点（摘要）：

- [ ] 核心逻辑已抽取，无大段实现堆在单函数 / JSX
- [ ] 可复用步骤未重复实现
- [ ] loading / error / empty 已处理（如有数据流）
- [ ] diff 范围与方案中的「变更范围」一致

## 向用户汇报（必须）

1. 做了什么（对照方案摘要）
2. 硬门禁结果
3. 软门禁自评（未达标项如实说明）
4. **请用户目视验收**（本地 `pnpm dev` 或 Playwright MCP 截图/说明）
5. **询问是否运行 E2E**：「是否需要我跑 `pnpm test:e2e:smoke`（或补充 spec）？」

## E2E 规则

- **默认不跑**；仅当用户明确同意，或用户说「跑 E2E / 写 E2E」时执行
- CI 仍会跑 smoke；本地/Agent 主动跑需用户确认
- E2E 失败 → 修复实现，**不**静默扩大 scope

## 用户认可后

- 不要求提交 → 可结束或写 progress（若用户要求存档）
- 要求提交 → `commit-workflow` skill → CI
