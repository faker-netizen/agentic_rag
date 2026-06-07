# F-13 Android 客户端（WebView 壳 · 方案草案）

> **状态**：**搁置** — 方案已落盘，**未开工**  
> **档位**：T3（`00-change-meta.md`）  
> **平台**：仅 **Android**（不做 iOS）

## 1. 背景与目标

将现有 **文档 AI 工作平台**（`apps/web` + `apps/backend`）延伸到 Android。用户通过 App 图标进入，核心业务能力仍由 Web 前端 + 同一套 API 提供。

**首期路线（已选）**：**薄 Android 壳 + WebView 加载线上已部署的 Web URL**（实现最快，适合内测）。

**后期可选**：**Capacitor Hybrid** — 将 `apps/web` 构建产物内嵌进 APK；按需增加 JS Bridge / 原生插件。

**未选路线**：React Native 独立客户端（复用率低、工期长；讨论后不作为首期）。

---

## 2. 两阶段架构

### 阶段 A — 远程 WebView 壳（MVP，已选）

```text
[Android 薄壳：Kotlin Activity + System WebView]
        │
        │  loadUrl("https://<生产 Web 域名>/")
        ▼
[线上 apps/web 部署] ──HTTPS──► [apps/backend /api/*]
```

**壳职责（原生代码，量小）**

- 全屏 WebView、加载进度、错误页 / 重试
- 系统返回键（WebView 历史后退，否则退出）
- 可选：外链用系统浏览器打开
- 可配置生产 URL（`BuildConfig` / `res/values`）

**不要求**：内嵌 `dist`、Capacitor、JS Bridge（除非返回键等极简桥接）。

### 阶段 B — 内嵌 Hybrid（后期）

```text
[Android + Capacitor]
        │
        │  本地 assets：apps/web dist
        ▼
[同一份 React 业务] ──► [apps/backend /api/*]
        │
        └── JS Bridge / Plugins（按需：文件选择、推送、状态栏…）
```

---

## 3. 阶段 A → B 迁移：不只是 JSBridge

| 迁移项 | 说明 | 与 Bridge 关系 |
|--------|------|----------------|
| **打包与加载** | `loadUrl(远程)` → `cap sync` 内嵌 `dist` | 无关，**主工作量** |
| **构建 / CI** | `web build` → `cap sync android` → `assembleRelease` | 无关 |
| **API 基址** | 统一 `VITE_API_BASE` 环境变量，避免写死域名 | 无关 |
| **鉴权** | 继续 JWT + token 存储；少依赖 WebView Cookie 域 | 无关 |
| **移动端 UI** | 桌面 Dock/多窗口 → Tab + 路由栈（**两阶段共用**） | 无关 |
| **JS Bridge** | 文件上传、推送、深度链接等 **需要原生时** 再补 | **增量能力** |

**结论**：后期迁 Hybrid，**主线是内嵌构建 + 发布流程 + WebView 下路由/API 验通**；JS Bridge 是「要原生能力时」的增量，不是迁移前置条件。

---

## 4. Web 侧前置（恢复 F-13 前建议完成）

| 项 | 说明 |
|----|------|
| Mobile 布局 | 隐藏 / 绕过 `DesktopShell`、Dock、多窗口；底部 Tab 或抽屉导航 |
| 响应式 | 知识库列表、聊天、登录在窄屏可用 |
| API 配置 | `VITE_API_BASE` 指向可公网访问的后端 |
| 部署 | Web + API HTTPS 就绪（远程壳依赖） |

**可复用模块（逻辑层）**：鉴权、`chatApi`、SSE、`knowledgeBaseApi`、Skill 相关 service — 无需为壳重写。

**不宜原样移植**：`desktop/` 多窗口、`macbook-ui` 宽屏假设、ChatPDF 左右分栏（改为上下或分步页）。

---

## 5. 功能分期（恢复实施时）

### F-13a — 远程 WebView 壳（MVP）

- [ ] `apps/android-shell/`（或 `apps/mobile-android/`）最小 Gradle 工程
- [ ] WebView 加载可配置生产 URL
- [ ] 加载态、错误页、返回键
- [ ] 真机 / 模拟器调试说明
- [ ] **不纳入**：Play 商店发布、内嵌 H5、文件 Bridge

### F-13b — Web mobile 布局

- [ ] `apps/web` 检测 mobile / 独立 mobile 路由分支
- [ ] Tab：对话 / 知识库（MVP 范围待 `01-requirements` 细化）
- [ ] 与远程壳联调

### F-13c — 内嵌 Hybrid（后期）

- [ ] Capacitor 接入 monorepo
- [ ] `pnpm build:android` 流水线
- [ ] 按需插件：文件选择、分块上传体验优化
- [ ] ChatPDF 在 WebView 内性能评估

---

## 6. Monorepo 目标结构（实施时）

```text
apps/
  web/                 # 现有；加 mobile 布局
  backend/             # 不变；确保 CORS / HTTPS
  android-shell/       # 新建；阶段 A 远程 WebView
  mobile/              # 可选；阶段 B Capacitor 配置 + android/

packages/
  utils/               # 已有，可继续复用
```

根脚本（规划）：

```bash
pnpm dev:android-shell   # 打开 Android Studio / 跑模拟器
# 阶段 B 后：
pnpm build:web && pnpm -C apps/mobile cap sync android
```

---

## 7. 风险与验证点

| 风险 | 缓解 |
|------|------|
| 桌面 UI 在手机上不可用 | 先做 F-13b mobile 布局再发壳 |
| SSE 长连接在 WebView 被掐 | 真机测聊天流式；必要时调 keep-alive / 代理超时 |
| 分块上传 / 文件选择 | 阶段 A 用 Web `<input>`；体验差再 Bridge |
| ChatPDF + pdf.js 性能 | 放 F-13c，实测后再定原生 PDF 与否 |
| 远程壳依赖网络 | 错误页 + 离线提示；内嵌 Hybrid 解决「首屏离线」 |

---

## 8. 与 FEATURE-PLAN 关系

- Backlog ID：**F-13**
- 优先级：**P2**（Web 主线 F-00 / F-05 / F-12 优先）
- 依赖：Web 可部署 URL、mobile 布局（F-13b 可与 F-13a 并行，但远程壳验收依赖布局）

---

## 9. 讨论记录摘要

| 日期 | 结论 |
|------|------|
| 2026-06-03 | 初议 React Native 全量客户端 → 改为评估 Hybrid |
| 2026-06-03 | 仅 Android；Hybrid 可用 Capacitor |
| 2026-06-03 | **首期选远程 WebView 壳**（后者），内嵌 Hybrid 后期 |
| 2026-06-03 | 迁 Hybrid 不只需 JSBridge；内嵌构建与发布流程为主 |
| 2026-06-03 | **计划搁置**，本 README + `00-change-meta.md` 落盘 |

---

## 10. 恢复实施 checklist

1. 读本文 + `00-change-meta.md`，用户确认重启 F-13
2. 写 `01-requirements.md`（AC：壳 + mobile 布局最小集）
3. 写 `02-solution-design.md`（目录、URL 配置、返回键、CORS）
4. `feature-development` → 实现 F-13a / F-13b

## 确认记录

| 项 | 值 |
|----|-----|
| 状态 | **已确认（搁置，不实施）** |
| 确认人 | 用户 |
| 确认时间 | 2026-06-03 |
| 备注 | 方案落盘即可；编码待后续迭代 |
