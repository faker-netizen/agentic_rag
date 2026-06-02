# E2E（Playwright Test）

方案说明：[`.ai/planning/playwright-e2e-design.md`](../.ai/planning/playwright-e2e-design.md)

## 首次 setup

```bash
# 1. 浏览器（本机一次）
pnpm exec playwright install chromium

# 2. 测试账号（与 backend 管理员或已注册用户一致）
cp e2e/.env.example e2e/.env
# 编辑 e2e/.env 填写 E2E_USER_EMAIL / E2E_USER_PASSWORD

# 3. 确保 MySQL + apps/backend/.env 可用（与日常 dev 相同）
```

## 运行

```bash
# 自动起 backend + web（若已在跑则复用）
pnpm test:e2e:smoke

# 全部 E2E
pnpm test:e2e

# 仅 integration（如聊天 SSE mock，不调真实 LLM）
pnpm test:e2e:integration

# 调试 UI
pnpm test:e2e:ui
```

## Phase 2 覆盖

| Spec | 标签 | 说明 |
|------|------|------|
| `tests/smoke/knowledge-base.spec.ts` | `@smoke` | 新建 KB、打开 Finder、上传 txt |
| `tests/integration/chat-sse.spec.ts` | `@integration` | `page.route` mock SSE，断言回复展示 |

上传用例会调用后端 embedding API（与日常 dev 相同）；无向量配置时该条可能失败。

## 与 Playwright MCP

- **MCP**：开发时 Agent 探路、看 SSE/布局  
- **本目录 spec**：固定回归；MCP 摸清流程后沉淀为 `tests/**/*.spec.ts`
