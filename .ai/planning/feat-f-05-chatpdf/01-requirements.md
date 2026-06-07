# F-05 ChatPDF — 需求分析

> **适用：T3 阶段 1**  
> **落盘路径**：`.ai/planning/feat-f-05-chatpdf/01-requirements.md`  
> **前置**：`00-change-meta.md` 定级已确认  
> **下一步**：确认 [02-solution-design.md](./02-solution-design.md)

## Feature slug

`feat-f-05-chatpdf`（Backlog **F-05**）

## 问题

用户需要在平台内 **阅读 PDF**，并对 **当前这一份文档** 获得 **分点、可溯源** 的全文总结：每个要点后带 **递增数字引用** `[1]` `[2]`…，点击后 **阅读器跳转到对应页码**，并在页内对引用片段做 **搜索高亮**（MVP 不要求精确 char offset/bbox）。

现状：Dock 有 `chatpdf` 占位但 **不可用**；PDF 入库仅 **扁平文本**（`pdf-parse`），无页级结构；无 PDF 渲染与引用跳转能力。

## 背景（现状）

| 能力 | 路径 | 与 F-05 关系 |
|------|------|----------------|
| 桌面壳 / Dock | `appRegistry.tsx` | `chatpdf`：`available: false`，无页面组件 |
| PDF 解析 | `documentContentParser.parsePdfFile` | 仅全文 string + 隐式 `numpages` 未落库 |
| 文档存储 | `documents` + `file_path` | 可复用；需 `document_pages` |
| 知识库上传 | `knowledgeBases` upload | PDF 已可入库（F-12 默认不自动索引） |
| 域 Skill / SSE | F-00 `domainSkillExecutor` | 可复用流式与 `status`；F-05 新增 **PDF 域** 总结能力 |
| 全库摘要 | F-12 `kb-catalog` | **不替代** 单 PDF 分点引用总结 |

## 已决策（用户确认）

| # | 问题 | 决策 |
|---|------|------|
| 1 | 档位 | **T3** |
| 2 | 打开方式 | **仅 ChatPDF 窗口内上传**；**不与知识库关联**（修订，见下） |
| 2b | 与知识库关系 | **ChatPDF 文档独立落库**：`knowledge_base_id = NULL`，不出现在 KB/Finder 列表；**不提供**「从知识库打开」 |
| 3 | 引用跳转粒度 | MVP：**页码跳转** + 页内 **excerpt 文本搜索高亮**；不做精确全局 char offset / 矩形 bbox |
| 4 | 总结形态 | **分点列表**；每点可挂 **一个或多个** 数字引用 |
| 5 | 业务域 Skill | F-00 暂缓扩展；F-05 **可先独立 API**，结构兼容日后 `pdf-summarize` Skill |

## 用户与角色

| 角色 | 说明 |
|------|------|
| **终端用户**（已登录） | 在 ChatPDF 窗口阅读 PDF、生成分点总结、点击引用跳转 |
| **系统** | 按页解析 PDF、生成总结与 citation 表、提供 PDF 文件流 |

## 核心概念

| 术语 | 定义 |
|------|------|
| **ChatPDF 会话** | 绑定 **单个** `documentId` 的工作区（阅读器 + 总结面板） |
| **document_pages** | 按页存储的文本（页码从 1 起） |
| **Citation** | `{ id, page, excerpt }` — `id` 为展示用递增编号；`excerpt` 用于页内 search |
| **Bullet** | 总结中的一条要点，关联 `citeIds: number[]` |
| **跳转** | `page` → 阅读器翻页；`excerpt` → 该页 text layer 搜索并高亮 |

## 范围

### 纳入（MVP）

1. **Dock 启用 ChatPDF**（`available: true`，注册懒加载页面）
2. **打开文档（仅 ChatPDF 域）**
   - 窗口内上传 PDF（解析 + 落库 + 按页写入）
   - 桌面窗 `meta`：`documentId`（**无** `knowledgeBaseId`）
   - **不**从知识库 Finder 打开、不写入任何 `knowledge_base_id`
3. **PDF 阅读器（左栏）**
   - 基于 **pdf.js**（`react-pdf` 或 `pdfjs-dist`）渲染
   - 翻页、缩放、滚动；**认证后拉取 PDF 二进制**（新 API）
4. **按页解析（后端）**
   - 上传或首次打开时：若尚无 `document_pages` → 解析并写入
   - 保留 `documents.content` 为全文拼接（供 LLM）
5. **分点总结（右栏）**
   - 按钮「生成分点总结」；SSE 或 JSON+流式（与现网风格对齐，02 定）
   - 输出：bullets + citations；UI 渲染 `[n]` 可点击
6. **引用跳转**
   - 点击 `[n]` → 左栏 `goToPage(page)` → 页内对 `excerpt` 执行 search/highlight（找不到则 toast 提示，仅保留页跳转）
7. **鉴权**
   - 文档归属 `userId`；PDF 流与总结 API 校验同一 `documentId`
8. **非扫描版 PDF**
   - 与现网一致：无文本则明确错误（OCR 不纳入 MVP）

### 不纳入（MVP）

| 项 | 归处 |
|----|------|
| 扫描版 OCR | 后续 |
| 多 PDF 同屏、对比 | 后续 |
| 总结后继续多轮 PDF 问答（RAG） | 二期，可接 F-00 `kb_search` 单 doc scope |
| 矩形 bbox 高亮、批注层 | 后续 |
| 导出带脚注 PDF | 后续 |
| 与 F-12 摘要字段合并 | 独立产品能力；KB 摘要仍走 Finder |
| ChatPDF 内向量检索 | 二期 |

## 用户场景与主路径

### 场景 A：Dock 打开 → 上传 PDF

1. 用户点 Dock「ChatPDF」→ 空态提示上传
2. 选择 PDF → 上传 → 后端按页解析 → 左栏显示 PDF，右栏空
3. 用户点「生成分点总结」→ 右侧出现分点 + `[1][2]…`

### 场景 B：点击引用

1. 用户点击要点后的 `[3]`
2. 阅读器跳到 citation 3 的 `page`
3. 在该页文本层搜索 `excerpt`（归一化空白）并高亮；失败则仅跳转并提示

### 场景 C：加密/扫描 PDF

1. 上传或打开失败 / 无文本
2. 明确错误文案，不生成假引用

## 功能需求（FR）

| ID | 描述 | 优先级 |
|----|------|--------|
| FR-01 | Dock 启用 ChatPDF 页面 | P0 |
| FR-02 | 窗口内上传 PDF，落库为 `origin=chatpdf`、无 KB | P0 |
| FR-03 | ChatPDF 文档 `knowledge_base_id` 为空且不在 KB API 列表出现 | P0 |
| FR-04 | `document_pages` 表与按页解析 Job/同步 | P0 |
| FR-05 | `GET` PDF 文件流（鉴权） | P0 |
| FR-06 | 分点总结 API（bullets + citations） | P0 |
| FR-07 | 右栏渲染分点 + 可点击 `[n]` | P0 |
| FR-08 | 左栏 pdf.js 阅读器 + `goToCitation` | P0 |
| FR-09 | 引用跳转：页码 + excerpt 搜索高亮 | P0 |
| FR-10 | 总结/引用不编造（校验 cite 合法页码） | P0 |
| FR-11 | 同文档重复总结可覆盖或版本化（MVP 覆盖最后一次） | P1 |
| FR-12 | 注册 `pdf-summarize` 进 domainSkill（与独立 API 二选一或并存） | P2 |

## 非功能需求

| ID | 描述 |
|----|------|
| NFR-01 | 单文档页数 MVP 建议上限 **200 页**（超出提示或截断，02 定常量） |
| NFR-02 | 总结输入截断策略与 F-12 类似（全文过长则按页摘要再汇总，02 定） |
| NFR-03 | PDF 流不走公网直链；带 JWT / cookie 鉴权 |
| NFR-04 | 符合 ESLint guardrails；阅读器与总结面板组件拆分 |

## 与 F-00 / F-12 的边界

| 模块 | F-05 用法 |
|------|-----------|
| F-00 SSE | 可选复用 `status` / `token` 事件形状 |
| F-00 Skill | MVP **独立路由** `POST /api/chatpdf/...`；数据结构预留 Skill |
| F-12 | **无交叉**；KB 摘要仍在 Finder，与 ChatPDF 文档隔离 |
| `kb-rag` / `kb-catalog` | 不在 ChatPDF MVP 内 |

## 成功标准（阶段 1）

1. 用户能从 Dock 打开 ChatPDF、上传 PDF 并阅读。
2. 用户能生成 **分点总结**，每点带可点的 `[n]`。
3. 点击 `[n]` 能跳到 **正确页码**，并在页内 **高亮接近 excerpt 的文本**（或仅页跳转 + 提示）。
4. 引用编号与 citations 列表一致，不编造无页码来源。

## 确认记录

| 项 | 值 |
|----|-----|
| 状态 | **已确认** |
| 确认人 | 用户 |
| 确认时间 | 2026-06-04 |
| 备注 | T3；MVP 页码+搜索高亮；**2026-06-04 修订：与知识库解耦** |
