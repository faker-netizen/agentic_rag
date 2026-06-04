# F-11 Skill 工坊（女娲式蒸馏 · 方案草案）

> **状态**：规划草案，待定级（建议 **T3**）与用户确认后写 `01-requirements.md` / `02-solution-design.md`  
> **依赖**：**F-00** 业务域 Skill 运行时（注册表 + Tool Call + scope + 执行器）  
> **参考**：[nuwa-skill](https://github.com/alchaincyf/nuwa-skill) — 开发者侧 Skill 工厂，非本产品运行时

## 1. 开源「女娲」在做什么

- **输入**：人名 / 主题 / 模糊需求（如「想提升决策质量」）。
- **流程**：澄清 → 多 Agent 并行调研（著作、对话、表达、外部观点等）→ 提炼心智模型/启发式/表达 DNA/诚实边界 → 组装 `SKILL.md` → 子 Agent 做已知题/边缘题/风格题验证。
- **产出**：自包含目录（`SKILL.md` + `references/research/*` + `sources/*`），供 Cursor 等 **Agent Skills 协议** 加载。
- **本质**：**元 Skill** — 造「思维视角」类 Skill，不是业务系统里的 RAG 域。

## 2. 与本项目的关系（必须先分清）

| | 开源女娲 | 本项目 Cursor Skill | 本产品 **业务域 Skill (F-00)** | **F-11 工坊** |
|---|----------|---------------------|-------------------------------|---------------|
| 用户 | 开发者 | 开发者 Agent | 终端用户 | 终端用户 |
| 数据 | 公网 + 本地文件 | 仓库规则/流程 | **平台内文档** | **平台内文档 + 用户描述** |
| 产物 | 磁盘 SKILL.md | 磁盘 SKILL.md | DB 定义 + 运行时执行 | **生成/迭代 DB 定义** |

**结论**：自研方向是 **「平台内的 Skill 工厂」**，借鉴女娲的 **阶段划分与结构化产物**，而不是在仓库里再实现一份 `huashu-nuwa` 或默认爬公众人物语料。

## 3. 产品目标

让用户在 **不手写 prompt/工具配置** 的前提下：

1. 用自然语言描述业务场景（或选择模板）；
2. （可选）绑定知识库，从 **已有文档** 提炼规则与示例；
3. 经 **确认停点** 后发布为「我的 Skill」；
4. 用固定测例 + 试跑验证；
5. 在 **聊天 / RAG** 入口选用，走 F-00 执行（检索、引用、流式）。

**成功标准（业务）**

- 非技术用户能在 10 分钟内完成一个可试跑的草稿 Skill；
- 试跑回答限定在选定 KB，且带 citation（与 F-00 一致）；
- 发布后的 Skill 可被域路由或用户手动选中。

## 4. 方案架构

```text
┌─────────────────────────────────────────────────────────┐
│  Web：Skill 工坊（向导 / 编辑器 / 试跑 / 版本）            │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  skillStudioService（编排，函数 ≤50 行）                 │
│   Phase0  clarify / diagnose                            │
│   Phase1  ingestJob ──► 文档摘要、术语、样例问题           │
│   Phase2  distillJob ──► 结构化 SkillSpec（用户确认）      │
│   Phase3  publish ──► skill_registry 表                  │
│   Phase4  validateJob ──► 测例 + 试跑 SSE                │
└───────────────────────────┬─────────────────────────────┘
                            │ 发布定义
┌───────────────────────────▼─────────────────────────────┐
│  F-00：domainSkillExecutor + toolCatalog + scopeEnforcer   │
│  （现有 ragService / chatService 演进）                    │
└─────────────────────────────────────────────────────────┘
```

### 4.1 Skill 定义（`SkillSpec` 建议字段）

| 字段 | 说明 |
|------|------|
| `id`, `version`, `status` | `draft` / `published` / `archived` |
| `name`, `description`, `triggerHints` | 路由与 UI 展示 |
| `systemPolicy` | 角色、边界、输出格式（对应女娲 SKILL 正文策略段） |
| `heuristics[]` | 决策规则（场景 → 动作），可映射到 tool 选择提示 |
| `allowedTools[]` | F-00 工具白名单子集 |
| `defaultScope` | `kbIds` / `docIds` |
| `testCases[]` | `{ input, expectContains?, expectCitations? }` |
| `provenance` | 材料 Job id、模型、时间（审计） |

存储：MySQL 新表 + JSON 列；大段 research 放对象存储或 `skill_research_artifacts` 表（可选）。

### 4.2 与女娲阶段的映射

| 女娲阶段 | F-11 实现要点 |
|----------|----------------|
| 0 分流/诊断 | `POST /api/skills/wizard/diagnose` — LLM 返回 2～3 个模板/已有 Skill 推荐 |
| 0.5 建目录 | 创建 `draft` 记录 + 空 `SkillSpec` |
| 1 采集 | **异步 Job**：对 scope 内文档做分块摘要、高频实体、示例用户问题（不调公网爬虫） |
| 2 提炼 | LLM 输出 `heuristics`、`honestLimits`、`outputSchema`；**SSE 或轮询进度**；**用户确认停点** |
| 3 构建 | 写入 `SkillSpec` + 绑定 tools |
| 4 验证 | 跑 `testCases` + 一次真实 KB 试跑；失败回到 Phase 2 |
| 5 双 Agent 精炼 | **P2+** 可选；MVP 用单轮 LLM + 规则校验即可 |

### 4.3 工具与白名单

F-00 先定义 **平台级 tool catalog**（如 `kb_search`, `doc_summarize`, `cited_answer`, `extract_bullets`）。  
工坊 **只允许勾选 catalog 子集**，避免用户自定义任意 HTTP tool（安全）。

### 4.4 复用现有代码

| 能力 | 路径 | 用法 |
|------|------|------|
| 流式对话 | `chatService` / `sseClient` | 试跑、验证 |
| RAG | `ragService`, `ragAgent` | 材料摘要、试跑检索 |
| Agent 编排 | `minAgent.ts`, LangChain `createAgent` | **P2** 多步提炼；MVP 可用单 LLM 链 |
| 文档 | `documentService`, KB | Phase 1 输入 |
| 鉴权 | JWT | Skill 租户隔离 |

## 5. 分期与档位建议

| 子项 | 内容 | 建议档位 | 优先级 |
|------|------|----------|--------|
| **F-11a** | 向导 + 草稿编辑 + 发布 + 手动测例 | **T3**（新表、新 API、新 UI） | P1 |
| **F-11b** | KB 材料 Job + 提炼确认 UI | T3 | P2 |
| **F-11c** | 视角类 Skill + 强制 citation 协议 | T2/T3 | P2 |
| 开发自用女娲 | `npx skills add alchaincyf/nuwa-skill` | 非产品 | — |

**F-11a MVP 验收（草案）**

1. 登录用户可创建草稿 Skill 并编辑 `name` / `systemPolicy` / `allowedTools` / `defaultScope`。
2. 发布后在聊天可选择该 Skill（或设为会话默认）。
3. 试跑一次：流式返回且 sources 非空（当 scope 有文档时）。
4. 至少 1 条测例可在发布前执行并展示通过/失败。

**F-11a 明确不做**

- 公网人物全自动调研 pipeline；
- 导出为 Cursor `SKILL.md`（可作为后续 **chore** 导出格式）。

## 6. API 草案（实现前需过 api-contract gate）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/skills/wizard/diagnose` | 模糊需求 → 推荐 |
| POST | `/api/skills` | 创建 draft |
| PATCH | `/api/skills/:id` | 更新 Spec |
| POST | `/api/skills/:id/ingest` | 触发 Phase 1 Job |
| POST | `/api/skills/:id/distill` | 触发 Phase 2 |
| POST | `/api/skills/:id/publish` | Phase 3 |
| POST | `/api/skills/:id/validate` | Phase 4 |
| POST | `/api/skills/:id/trial-run` | SSE 试跑 |
| GET | `/api/skills` | 列表（我的 + 系统模板） |

## 7. 风险与决策

| 风险 | 缓解 |
|------|------|
| 与 F-00 耦合过紧 | F-11 只写注册表；执行器接口先行定义 |
| 长 Job 超时 | 异步 Job + 进度查询；复用现有 SSE 仅用于试跑 |
| 用户误以为能「蒸馏真人」 | 文案强调 **领域 Skill**，公网人物为 P2+ 且需合规评审 |
| 成本（多 Agent） | MVP 单 LLM；F-11b 再引入并行摘要 |

## 8. 建议实施顺序

```text
F-00 注册表 + 最小执行器 + 1 个系统 Skill
  → F-11a 工坊 MVP（手写/向导 Spec，能发布能试跑）
  → F-00a 路由 + F-02 对话展示 Skill
  → F-11b 材料驱动提炼
  → F-11c 视角类（可选）
```

## 9. 下一步（需你确认）

1. **定级**：整体 F-11 是否按 **T3** 走完整 `01` + `02`？F-11a 是否先拆 **T2** 仅后端+最小 UI？
2. **范围**：首期是否要「视角/名人」叙事，还是只做 **合规/合同/研报** 等领域模板？
3. **入口**：Skill 工坊放在 Dock 新应用 `skill-studio`，还是知识库详情页 Tab？

确认后更新本目录 `00-change-meta.md` 并展开需求/方案正文。
