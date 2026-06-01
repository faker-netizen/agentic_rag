---
name: backend-service
description: >-
  指导 apps/backend 中 Service 层的函数拆分与编排——薄公开方法、抽取重复步骤、
  流式与非流式共享逻辑。修改或新增 *Service.ts、处理长函数、RAG/聊天/数据库
  编排时使用。
---

# 后端 Service 拆分指南

## 何时触发

- 新增或修改 `apps/backend/src/services/**/*.ts`
- 单个函数将超过或已超过 **40 行**
- 流式 / 非流式两套几乎相同的逻辑（如 `appendMessage` vs `appendMessageStream`）

## 拆分流程

### 1. 列出步骤（先写清单，再写代码）

对目标公开方法，用注释或 bullet 写出顺序步骤，例如聊天发送：

1. 校验输入
2. 加载会话 history
3. 落库 user message
4. 生成回复（RAG 或 plain）
5. 解析 sources
6. 落库 assistant message
7. 更新 session title

公开方法最终应 **只保留这类步骤调用**，每步一行或数行。

### 2. 每步一个函数

| 步骤类型 | 命名示例 | 放置 |
|----------|----------|------|
| 校验 | `assertNonEmptyMessage(text)` | private 或同文件 |
| 查询 | `loadChatHistoryAsc(sessionId)` | private |
| 持久化 | `insertUserMessage(...)` | private |
| 业务 | `buildSourcesFromChunks(...)` | private 或 `*Helpers.ts` |
| 编排 | `appendMessage(...)` | public，≤ 20 行 |

### 3. 去重复

若两个 public 方法共享 ≥3 行相同逻辑：

- 抽 `private` 方法（同 class 内优先）
- 或抽 `services/chat/chatHistory.ts` 等模块（职责变多时再拆目录）

**反例：** `appendMessage` 与 `appendMessageStream` 各写一遍 history 查询与 title 更新。

### 4. 流式 vs 非流式

- **共享：** history 加载、sources 解析、message 落库、title 更新
- **分离：** token 循环 / SSE 推送（仅 stream 方法保留）

```typescript
// 编排层示意
async appendMessage(...) {
  const text = this.normalizeMessage(content);
  const session = await this.requireSession(userId, sessionId);
  const history = await this.loadChatHistoryAsc(sessionId);
  const userMessageId = await this.insertUserMessage(sessionId, text);
  const { answer, sources } = await this.generateReplySync(text, session, history, userId);
  const assistantMessageId = await this.insertAssistantMessage(sessionId, answer, sources);
  await this.maybeUpdateSessionTitle(session, text);
  return { userMessageId, assistantMessageId, answer, sources };
}
```

## 何时拆文件

| 信号 | 动作 |
|------|------|
| 单文件 > ~250 行且多组无关 API | 按领域拆 `chat/`、`rag/` 子目录 |
| helper 被多个 Service 使用 | `services/shared/` 或 `utils/` |
| 仅一个 Service 用 | 同文件 `private` 即可，勿过早抽象 |

## 参考

- 待重构范例：`apps/backend/src/services/chatService.ts`（`appendMessage*` 过长且有重复）
- 短函数范例：同文件 `getSession`、`createSession`

## 完成前

阅读并通过 `.ai/gates/backend-quality.md`；backend 变更跑：

```bash
pnpm -C apps/backend exec tsc --noEmit
pnpm build
```
