# 聊天流式与 rAF 优化

- **日期**：2026（早期）
- **Commit**：`0801258`
- **状态**：已完成

## 做了什么

- SSE 流式聊天
- `useRafStreamBuffer` 对流式正文做 rAF 节流
- 虚拟列表消息展示（`ChatMessageVirtualList`）

## 涉及范围

- **Packages / Apps**：`apps/web`、`apps/backend`
- **主要文件**：`pages/chat/`、`ChatMessageVirtualList.tsx`、`chatService.appendMessageStream`

## 如何验证

- 打开聊天页，发送消息，观察流式输出与滚动

## 遗留 / 下一步

- 聊天页组件仍较长，可按 `frontend-component` 继续拆
- backend `chatService` 长函数待 refactor

## 相关链接

- `.ai/memory/common-failures.md`（ESLint / 滚动相关）
