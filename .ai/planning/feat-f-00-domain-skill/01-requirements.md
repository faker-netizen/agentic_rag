# F-00 业务域 Skill 框架 — 需求分析

> **适用：T3 阶段 1**  
> **落盘路径**：`.ai/planning/feat-f-00-domain-skill/01-requirements.md`  
> **前置**：`00-change-meta.md` 定级已确认  
> **下一步**：用户确认本文 → `02-solution-design.md`

## Feature slug

`feat-f-00-domain-skill`（Backlog **F-00**）

## 问题

当前平台已有 **知识库 + RAG + 聊天 SSE**，但能力是「硬编码」在 `chatStreamHelpers` 里（有 KB 走 RAG，无 KB 走 plain），缺少：

1. **可注册、可命名的业务域 Skill**（策略 + 允许的工具子集 + 默认文档 scope）
2. **统一 Tool Call 层**，把后端已有能力（检索、摘要等）封装成 LLM 可调度、可审计的原子工具
3. **执行时强制 scope**（仅用户授权的 KB/文档），与产品「文档 AI 工作平台」定位一致
4. **对话侧可观测**（当前用了哪个 Skill、引用从哪来）

没有该框架，无法做域路由、示例域 Skill、Skill 工坊（F-11），`chatService` 也难以演进为 Skill 执行器。

## 背景（现状）

| 已有能力 | 路径 | 与 F-00 关系 |
|----------|------|----------------|
| 聊天 SSE | `chatService.appendMessage`、`chatStreamHelpers` | 将演进为调用 **domainSkillExecutor** |
| RAG 流式 | `ragService.answerWithRAGStream` | 封装为 tool `kb_search` / 检索链路 |
| 纯对话 | `ragService.streamChatPlain` | 无 KB 或 Skill 未启用检索时的兜底 |
| 演示 Agent | `minAgent.ts`（LangChain `createAgent` + Zod `tool`） | **参考** tool 定义方式，与业务解耦 |
| 会话绑 KB | `chat_sessions.knowledge_base_id` | 作为 **默认 scope** 来源之一 |
| RAG 页 SSE | `ragQueryHandler` | 迁入 **domainSkillExecutor**（内置 `kb-rag` Skill） |

## 用户与角色

| 角色 | 说明 |
|------|------|
| **终端用户**（已登录） | 在智能对话中选择/使用业务域 Skill，在绑定 KB 的 scope 内问答并看到引用 |
| **系统/运营**（MVP） | 通过 **内置 Skill 种子数据**（代码或 migration）提供 1～2 个示例域，无管理后台 |
| **开发者** | 扩展 Platform Tool Catalog、注册新 Skill 定义 |

## 核心概念（产品侧）

| 术语 | 定义 |
|------|------|
| **Platform Tool** | 平台级原子能力（Zod 参数 + 服务端实现），如 `kb_search` |
| **Skill 定义** | 名称、描述、system 策略、`allowedTools[]`、`defaultScope`、状态 |
| **Scope** | 单次执行允许访问的 `userId` + `knowledgeBaseId`（MVP 以 KB 为主） |
| **Skill 执行器** | 根据 Skill 定义调度 LLM + tools，输出流式 token + sources |
| **域路由** | 将用户输入映射到 Skill（MVP 可 **会话级显式选择**，智能路由属 F-00a） |
| **文档索引** | 文本分块 + 写入 `embeddings` 的状态；与「分片上传」无关 |

与 **Cursor Skill**（`.cursor/skills/`）严格区分：后者服务开发 Agent，不进入本需求范围。

### 名词：上传分片 vs 文档索引

| 术语 | 含义 | 是否向量化 |
|------|------|------------|
| **分片上传**（chunk upload） | 大文件拆块 HTTP 上传后合并 | ❌ 仅传文件 |
| **文档索引 / ingest** | 解析全文 → `RecursiveCharacterTextSplitter` → `embeddings` | ✅ 供语义检索 |

**产品原则**：并非所有入库文档都必须索引；**需要 `kb_search` 的 Skill** 才依赖已索引文档。详见 §文档索引策略。

## 范围

### 纳入（F-00 MVP）

1. **持久化**
   - Skill 注册表（系统内置 Skill，MVP 不做用户 CRUD UI）
   - 可选：会话级字段记录「当前 Skill id」（或请求体传入 `skillId`）

2. **Platform Tool Catalog（后端）**
   - 至少实现并注册：
     - `kb_search` — 在 scope 内向量/多路召回，返回 chunks + 可转 `ChatSource` 的元数据
     - `cited_answer` 或等价路径 — 基于检索结果流式生成带引用回答（可与现有 RAG 流合并实现）
   - 每个 tool：**服务端执行**、校验 scope、不暴露任意 SQL/HTTP

3. **domainSkillExecutor（后端）**
   - 输入：`userId`、`session`、`userMessage`、`skillId`、`signal`
   - 行为：加载 Skill 定义 → 合并 session KB 与 Skill defaultScope → 调度 LLM + allowedTools
   - 输出：与现有聊天 SSE 事件兼容（见下）

4. **聊天链路接入**
   - **每次发送**请求体必传 `skillId` 字段（无 Skill 时传 `null` / 省略，见 §已决策）
   - 用户消息落库时写入 **`skill_id`**，列表/历史 API 返回，构成「对话 memory」
   - 构建 LLM 历史时带上各轮 `skill_id`（或摘要），便于多轮一致
   - SSE 增加 **`skill` 事件**（或扩展现有 `meta`）：`{ skillId, skillName }`
   - 增加 **`status`** 事件：短文案展示后端阶段（类 DeepSeek「思考」但 **不** 输出长链思维）
   - 保持：`meta` → `skill`? → `status`* → `sources` → `token` → `done` / `error` / `aborted`

5. **统一执行入口**
   - **RAG 查询页** `POST /api/rag/query` 改调 `domainSkillExecutor`（默认 Skill `kb-rag`）
   - **聊天**：有 KB 时走执行器（见 §需求补充）；删除独立 `streamRagReply` 硬编码路径

6. **内置 Skill（MVP ×2 + RAG 能力 Skill）**
   - **`kb-rag`** — 知识库检索问答（**RAG 能力本身**，RAG 页默认、聊天「仅 KB 无显式 Skill」时后端解析为此 id）
   - **`bullet-extract`** — 要点清单提取

7. **前端（最小）**
   - Skill 选择器；发送必传 `skillId` 或 null
   - 流式区展示：**当前 Skill 名** + **单行/极简步骤状态**（来自 `status`）
   - 现有引用/sources 展示复用

8. **SSE 韧性（聊天 + RAG 页共用 `sseClient`）**
   - 读流 **空闲超时**（长时间无字节 → 可区分于用户停止）
   - **断网/读流失败** 与 **用户 abort** 分支处理；聊天侧 `loadMessages` 对齐 DB
   - 可选：服务端 **SSE 心跳**（注释行），降低代理空闲断连

7. **鉴权与隔离**
   - 所有 tool 校验 `userId` 拥有 scope 内 KB
   - 未登录、无权限 KB → 4xx，不执行 tool

### 不纳入（F-00 MVP，放后续 backlog）

| 项 | 归哪 |
|----|------|
| 用户自定义 / 发布 Skill（UI） | F-11 Skill 工坊 |
| LLM 自动域路由 | F-00a |
| 长链思维原文展示 | 仅 `status` 短标签 |
| 断线自动重连续传 | MVP 不做；断线后拉历史对齐 |
| 多 Skill 编排、跨域工作流 | FEATURE-PLAN 非 MVP |
| 导出 Cursor `SKILL.md` | 非产品 |
| `minAgent` 演示工具迁入生产 catalog | 不纳入 |
| Skill 执行全链路审计表 | Phase 4 |
| ChatPDF 专用 tools | F-05 |
| 无 KB 的纯人设 Skill（无 citation） | 可选 Skill 类型，MVP 以 **有 KB + 引用** 为主 |
| **上传时可选「仅存储不索引」** UI + `indexing_status` 字段 | **F-12**（见 §文档索引策略）；F-00 不阻断现网 ingest |

### 非目标（架构原则）

- **不要求**所有平台功能都走 RAG；Skill 通过 **allowedTools** 决定是否检索
- **不要求**每个 Skill 重新切片/向量化；检索复用 **已有 embeddings**
- **不要求**每次上传都向量化；Skill 工坊材料提炼可读 `documents.content`，无需为建 Skill 再 ingest
- **不把前端 hooks 注册为 LLM tools**；tools 仅后端

## 文档索引策略（与 F-00 边界）

### 现状（代码）

`documentService.processAndSaveDocument` 在写入 `documents` 后 **总是** 调用 `ragService.ingestDocument`（分块 + 嵌入）。  
即：当前 **进知识库 ≈ 必做向量索引**，尚无「只存不检」开关。

### 目标（产品）

| 文档用途 | 是否需要 ingest |
|----------|-----------------|
| `kb-rag` / `kb_search` 语义检索 | ✅ 需要（检索前已索引） |
| 按 `documentId` 读全文做摘要/清单（tool 直读 `content`） | ⚠️ 可选，不强制 embed |
| 归档、下载、列表、原文阅读 | ❌ 不需要 |
| 极短文本、解析失败/扫描版 PDF | ❌ 或仅元数据 |

```text
上传 → 解析 → documents 落库（必有）
              ↓
        indexingPolicy（后续 F-12）
          none        → 不写入 embeddings；kb_search 不可搜到该 doc
          vector      → ingestDocument（与现网一致，可作默认）
          on_demand   → 首次检索前异步 ingest（后续）
```

### F-00 MVP 约定

| 项 | 约定 |
|----|------|
| 上传管线 | **保持现网**：进 KB 仍同步 `ingestDocument`（不拖 F-00 工期） |
| Skill / tool | `kb_search` **只查** `embeddings`；不假设「上传即索引」为永远成立，代码留扩展点（如过滤 `indexing_status`） |
| 无索引文档 | `kb_search` 结果为空时，executor 发 `status`/`error` 友好提示（如「暂无检索索引」），**不**编造引用 |
| 其他 tool | 若未来 `doc_read_full`，可读 `documents.content`，与向量无关 |

### 后续 backlog（F-12）

- 完整需求见 **[feat-f-12-doc-index-summary](../feat-f-12-doc-index-summary/01-requirements.md)**（索引 + 预摘要 + `kb-catalog`）
- `documents.indexing_status`、`summary` / `summary_status`
- 上传默认仅入库；Finder「生成摘要」「建立检索索引」
- 异步 Job + 列表状态展示

方案细节见 [02-solution-design.md §文档索引策略](./02-solution-design.md#文档索引策略)。

## 用户场景与主路径

### 场景 A：显式选择 Skill（如 `bullet-extract`）+ 会话有 KB

1. 请求体带 `skillId`，会话 `knowledge_base_id` 有效
2. SSE：`meta` → `skill` → `status`… → `sources` → `token`… → `done`；`skill_id` 落库
3. 前端展示 Skill 名与阶段状态（短文案）

### 场景 B：未选 Skill、未绑 KB — **普通对话**

1. 无 `skillId`，且会话无 KB → `streamPlainReply`（唯一非执行器路径）
2. 无 `status` / `skill` 事件（或仅 `status: plain` 一条，实现可选）
3. `skill_id` 为 null

### 场景 C：未选 Skill、会话已绑 KB — **隐式 `kb-rag`**

1. 前端仍传 `skillId: null`（UI 无默认选中）
2. 后端 **`resolveEffectiveSkillId` → `kb-rag`**，走 `domainSkillExecutor`
3. 落库 `skill_id = kb-rag`（memory 可回放「本轮实际为 RAG Skill」）
4. 与 RAG 查询页使用 **同一 Skill 定义**

### 场景 G：RAG 查询页

1. `POST /api/rag/query` 带 `knowledgeBaseId`、`query`；`skillId` 默认 `kb-rag`
2. 同一套 SSE（`status`、`sources`、`token`、`done`）；无 `meta`（无会话消息）
3. 前端 `useRagQuery` 展示阶段状态

### 场景 D：选了 Skill 但无 KB scope

1. 请求带 `skillId`，会话无 KB（且 Skill 要求 KB）
2. 明确错误（SSE `error` 或 HTTP 400）：需绑定知识库或选择 KB
3. 不执行 Agent tools，不编造引用

### 场景 E：要点清单提取 Skill

1. 同场景 A，Skill 为「要点清单提取」
2. Agent 多步 tool 后输出结构化清单（仍可有 sources）

### 场景 F：生成中断

- 行为与现网一致：客户端断开 → 后端 `[已中断]` 落库；不引入新语义

## 功能需求（FR）

| ID | 需求 | 优先级 |
|----|------|--------|
| FR-1 | 系统提供 **Skill 注册表**（id、name、description、systemPolicy、allowedTools、defaultScope、enabled） | P0 |
| FR-2 | 提供 **GET /api/skills**（或等价）列出当前用户可用的内置 Skill | P0 |
| FR-3 | **Platform Tool Catalog** 在代码中注册；每个 tool 有 Zod schema、描述、实现委托现有 Service | P0 |
| FR-4 | **scopeEnforcer**：执行前校验 KB 归属 userId；tool 入参不得越 scope | P0 |
| FR-5 | **domainSkillExecutor** 流式执行，支持 `AbortSignal` | P0 |
| FR-6 | 聊天 `appendMessage`：`skillId` **每请求必传字段**；有值走执行器，无值走 §场景 B/C | P0 |
| FR-6b | `chat_messages.skill_id` 落库；`listMessages` 返回；历史供 executor 多轮上下文 | P0 |
| FR-7 | SSE 推送当前 Skill 信息；sources 结构兼容现有 `ChatSource` | P0 |
| FR-8 | 内置 Skill：`kb-rag`（RAG 能力）、`bullet-extract` | P0 |
| FR-9 | 前端：Skill 选择 + **阶段 status** 展示（短文案、可折叠，默认单行） | P0 |
| FR-10 | 越权 KB、非法 skillId、禁用 Skill → 明确错误 | P0 |
| FR-11 | UI **无默认选中**；后端对「有 KB 无 skillId」解析为 `kb-rag`（非 UI 默认） | P0 |
| FR-12 | `ragQueryHandler` 改调 `domainSkillExecutor` | P0 |
| FR-13 | SSE **`status`** 事件；executor/tools 在阶段切换时推送 | P0 |
| FR-14 | `sseClient` 空闲超时 + 错误分类；聊天断线 `loadMessages` | P0 |
| FR-15 | 长连接期间可选 SSE **心跳** | P1 |
| FR-16 | `kb_search` 无索引命中时明确提示（不伪造 sources） | P0 |
| FR-17 | 文档索引策略字段/UI | **F-12**，F-00 不实现 |

## 非功能需求（NFR）

| ID | 需求 |
|----|------|
| NFR-1 | 后端遵守 AI guardrails（函数 ≤50 行、Service 薄编排） |
| NFR-2 | 禁止 `ts-ignore`、tool 参数 Zod 校验 |
| NFR-3 | 单次对话延迟不比现网 RAG 路径显著变差（不增加无效 LLM 轮次，MVP 可限制 max tool steps，如 ≤6） |
| NFR-4 | Tool 执行失败可映射为 SSE `error` + 助手消息落库策略与现网一致 |
| NFR-5 | API 变更需满足 `api-contract` gate（文档、错误码） |
| NFR-6 | `status.label` 服务端限制长度（如 ≤32 字），禁止把 tool 原始 JSON 推给前端 |

## 成功标准（阶段 1 — 业务结果）

1. 登录用户可在 **智能对话** 中选择内置 Skill 并完成一问一答，**有 KB 时** 回答带 **sources**。
2. 后端代码中可 **用新增一个 Skill 定义 + 勾选 tools** 的方式扩展（无需改 `chatStreamHelpers` 分支硬编码）。
3. 非法 scope / skillId 被拦截，不出现跨用户 KB 检索。
4. `pnpm lint` + `pnpm build` 通过；关键路径可手工或 smoke 验证（E2E 扩展放实现计划）。

细粒度可测试 AC 在 **`02-solution-design.md` 验收表** 中展开。

## 影响的包

- [x] `apps/backend` — 主战场：catalog、executor、表、路由、chat 接入
- [x] `apps/web` — Skill 选择、SSE 事件处理、展示
- [ ] `packages/components` — MVP 若无共享组件可不改
- [x] `packages/utils` — 可选：SSE 错误类型常量（或放 `apps/web` 专用模块）

## 依赖与顺序

```text
F-00 MVP（本需求）
  → F-00a 域路由
  → F-00b 更多示例 Skill
  → F-01 chatService 重构收尾
  → F-02 对话 UI 深化
  → F-11 Skill 工坊
```

## 约束与假设

| 类型 | 内容 |
|------|------|
| 技术 | MVP 采用 **LangChain `createAgent` 多步 tool**（参考 `minAgent.ts`），`recursionLimit` 有上限 |
| 安全 | 所有 tool 在服务端执行；LLM 不可直接指定任意 documentId 绕过 scope |
| 假设 | MVP 仅 **系统内置 Skill**，DB seed；用户自定义推迟 F-11 |

## 已决策（2026-06-03）

| # | 问题 | 决策 |
|---|------|------|
| 1 | 执行模型 | **Agent 多步 tool** |
| 2 | skillId | **每请求必带**（无 Skill 传 null）；**每轮 user 消息落库 `skill_id`**，历史/memory 可回放 |
| 3 | 默认 Skill | **不做**；仅当 **无 skillId 且无 KB** → 普通对话；无 skillId 有 KB → 现网 RAG |
| 4 | 要点清单提取 | **纳入 F-00 MVP** |
| 5 | RAG 查询页 | **纳入 F-00**：与聊天 **共用 `domainSkillExecutor`**，RAG 即内置 Skill **`kb-rag`** |
| 6 | 思考过程展示 | SSE **`status`**，短标签；**不**推送长 CoT |
| 7 | SSE 断线/超时 | 前端分类处理 + 聊天 `loadMessages`；空闲超时 + 可选心跳 |
| 8 | 文档索引 | **并非所有上传都要向量化**；F-00 复用现网 ingest；可选索引归 **F-12** |

## 需求补充（2026-06-03，方案修订）

见 [02-solution-design.md](./02-solution-design.md) §RAG 统一、§status 事件、§SSE 韧性。

## 与 FEATURE-PLAN 对齐

- 注册表、Tool Call、执行器；**RAG 页与聊天统一**；`kb-rag` 为 RAG 能力 Skill；含 status 与 SSE 韧性。
- **不**在本迭代交付 F-11 工坊、F-00a 智能路由。

## 确认记录

| 项 | 值 |
|----|-----|
| 状态 | **已确认** |
| 确认人 | 用户 |
| 确认时间 | 2026-06-03 |
| 备注 | 2026-06-03 补充：RAG 进执行器、status SSE、断线/超时、§文档索引策略 |
