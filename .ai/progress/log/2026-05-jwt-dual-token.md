# JWT 双 token

- **日期**：2026（早期）
- **Commit**：`6cf13bf`
- **状态**：已完成

## 做了什么

- 实现 access + refresh 双 token 鉴权流程
- 前端 token 存储与刷新逻辑

## 涉及范围

- **Packages / Apps**：`apps/web`、`apps/backend`
- **主要文件**：`apps/web/src/service/token.ts`、backend auth 相关

## 如何验证

- 登录 / 登出 / token 过期刷新

## 遗留 / 下一步

- 见 `security.mdc` 与 `.ai/gates/api-contract.md`

## 相关链接

- —
