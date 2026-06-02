# 文件对象存储方案 — 阿里云 OSS

> 状态：设计稿（待确认后实现）  
> 日期：2026-05-31  
> 背景：本地 `apps/backend/uploads/` 已清空；当前直传与分片合并均写磁盘，不适合多实例部署与生产运维。

---

## 背景与目标

### 现状

| 环节 | 实现 | 路径 / 说明 |
|------|------|-------------|
| 小文件直传 | `multer.diskStorage` | `uploads/{timestamp}-{random}.ext` |
| 分片临时 | `chunkUploadService` | `uploads/chunks/{fileId}/{index}.part` |
| 分片合并 | 本地 `appendFile` | 合并到 `uploads/` 再解析 |
| DB | `documents.file_path` | **存本地绝对/相对路径** |
| 删除文档 | `deleteDocumentScoped` | **不删磁盘/OSS 文件**（待补） |

### 目标

- 生产环境文件存 **阿里云 OSS**，应用无状态、可水平扩展
- 保留开发环境 **本地存储** 可选（无 OSS 凭证时仍可跑通）
- 小文件、分片上传统一走 **Storage 抽象层**
- `file_path` 改为存 **OSS Object Key**（或统一 URI 格式）
- 密钥仅环境变量，不进 git

### 不纳入本期

- 前端浏览器直传 OSS（STS 临时凭证）— 可作为 Phase 2 优化
- 历史本地路径数据迁移（本地 uploads 已清空，DB 中旧 `file_path` 可置空或标记失效）
- CDN 加速下载

---

## 约束与假设

- 区域：阿里云 OSS（与后端部署同地域，如 `oss-cn-hangzhou`）
- Bucket：**私有读**，通过服务端 SDK 读；不对公网匿名开放
- 文件类型：`.pdf` `.doc` `.docx` `.txt` `.md`（与现有一致）
- 单文件上限：50MB（与 multer `limits` 一致；更大走分片）
- 解析流程不变：上传 → 拉取字节流 → `documentService.processFile` → 入库 + RAG ingest

---

## 方案对比

### 方案 A — 服务端中转上传（推荐 MVP）

客户端仍 POST 到现有 API；后端 `memoryStorage` / 分片 Buffer → `OssStorageProvider.put()`。

| 优点 | 缺点 |
|------|------|
| 前端零改动 | 流量经后端，带宽占用 |
| 鉴权沿用 JWT | 大文件占用 Node 内存（需 stream） |
| 与现有 chunk API 兼容 | |

### 方案 B — 浏览器直传 OSS（STS + PostPolicy）

前端拿临时凭证直传 OSS，后端只收 `objectKey` 回调。

| 优点 | 缺点 |
|------|------|
| 大文件、带宽最优 | 需 STS、回调验签、前端改造 |
| | 分片需对接 OSS Multipart 或仍走后端 |

### 方案 C — 仅合并/成品上 OSS，分片仍本地

| 优点 | 缺点 |
|------|------|
| 改动小 | 多实例分片仍不一致，**不推荐** |

## 推荐方案：**A（MVP）+ 存储抽象，预留 B**

Phase 1 用方案 A 快速落地；接口层抽象好 `StorageProvider`，Phase 2 可加 STS 直传。

---

## 架构

```
                    ┌─────────────────┐
  POST /upload      │  knowledgeBases │
  POST /uploads/*   │  chunkUploads   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ documentService │
                    │ chunkUploadSvc  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────────────────────┐
                    │     storage/index.ts            │
                    │  getStorage(): StorageProvider  │
                    └────────┬────────────────────────┘
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼────┐  ┌──────▼──────┐  (future)
     │ LocalProvider│  │ OssProvider │  StsDirect
     │ (STORAGE=    │  │ ali-oss SDK │
     │  local)      │  │             │
     └──────────────┘  └──────┬──────┘
                              │
                     ┌────────▼────────┐
                     │  Alibaba Cloud  │
                     │      OSS        │
                     └─────────────────┘
```

---

## OSS Bucket 与 Object Key 规范

### Bucket 建议

- 名称：`{product}-docs-{env}`（如 `agentic-rag-docs-dev`）
- ACL：**私有**
- 版本控制：可选开启（防误删）
- 生命周期：可选 `chunks/` 前缀 7 天自动清理（合并完成后本就不应残留）

### Key 命名

统一前缀，便于按用户/KB 隔离与批量清理：

```
{env}/u/{userId}/kb/{kbId}/doc/{documentId}/{safeFilename}

# 分片上传进行中（合并前）
{env}/u/{userId}/kb/{kbId}/tmp/{fileId}/parts/{chunkIndex}

# 合并完成、documentId 生成后，可选 rename/copy 到 doc 路径
```

- `env`：`dev` | `staging` | `prod`，来自 `OSS_KEY_PREFIX` 或 `NODE_ENV`
- `safeFilename`：仅保留安全字符，与现逻辑一致用 uuid + ext

### DB 字段

| 字段 | Phase 1 | 说明 |
|------|---------|------|
| `documents.file_path` | 存 **object key** | 不再存 `D:\...\uploads\...` |
| `documents.storage` | 可选新增 `local` \| `oss` | 便于混合期识别；或 key 前缀隐含 |

---

## StorageProvider 接口（TypeScript）

```typescript
export interface StorageProvider {
  /** 写入对象，返回 object key */
  putObject(key: string, body: Buffer | Readable, opts?: { contentType?: string }): Promise<void>;

  /** 读取为 Buffer（解析 PDF/Word 用；大文件可改为 getStream） */
  getObject(key: string): Promise<Buffer>;

  getStream(key: string): Promise<Readable>;

  deleteObject(key: string): Promise<void>;

  /** 分片：写 part */
  putPart(tmpKey: string, chunkIndex: number, body: Buffer): Promise<void>;

  /** 分片：列出已上传 part 索引 */
  listParts(tmpKey: string): Promise<number[]>;

  /** 分片：合并为最终 key，删除 tmp parts */
  composeParts(tmpKey: string, destKey: string, totalParts: number): Promise<void>;

  deletePrefix(prefix: string): Promise<void>;
}
```

- **LocalProvider**：映射到 `uploads/`（开发默认）
- **OssProvider**：`ali-oss` SDK；分片合并优先用 **OSS Multipart Upload**（`initMultipartUpload` → `uploadPart` → `complete`），与现有 `upload_chunks` 表逻辑对齐

---

## 上传流程改造

### 1. 小文件直传 `POST /:kbId/upload`

1. `multer.memoryStorage()`（或 stream + 直接 pipe 到 OSS）
2. 生成 object key（documentId 尚未知：可先 `tmp/{fileId}`，入库后 copy/rename；或 key 不含 documentId：`.../pending/{uuid}.pdf`）
3. `storage.putObject(key, buffer)`
4. 临时写本地 **可选**：OSS 下载到 `/tmp` 解析；或 **OSS getStream → processFile(stream)**（需扩展 `processFile` 支持 Buffer/stream）
5. `saveDocument({ file_path: key })`
6. 解析完成后可删 tmp（若用了临时 key）

**推荐**：key 使用 `tmp/{fileId}{ext}`，入库后 `documents.file_path = key` 不变（简单）；或入库后 `doc/{id}/...` 做一次 `copyObject`。

### 2. 分片上传（现有 chunk API）

| 步骤 | 现逻辑 | OSS 逻辑 |
|------|--------|----------|
| prepare | DB session + 本地 mkdir | DB session + OSS `initMultipartUpload` 存 `uploadId` 到 session 表（**需加列** `oss_upload_id`） |
| chunk | 写 `{fileId}/{i}.part` | `uploadPart(uploadId, i, buffer)` |
| merge | 本地合并文件 | `completeMultipartUpload` → 得到最终 key |
| cleanup | `fs.rm` chunks 目录 | `abortMultipartUpload` / 删 tmp prefix |

**表变更（建议）**：

```sql
ALTER TABLE upload_sessions
  ADD COLUMN oss_upload_id VARCHAR(128) NULL COMMENT 'OSS multipart uploadId',
  ADD COLUMN object_key VARCHAR(512) NULL COMMENT '目标 object key';
```

本地模式时两列为 NULL。

### 3. 文档删除

`deleteDocumentScoped` 增加：`if (doc.file_path) await storage.deleteObject(doc.file_path)`（忽略 404）。

---

## 环境变量

```bash
# storage driver: local | oss
STORAGE_DRIVER=oss

# 阿里云 OSS（STORAGE_DRIVER=oss 时必填）
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=agentic-rag-docs-dev
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
# 可选：RAM 角色 / STS 时改用 token，Phase 2

# key 前缀，区分环境
OSS_KEY_PREFIX=dev

# 本地模式根目录（STORAGE_DRIVER=local）
LOCAL_STORAGE_ROOT=./uploads
```

写入 `.env.example`（无真实密钥）；`security.mdc` 禁止提交 `.env`。

---

## 依赖

```bash
pnpm add ali-oss --filter backend
pnpm add -D @types/ali-oss --filter backend  # 若有
```

---

## 实现步骤（Phase 1）

| # | 任务 | 涉及 |
|---|------|------|
| 1 | `apps/backend/src/storage/types.ts` + `localProvider.ts` + `ossProvider.ts` + `index.ts` | 新目录 |
| 2 | 扩展 `documentService.processFile` 支持 `Buffer` / stream（避免 OSS 再落盘） | `documentService.ts` |
| 3 | `knowledgeBases.ts` multer → memory + storage.put | 路由 |
| 4 | `chunkUploadService` 分片/合并走 StorageProvider + DB  migration | service + SQL |
| 5 | 删除文档时删 OSS 对象 | `documentService` |
| 6 | `.env.example` + `apps/backend/README.md` | 文档 |
| 7 | 单测 / 手工：小文件、分片、秒传 fingerprint | — |

## Phase 2（可选）

- STS 临时凭证 + 前端直传
- 签名 URL 供 ChatPDF 预览原文件
- 生命周期规则自动清理 `tmp/`

---

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| DB 中旧 `file_path` 指向已删本地文件 | 已清空 uploads；旧记录解析内容仍在 DB，检索不受影响；重新上传即可 |
| OSS 费用 / 误删 | 私有 bucket + 生命周期仅清 tmp；生产开版本控制 |
| 解析大 PDF 内存 | stream 解析或限制大小；超大走异步队列（远期） |
| 多环境共 bucket | **必须**用 `OSS_KEY_PREFIX` 隔离 |

---

## 验证计划

- [ ] Gate：`design-review`（本文确认）
- [ ] `STORAGE_DRIVER=local` 现有用例仍通过
- [ ] `STORAGE_DRIVER=oss` 上传 → 列表 → RAG 检索 → 删除文档后 OSS 无对象
- [ ] lint + build backend
- [ ] 分片断点续传在 OSS 模式下可用

---

## 下一步

- [ ] 你确认本方案（A + 抽象层 + key 规范）
- [ ] 提供 OSS Bucket / RAM 子账号（仅 Put/Get/Delete/List 最小权限）
- [ ] 按 Phase 1 排期实现（可单独开任务）
