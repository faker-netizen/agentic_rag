# 变更元数据（定级记录）

> **落盘路径**：`.ai/planning/feat-f-13-android-webview-shell/00-change-meta.md`

## 定级（Agent 提议 → 用户确认）

| 项 | 值 |
|----|-----|
| change-tier | **T3** |
| change-type | feature |
| slug | `feat-f-13-android-webview-shell` |
| backlog | **F-13**（Android 客户端） |
| workflow | requirements-design-full（**搁置**，未写 01/02） |
| 定级理由 | 新客户端形态（Android）；薄原生壳 + WebView；后期可能迁 Capacitor 内嵌 H5；涉及 `apps/web` 移动端布局与构建链；跨 web + 新 `apps/` 包。 |

## 定级确认记录

| 项 | 值 |
|----|-----|
| 状态 | **已确认（实施搁置）** |
| 确认人 | 用户 |
| 确认时间 | 2026-06-03 |
| 备注 | 先做 **远程 WebView 壳**（加载线上已部署 Web）；React Native / 内嵌 Hybrid 不作为首期；**本迭代不编码**，仅方案落盘。 |

## 实施状态

| 项 | 值 |
|----|-----|
| 状态 | **搁置** |
| 搁置原因 | 优先 F-05 / F-00 等 Web 主线；移动端待 Web 响应式与部署稳定后再开 |
| 恢复条件 | Web 具备 mobile 布局；生产 URL 可访问；用户确认重启 F-13 |

## 本档位落盘清单

- [x] 方案草案：`README.md`（讨论结论 + 分期 + 迁移说明）
- [ ] `01-requirements.md`（恢复实施时再写）
- [ ] `02-solution-design.md`（恢复实施时再写）
- [ ] `03-implementation-plan.md`（T3 推荐）

## 链接

- FEATURE-PLAN：[F-13 Android 客户端](../FEATURE-PLAN.md)
- 方案草案：[README.md](./README.md)
- 决策记录：[project-decisions.md](../../memory/project-decisions.md#2026-06--f-13-android-客户端搁置与路线)
