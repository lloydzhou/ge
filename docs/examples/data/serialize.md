# 序列化 Serialize

`toJSON()` 将整图序列化为 `GraphJSON`，`fromJSON()` 从 JSON 恢复。可用于持久化存储、跨画布迁移、协同同步。

<ExamplePreview src="data/serialize" :height="460" />

## 流程

1. **导出 JSON** — `graph.toJSON()`（结果打印到控制台）
2. **清空** — 移除所有节点
3. **从 JSON 恢复** — `graph.fromJSON(json)`，图形恢复原样

## 用法

```ts
const json = graph.toJSON();
// ... 存储 / 传输 ...
otherGraph.fromJSON(json);
```

## 源码

<<< ../../../examples/data/serialize.ts
