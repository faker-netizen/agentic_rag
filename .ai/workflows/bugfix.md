# Bug 修复工作流（T0）

**档位 T0**：期望行为已定义，修复实现偏差。  
**落盘**：[fixes/README.md](../fixes/README.md)

---

## 0. 定级 ⏸

- Agent 提议 **T0** + slug + 理由 → 用户确认（[tier-classification](../gates/tier-classification.md)）
- 若实为 T1+（要改行为契约）→ 改档位，转 [requirements-design](./requirements-design.md)

---

## 1. 落盘 + 复现

1. 创建 `.ai/fixes/<slug>/`
2. 按 `.ai/templates/bugfix-record.md` **写入** `00-bugfix.md`（期望/实际/复现步骤）
3. 定位文件及层级（web / backend / 共享包）

---

## 2. 最小修复

- 用最小改动修复根因；更新 `00-bugfix.md` 的「根因」「修复范围」
- 不做顺手重构、不扩大 scope

---

## 3. 验证

- [post-implementation](../gates/post-implementation.md) 中硬门禁（触及则跑 lint/build）
- 按复现步骤再测；**不默认跑 E2E**（用户要求时）
- 更新 `00-bugfix.md` 确认记录：修复验证 → 已验证

---

## 4. 记录

Harness 漏洞 → `.ai/memory/common-failures.md`

---

## 5. 提交

`commit-workflow` skill；message 说明修复内容。progress log 链接 `fixes/<slug>/`。
