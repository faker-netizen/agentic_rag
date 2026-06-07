# 功能规划（文档 AI 工作平台）

> 最后更新：2026-06-03  
> **用途**：描述产品目标、模块边界与功能 backlog；新功能开发前先对齐本文。  
> **与 progress 分工**：本文写「要做什么」；`progress/CURRENT.md` 写「做到哪了」。  
> **方向说明**：由早期「Design to Code」转为以 **文档 AI 工作平台** 为主（仓库名 `design_to_code` 暂保留，产品定位以本文为准）。

---

## 产品愿景

**文档 AI 工作平台**：用户将文档沉淀在平台内，通过 RAG、ChatPDF、对话与 Agent 能力进行阅读、问答与整理；系统根据用户输入，调用按 **业务域封装** 的 Skill（Tool Call 实现），在 **用户已有文档范围** 内给出可溯源的业务反馈。

远期扩展：**外链内容采集**（公众号文章、其他平台 URL）→ 清洗入库 → 纳入同一套文档与 Skill 体系。

---

## 核心能力（当前最高优先级）

### 业务域 Skill + Tool Call

针对 **已存放在平台的文档**，用户用自然语言提出需求；平台：

1. **理解意图** — 识别业务域（如：合规审查、合同要点、研报摘要、客服话术库等，可配置扩展）
2. **路由到业务域 Skill** — 每个 Skill 是一组 **Tool Call 能力** 的封装（检索、摘要、对比、结构化抽取、引用溯源等）
3. **限定文档范围** — 仅在用户授权的知识库 / 文档集合内执行（租户隔离、KB 级 scope）
4. **执行并反馈** — 返回结构化结果：正文回答、引用片段、可选中间步骤；支持流式

```
用户输入
    ↓
意图 / 业务域路由
    ↓
业务域 Skill（Tool Call 封装）
    ├── 工具：检索、摘要、对比、抽取、统计…
    ├── 数据范围：用户平台内文档（向量库 + 元数据）
    └── 策略：该域 prompt、输出 schema、门禁
    ↓
反馈给用户（可溯源、可审计）
```

**与开发侧 Harness 的区分**

| 概念 | 含义 |
|------|------|
| **业务域 Skill**（产品） | 面向终端用户，运行在平台后端，Tool Call 驱动，操作用户文档 |
| **Cursor Skill**（`.cursor/skills/`） | 面向开发者 / Agent 续作，指导写代码与流程 |

**MVP 范围（核心功能第一期）**

- [ ] 业务域 Skill 注册表（名称、描述、可用 tools、适用文档类型）
- [ ] 统一 Tool Call 层（至少：按 KB 检索、单/多 doc 摘要、带 citation 的问答）
- [ ] 用户输入 → 域路由（先规则 + 可选 LLM 分类，不追求一次做全所有域）
- [ ] 1～2 个 **示例业务域 Skill** 端到端跑通（如「通用文档问答」「要点清单提取」）
- [ ] 与现有 `chatService` / `ragService` 整合或演进为「域 Skill 执行器」
- [ ] 前端：在 RAG 对话或独立入口展示 **当前使用的业务域 Skill** 与引用来源

**非 MVP（后续）**

- 用户自定义业务域 Skill（低代码配置 tools + prompt）
- Skill  marketplace / 模板库
- 跨域编排（一个请求触发多个域 Skill）

### Skill 工坊（女娲式蒸馏 · F-11）

> **参考**：[alchaincyf/nuwa-skill](https://github.com/alchaincyf/nuwa-skill)（开源「女娲」）— 面向 **Cursor/Agent Skills 协议**，输入人名/模糊需求 → 多阶段调研 → 产出可运行的 `SKILL.md`（心智模型、决策启发式、表达 DNA、验证清单）。  
> **本产品不做同款文件落盘**；借鉴其 **流程与产物结构**，在 **F-00 运行时 Skill** 之上增加 **用户可创建/迭代业务域 Skill** 的工坊能力。

| 维度 | 开源女娲 | 本平台 Skill 工坊（规划） |
|------|----------|---------------------------|
| 运行环境 | 开发者 Agent（Cursor 等） | 平台后端 + Web UI |
| 产出物 | 磁盘 `*-perspective/SKILL.md` | DB **Skill 定义**（prompt、tools、scope、元数据） |
| 信息源 | 公网调研 + 用户本地 PDF/字幕 | **优先用户知识库/上传文档**；公网人物调研 **非 MVP**（合规另议） |
| 执行时 | 粘贴/加载 Skill 对话 | F-00 **Tool Call + RAG scope** + 流式 SSE |
| 与 F-00 | 无关 | **强依赖** F-00 注册表与执行器 |

**借鉴的流程映射（产品化）**

```text
Phase 0  入口：明确领域 / 模糊需求诊断 → 推荐模板或已有 Skill
Phase 1  采集：选定 KB/文档 → 分块摘要、样例 Q&A、术语表（异步 Job）
Phase 2  提炼：领域心智模型、决策规则、输出 schema、诚实边界（用户确认停点）
Phase 3  构建：写入 Skill 注册表（版本号、可用 tools、默认 scope）
Phase 4  验证：固定测例 + 对用户文档试跑 → 通过才「发布」
```

**分期（Backlog 见 F-11x）**

- **MVP（F-11a）**：向导式创建 — 用户描述场景 → LLM 生成草稿定义 → 表单编辑 → 注册为「我的 Skill」（仅平台 tools 白名单）
- **增强（F-11b）**：绑定知识库自动提炼规则与示例问题（材料驱动，类女娲 Phase 1–2）
- **可选（F-11c）**：「视角/顾问」类 Skill（人设 + 回答协议），回答 **必须带 citation**，禁止无依据公网编造

**明确不纳入（首期）**

- 一键蒸馏公众人物并爬取全网语料（版权/合规/运维成本高）
- 生成 Cursor `.cursor/skills/` 文件（属开发 harness，见 F-03；需要时可 `npx skills add alchaincyf/nuwa-skill` 自用，与产品无关）

详细方案草案：`.ai/planning/feat-f-11-skill-studio/README.md`（待 T3 需求确认后展开 01/02）。

---

## 模块地图

| 模块 | 说明 | 前端 | 后端 | 状态 |
|------|------|------|------|------|
| **鉴权** | JWT 双 token | `pages/login` | auth | ✅ 已有 |
| **桌面壳** | Dock、多窗口 | `desktop/`、`shell/` | — | ✅ 已有 |
| **知识库 / 文档** | 上传、解析、分块、存储 | `knowledge-bases` | `knowledgeBaseService`、`documentService` | ✅ 已有 |
| **RAG 基础** | 向量检索、增强生成 | `pages/rag` | `ragService` | ✅ 已有，将纳入域 Skill |
| **RAG 对话** | 会话、流式、引用 | `pages/chat`（Dock） | `chatService` | ✅ 已有，将演进为域 Skill 入口 |
| **业务域 Skill** | 域路由 + Tool Call + 文档 scope | 待设计 | **核心建设** | 📋 **P0** |
| **Skill 工坊** | 女娲式创建/提炼/验证 → 注册表 | 待设计（Dock 或 KB 内） | `skillStudioService` 等 | 📋 **P1**（依赖 F-00） |
| **ChatPDF** | PDF 阅读器 + 分点引用总结 | `pages/chatpdf` | `chatpdf` API、`document_pages` | 📋 **进行中** → `feat-f-05-chatpdf` |
| **Agent** | 多步工具调用 | `pages/agent` | agent 相关 | 🟡 部分，可复用于 Tool 层 |
| **内容采集** | 公众号 / URL 抓取、清洗入库 | 未建 | 未建 | 📋 Phase 3 |
| **Markdown 编辑** | 本地笔记 / 整理 | `pages/typora` | — | 🟡 可选 |
| **工程化** | Harness、CI | `.cursor/`、`.ai/` | lint/tsc | 🟡 进行中 |
| **Android 客户端** | 薄 WebView 壳 → 后期 Capacitor 内嵌 H5 | `android-shell`（规划） | 复用现有 API | 📋 **搁置** → `feat-f-13-android-webview-shell` |
| ~~Design → Code~~ | 原仓库名方向 | — | — | ⬜ 已搁置 |

图例：**✅ 已有** · **🟡 部分** · **📋 已规划** · **⬜ 搁置/未开始**

---

## 阶段规划

### Phase 1 — 核心：业务域 Skill（当前方向）

目标：用户 **平台内已有文档** + **自然语言输入** → **业务域 Skill（Tool Call）** → **可溯源反馈**。

- [x] 文档入库与 RAG 基础（继承现有能力）
- [x] 聊天会话与流式（继承，作为交互壳）
- [ ] 业务域 Skill 模型与注册表设计
- [ ] Tool Call 层与文档 scope 约束
- [ ] 域路由 + 至少 1 个示例域 Skill 端到端
- [ ] 对话 UI 展示「当前 Skill / 引用」
- [ ] `chatService` / Agent 层 refactor（为 Skill 执行器让路）

### Phase 1.5 — Skill 工坊（F-11，依赖 F-00 MVP）

目标：用户 **描述场景 +（可选）绑定知识库** → **生成/迭代业务域 Skill 定义** → **试跑验证** → **在对话中选用**。

- [ ] Skill 定义数据模型与版本（租户隔离）
- [ ] F-11a 向导创建 + 草稿/发布状态
- [ ] F-11b KB 材料驱动提炼（异步 Job + 用户确认停点）
- [ ] 试跑 API（复用 F-00 执行器 + 固定测例）
- [ ] 对话入口展示「当前 Skill」并支持切换「我的 Skill」

### Phase 2 — 文档应用矩阵

目标：典型文档场景独立应用，均接入同一 Skill / 文档底座。

- [ ] **ChatPDF**（`appRegistry.chatpdf`）
- [ ] 知识库管理迁入 Dock
- [ ] 业务域 Skill 扩展到 PDF / 长文场景
- [ ] 设置：默认 KB、模型、可用 Skill 列表

### Phase 3 — 内容采集与整理

目标：外部内容进入平台，与自有文档统一治理。

- [ ] 公众号文章链接解析与下载
- [ ] 其他平台 URL / 剪藏（待细化来源清单）
- [ ] 去噪、结构化、自动 tagging、入库 workflow
- [ ] 采集内容纳入业务域 Skill 检索范围

### Phase 4 — 生产就绪

- [ ] CI、backend lint、E2E
- [ ] Skill 执行审计日志（谁、何域、何文档范围）
- [ ] 部署与环境文档

---

## Backlog

| ID | 功能 | 优先级 | 依赖 | 备注 |
|----|------|--------|------|------|
| **F-00** | **业务域 Skill 框架（注册 + Tool Call + scope）** | **P0** | RAG 已有 | **核心功能** |
| F-00a | 域路由（用户输入 → Skill） | P0 | F-00 | 可先 1 个默认域 |
| F-00b | 示例域 Skill ×1～2 | P0 | F-00 | 如通用问答、要点提取 |
| F-01 | 重构 `chatService` | P0 | — | 为 Skill 执行器铺路 |
| F-02 | 拆分 `pages/chat` | P1 | F-00b | 展示 Skill 名与引用 |
| F-03 | Harness 文档 commit | P1 | — | |
| **F-05** | **ChatPDF**（独立 PDF 域，不绑 KB） | **P1** | F-00 SSE | `feat-f-05-chatpdf`；阅读器+分点引用总结 |
| F-04 | 知识库 Dock 应用 | P1 | 桌面壳 | |
| F-10 | 公众号 / URL 采集 MVP | P2 | 文档管线 | Phase 3 |
| **F-11** | **Skill 工坊（女娲式蒸馏，产品化）** | **P1** | **F-00** | 见上文 §Skill 工坊 |
| F-11a | 向导创建 Skill 草稿 → 发布 | P1 | F-00 注册表 | MVP，无 KB 自动提炼 |
| F-11b | KB 材料驱动提炼 + 确认停点 | P2 | F-11a、文档管线 | 类女娲 Phase 1–2 |
| F-11c | 视角/顾问类 Skill + 强制 citation | P2 | F-11a、F-00b | 可选；公网调研非 MVP |
| **F-12** | **文档索引 + 预摘要 + 全库概览 Skill**（上传默认仅入库、Finder 按钮、 `kb-catalog`） | **P1** | F-00、文档管线 | 规划：`feat-f-12-doc-index-summary`；取代原「仅 indexing_status」窄范围 |
| F-07 | CI workflow | P2 | — | |
| **F-13** | **Android 客户端（远程 WebView 壳 → 后期 Hybrid）** | **P2** | Web 可部署、mobile 布局 | **搁置**；仅 Android；`feat-f-13-android-webview-shell` |
| F-13a | 远程 WebView 薄壳 + 加载线上 Web | P2 | F-13 | MVP |
| F-13b | `apps/web` mobile 布局（Tab，无桌面壳） | P2 | — | 远程壳验收依赖 |
| F-13c | Capacitor 内嵌 dist + 按需 Bridge | P3 | F-13a/b | 后期 |
| ~~F-09~~ | ~~Design → Code~~ | — | — | 已搁置 |

开工前：**Agent 提议档位 → 用户确认** → 按 [planning/README.md](./README.md) 落盘（T0→`fixes/`；T1 lite；T2/T3 完整 01+02）；完成后 `progress/log/`。

---

## 桌面应用（目标态）

| AppId | 标签 | 与核心能力关系 | 状态 |
|-------|------|----------------|------|
| `chat` | 智能对话 | **业务域 Skill 主入口** | ✅ |
| `chatpdf` | ChatPDF | PDF 域 Skill / 工具 | 📋 |
| `knowledge-bases` | 知识库 | 文档与 scope 管理 | 📋 |
| `agent` | Agent | 多步 Tool，可与域 Skill 互补 | 📋 |
| `import` | 内容采集 | Phase 3，外链入库 | ⬜ 未注册 |

---

## 术语

| 术语 | 定义 |
|------|------|
| **平台文档** | 用户上传或采集后入库的文件与分块 |
| **业务域 Skill** | 面向特定业务场景的 Tool Call 能力包 + 策略 |
| **Tool Call** | 对检索、摘要、抽取等原子能力的可调用接口 |
| **文档 scope** | 单次 Skill 执行允许访问的 KB / 文档 ID 集合 |
| **域路由** | 将用户输入映射到某一业务域 Skill 的过程 |
| **文档索引** | 文本分块 + 向量写入 `embeddings`；与「分片上传」无关；非所有入库文档都必须索引 |
| **Skill 工坊** | 创建/迭代/验证业务域 Skill 定义的产品模块（流程借鉴开源女娲） |
| **Skill 定义** | 可版本化的配置：名称、描述、system 策略、可用 tools、默认 scope、测例 |

---

## 维护约定

1. 产品方向变更 → 更新本文 + `memory/project-decisions.md`  
2. 新增业务域 Skill → 更新注册表章节（实现阶段）与 Backlog  
3. 功能完成 → `progress/log/` + 更新模块地图状态  

## 相关文档

- [项目现状 / 续作](../progress/CURRENT.md)
- [功能开发工作流](../workflows/feature-development.md)
- [项目决策](../memory/project-decisions.md)
