# Edge API

`Edge` 是图边，连接两个端点。

## 创建

```ts
graph.addEdge({
  source: 'n1',       // 节点 id
  target: 'n2',       // 节点 id
  label: '连接',
});
```

## 端点

| 属性 | 说明 |
|------|------|
| `source` / `target` | 端点（node id / `{ cell, port }` / `'node:port'`） |

```ts
graph.addEdge({ source: { cell: 'n1', port: 'p1' }, target: 'n2:p2' });
```

## 路由与连接器

| 属性 | 说明 |
|------|------|
| `router` | normal / orthogonal / manhattan / **manhattan-astar**（A* 避障） |
| `connector` | normal / rounded / smooth |
| `vertices` | 路径控制点 `[{ x, y }]` |

```ts
graph.addEdge({ source: 'a', target: 'b', router: 'manhattan-astar' });
// 自动注入其他节点 bbox 作为障碍 → 真实避障
```

## 箭头

| 属性 | 说明 |
|------|------|
| `markerSize` | 箭头大小（默认 10） |
| `startArrow` | 起点箭头（双向） |

## 标签

| 属性 | 说明 |
|------|------|
| `label` | 单标签 |
| `labels` | 多标签 `[{ text, distance, fill, fontSize }]` |
| `labelDistance` | 单标签位置（0-1） |
| `labelFill` / `labelFontSize` | 标签样式 |

```ts
graph.addEdge({
  source: 'a', target: 'b',
  labels: [
    { text: '是', distance: 0.3, fill: '#52c41a' },
    { text: '否', distance: 0.7, fill: '#f5222d' },
  ],
});
```

## 样式

| 属性 | 说明 |
|------|------|
| `stroke` | 颜色 |
| `strokeWidth` | 粗细 |
| `lineDash` | 虚线 `[6, 4]` |
| `lineDashFlow` | 流动动画 |
| `opacity` | 透明度 |
| `visible` | 可见性 |
| `stateStyles` | 状态样式（hover/selected） |

```ts
graph.addEdge({ source: 'a', target: 'b', lineDash: [6, 4], lineDashFlow: true });
// 数据流效果
```

## 自环

```ts
graph.addEdge({ source: 'n1', target: 'n1' });  // 自动 U 形路径
```
