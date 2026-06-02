# UI 质量门禁

前端页面/布局变更时通过。

## 布局

- [ ] 固定壳内滚动正常（未破坏 body 滚动逻辑）
- [ ] 每个滚动轴只有一个 `overflow-y: auto` 负责元素
- [ ] 不用 `<Spin>` 包裹滚动内容（改用 overlay loader）
- [ ] Flex 子项在需要处使用 `min-height: 0` / grid `minmax(0, 1fr)`

## 状态

- [ ] 用户可见 loading
- [ ] 错误信息可操作、可理解
- [ ] 列表/数据为空时有 empty 状态

## 一致性

- [ ] 适用处使用 shell/desktop 模式
- [ ] 使用 theme tokens / antd theme — 非刻意不要随手写一次性颜色

## 人工检查

浏览器打开页面；调整视口大小；如有聊天/列表区域则测试滚动。

**自动化 smoke（UI 主路径变更时推荐）：**

```bash
pnpm test:e2e:smoke
```

参考：[`e2e/README.md`](../../e2e/README.md)、`.cursor/rules/scrollable-layout.mdc`

代码结构（函数长度、hook 拆分）：[frontend-quality.md](./frontend-quality.md)
