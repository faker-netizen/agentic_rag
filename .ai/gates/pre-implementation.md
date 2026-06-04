# 实现前门禁

在写正式业务代码**之前**通过。

## 定级（所有任务）

- [ ] [tier-classification](./tier-classification.md) 档位已获用户确认

## 按档位检查 planning / fixes 文档

| 档位 | 必须已确认 |
|------|------------|
| **T0** | `.ai/fixes/<slug>/00-bugfix.md` 定级记录 |
| **T1** | `00-change-meta.md` + `01-change-lite.md` |
| **T2 / T3** | `00-change-meta.md` + `01-requirements.md` + `02-solution-design.md` |

## 通用

- [ ] 范围清晰；已 grep/读邻近代码，优先复用
- [ ] 实现范围不超过已确认文档中的「变更范围」
- [ ] API 变更 → 将读 `api-contract`
- [ ] UI 变更 → 将读 `ui-quality`
- [ ] 无密钥写入仓库

## 可豁免

仅当用户**明确指定档位**且与上表一致时，可跳过定级提议对话；**仍须落盘**。
