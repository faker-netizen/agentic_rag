# F-12 文档索引与预摘要 — 需求分析

> **适用：T3 阶段 1**  
> **落盘路径**：`.ai/planning/feat-f-12-doc-index-summary/01-requirements.md`  
> **前置**：`00-change-meta.md` 定级已确认  
> **下一步**：用户确认本文 → `02-solution-design.md`

## Feature slug

`feat-f-12-doc-index-summary`（Backlog **F-12**）

## 问题

1. **上传即向量化**：现网 `processAndSaveDocument` 在落库后 **总是** `ingestDocument`，无法「只归档、暂不检索」。
2. **全库总结类问题**（如「总结一下知识库里的文件」）：F-00 的 `kb_search` 只做 **语义 top-K 片段检索**，不能 **枚举当前 KB 下全部文档** 并 **逐份给出可核对摘要**。
3. **摘要未持久化**：全文在 `documents.content`，但无 **预生成、可复用** 的文档级摘要；每次问答重复调用 LLM 成本高、结果不稳定。

用户期望：**能查当前知识库里的所有文档 → 逐个总结 → 汇总给用户**；文档管理 Finder 中提供 **显式按钮** 决定是否对某文档 **提前生成摘要**；**入库不必自动切片向量化**。

## 背景（现状）

| 能力 | 路径 | 说明 |
|------|------|------|
| 上传/合并入库 | `documentService.processAndSaveDocument`、`chunkUploadMerge` | 解析 → `documents` + **同步** `ragService.ingestDocument` |
| 向量检索 | `ragService.retrieveRelevantChunks` / `kb_search` | 仅 `embeddings` |
| 文档列表 | `documentService.listDocumentsInKnowledgeBase` | Finder 已用；**无**摘要/索引状态 |
| Skill 执行 | `domainSkillExecutor`、`kb-rag` | 无 `list_kb_documents` / `get_document_summary` |
| F-00 规划 | `feat-f-00-domain-skill` §文档索引策略 | 原则已写，**实现落在 F-12** |

## 已决策（定级确认时默认）

| # | 问题 | 决策 |
|---|------|------|
| 1 | 新上传默认行为 | **仅存储全文**（`documents.content`），**不**自动 `ingestDocument`，**不**自动生成摘要 |
| 2 | 摘要触发方式 | **Finder 每文档「生成摘要」按钮**（用户显式）；异步 Job |
| 3 | 检索索引触发方式 | **Finder「建立检索索引」按钮**（与摘要解耦）；异步或同步 ingest（方案阶段定） |
| 4 | 聊天里「总结全库」且部分文档无摘要 | **不**在聊天内自动跑摘要 Job（MVP）；回答中 **列出未摘要文档** 并提示去 Finder 生成；已摘要的逐条纳入汇总 |
| 5 | 旧数据兼容 | 迁移前已存在且已有 `embeddings` 的文档：`indexing_status` **NULL 视为 `indexed`**；`summary_status` **NULL 视为 `none`** |

## 用户与角色

| 角色 | 说明 |
|------|------|
| **终端用户**（已登录） | 在知识库 Finder 管理文档索引/摘要状态；在绑定 KB 的聊天中发起全库总结类问题 |
| **系统** | 执行摘要 Job、索引 Job；向 Skill 暴露 list/summary tools |
| **开发者** | 扩展 indexing/summary 策略、后续 F-11 材料 Job 复用摘要字段 |

## 核心概念

| 术语 | 定义 |
|------|------|
| **文档入库** | 解析文件 → 写入 `documents`（含 `content`），**不**隐含向量或摘要 |
| **检索索引（vector）** | `ingestDocument` → `embeddings`；供 `kb_search` |
| **文档摘要（summary）** | LLM 对单篇 `content` 的压缩总结，**持久化**在 `documents.summary` |
| **摘要状态** | `summary_status`：`none` / `pending` / `ready` / `failed` |
| **索引状态** | `indexing_status`：`none` / `pending` / `indexed` / `skipped` / `failed`（与 F-00 02 预留对齐） |
| **全库.catalog Skill** | 新业务域 Skill（建议 id：`kb-catalog`），工具集含列举文档 + 读摘要 + 可选 `kb_search` |

与 **分片上传（chunk upload）** 无关；仅影响 **入库后的处理策略**。

## 范围

### 纳入（F-12 MVP）

1. **数据模型**
   - `documents` 扩展：`indexing_status`、`indexed_at`、`summary`（TEXT）、`summary_status`、`summary_at`
   - 迁移：旧数据兼容规则（见 §已决策）

2. **上传管线**
   - `processAndSaveDocument` / 分片 merge 路径：**默认不再**调用 `ingestDocument`
   - 新文档初始：`indexing_status = none`（或 `skipped`）、`summary_status = none`

3. **文档处理 API**（均需 scope：用户拥有该 KB）
   - `POST /api/knowledge-bases/:kbId/documents/:docId/summarize` — 触发摘要 Job（幂等：进行中不重复排队）
   - `POST /api/knowledge-bases/:kbId/documents/:docId/index` — 触发向量 ingest Job
   - `GET .../documents` 列表响应增加：`indexing_status`、`summary_status`（及可选 `summary_preview` 前 N 字）

4. **异步 Job（MVP 可进程内队列，单 worker）**
   - **SummarizeJob**：读 `content` → LLM 摘要 → 写 `summary` + `summary_status=ready`
   - **IndexJob**：`ingestDocument` → `indexing_status=indexed`；失败置 `failed`
   - 列表/Finder 可轮询或 SSE 推送状态（MVP **轮询列表刷新** 即可）

5. **Finder UI**（`KnowledgeBaseDocumentList`）
   - 每行：**生成摘要**、**建立检索索引**（或等价文案）；展示状态标签（未摘要 / 生成中 / 已摘要；未索引 / 索引中 / 可检索）
   - 进行中 disabled + loading；失败可重试（再次 POST）

6. **Platform Tools + Skill（F-00 增量）**
   - `list_kb_documents` — 返回当前 KB 下 **全部** 文档 id、title、`summary_status`、`indexing_status`
   - `get_document_summary` — 返回已存 `summary`；`none`/`pending` 返回明确状态，**不编造**
   - 注册 Skill **`kb-catalog`**（名称如「知识库概览」）：`allowedTools`: `list_kb_documents`, `get_document_summary`（MVP **不含** `kb_search`，避免与 `kb-rag` 混淆）
   - **域路由（轻量 MVP）**：用户消息匹配「总结/概览/有哪些文件/全库」等模式 **或** 前端显式选 Skill → `kb-catalog`；细则在 02 中写（可先 **仅显式选择**，智能路由为 P1）

7. **聊天 / 执行器**
   - `kb-catalog` 执行路径：Agent 列举文档 → 逐份 `get_document_summary` → 流式生成 **汇总回答**（附文档标题列表为 sources 或结构化附录）
   - `kb_search` / `kb-rag`：检索 SQL **过滤** 仅 `indexing_status = indexed`（**NULL 视为 indexed** 兼容旧数据）
   - 无索引文档：**不可**被 `kb_search` 命中

8. **验证**
   - `pnpm lint`、`pnpm build`；关键路径手测（见 02 AC）

### 不纳入（MVP）

| 项 | 归处 |
|----|------|
| 上传对话框内勾选「同时索引/摘要」 | 可 P1；MVP 仅 Finder 按钮 |
| 聊天内一键为全库批量触发摘要 Job | P1；MVP 提示去 Finder |
| `on_demand`（首次 `kb_search` 自动 ingest） | P2 |
| 摘要版本历史、多语言摘要 | 后续 |
| OSS 存储改造 | `oss-storage-design.md` 独立 |
| F-11 Skill 工坊 UI | 仅 **可读** `summary` 字段，不做工坊 |
| 新 E2E 套件 | 用户确认后再加 |

## 用户场景与主路径

### 场景 A：上传文档（仅入库）

1. 用户在 Finder 上传 PDF/Word/…
2. 后端解析 → `documents` 有 `content`；**无** `embeddings`、**无** `summary`
3. 列表显示：检索「未建立」、摘要「未生成」

### 场景 B：用户点击「生成摘要」

1. `POST .../summarize` → `summary_status=pending`
2. Job 完成后 `summary` 有内容，`summary_status=ready`
3. 失败 → `failed`，Finder 可重试

### 场景 C：用户点击「建立检索索引」

1. `POST .../index` → `indexing_status=pending`
2. `ingestDocument` 成功 → `indexed`；`kb_search` 可命中该 doc 的 chunks
3. 内容与场景 B **独立**：可只摘要不索引，或只索引不摘要

### 场景 D：聊天 —「总结一下知识库里的文件」（会话绑 KB）

1. 用户选择 Skill **「知识库概览」**（`kb-catalog`），或后续智能路由
2. SSE：`skill` → `status`（列举文档 / 读取摘要 / 生成汇总）→ `token` → `done`
3. Agent：`list_kb_documents` → 对每个 `ready` 摘要调用 `get_document_summary` → 汇总
4. 对 `summary_status != ready` 的文档：在回答中 **点名** 并提示去 Finder 生成摘要；**不**后台自动 summarize

### 场景 E：聊天 — 语义问答（仍用 kb-rag）

1. 未选 Skill + 有 KB → 隐式 `kb-rag`（F-00 不变）
2. 仅 **已 indexed** 文档参与 `kb_search`
3. 若 KB 内 **无任何 indexed 文档**：沿用 F-00「未找到可用的检索索引」提示

### 场景 F：删除文档

1. 删除 `documents` 行 → CASCADE `embeddings`（现网已有）
2. 摘要随文档行删除，无孤儿数据

## 功能需求（FR）

| ID | 描述 | 优先级 |
|----|------|--------|
| FR-01 | 上传/合并默认 **不** 自动 ingest | P0 |
| FR-02 | `documents` 增加 indexing + summary 字段与迁移 | P0 |
| FR-03 | 摘要 Job API + 状态机 `summary_status` | P0 |
| FR-04 | 索引 Job API + 状态机 `indexing_status` | P0 |
| FR-05 | Finder 行内操作按钮 + 状态展示 | P0 |
| FR-06 | `list_kb_documents`、`get_document_summary` tools + scope | P0 |
| FR-07 | Skill `kb-catalog` 注册并在聊天可选 | P0 |
| FR-08 | `kb-catalog` 全库汇总主路径（有摘要则用，无则提示） | P0 |
| FR-09 | `kb_search` 仅查询 `indexed`（含 NULL 兼容） | P0 |
| FR-10 | 列表 API 返回索引/摘要状态 | P0 |
| FR-11 | Job 失败可重试；进行中防重复提交 | P1 |
| FR-12 | 智能路由到 `kb-catalog` | P1 |
| FR-13 | 上传时可选「同时建立索引」 | P2 |

## 非功能需求

| ID | 描述 |
|----|------|
| NFR-01 | 摘要/索引 Job 须校验 `userId` + `knowledgeBaseId` 归属 |
| NFR-02 | 单文档摘要输入超长时截断策略在 02 定义（复用 `RAG_CONTEXT_MAX_CHARS` 或独立常量） |
| NFR-03 | 不编造未生成的摘要或检索结果 |
| NFR-04 | 符合 ESLint guardrails；业务逻辑不进 JSX 堆叠 |

## 与 F-00 的接口

| F-00 已有 | F-12 变更 |
|-----------|-----------|
| `kb_search` | 检索 SQL 增加 `indexing_status` 过滤 |
| `skillRegistry` | 新增 `kb-catalog` |
| `resolveEffectiveSkillId` | 不变；`kb-catalog` 须 **显式** `skillId`（MVP） |
| Finder | 本变更主 UI 入口 |

**不修改** F-00 已确认的 `kb-rag` / `bullet-extract` 核心行为，仅收紧「谁可被搜到」。

## 成功标准（阶段 1 — 粗粒度）

1. 用户上传后文档出现在 Finder，**默认未索引、未摘要**。
2. 用户可对单篇点击生成摘要，刷新后看到摘要状态为「已生成」。
3. 用户可对单篇点击建立检索，之后 `kb-rag` 问答可命中该文档片段。
4. 用户在聊天选择「知识库概览」并问全库总结时，得到 **按文档分条的汇总**；未摘要的文档有 **明确提示**，而非幻觉全文。

## 待澄清问题（可选，不阻塞 01 确认）

- 摘要最大长度、是否结构化（ bullet / 段落）— 02 给默认 prompt 模板
- `kb-catalog` 是否在 UI 上与 `kb-rag` 同列下拉 — 02 默认 **是**

## 确认记录

| 项 | 值 |
|----|-----|
| 状态 | **已确认** |
| 确认人 | 用户 |
| 确认时间 | 2026-06-03 |
| 备注 | 用户「好的,给方案」进入阶段 2 |
