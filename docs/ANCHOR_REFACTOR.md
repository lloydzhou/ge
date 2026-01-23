# Anchor 系统重构说明

## 背景

经过对 @antv/x6 的深入研究，发现我们之前对 Anchor 的理解有偏差。Anchor 不应该只是工具函数，而应该是一个**可扩展的原语系统**。

## 问题分析

### 之前的实现

```typescript
// ❌ 只是工具函数
export function computeAnchorForShape(shape, layout) { ... }
export function computeAnchor(points, opts) { ... }
```

**问题：**
1. 没有统一的数据结构
2. 无法扩展自定义锚点
3. Node 和 Edge 使用不一致
4. 不符合 x6 的设计理念

### x6 的 Anchor 设计

```typescript
// ✅ x6: Anchor 是策略函数 + 注册表
type NodeAnchor = string | { name: string; args: any } | Function;

// 12 种预设锚点
'center' | 'top' | 'bottom' | 'left' | 'right' | 'topLeft' | ...

// 可扩展注册
Graph.registerAnchor('custom', (view, magnet, ref, args) => {
  return { x: 100, y: 100 };
});
```

## 新的 Anchor 系统

### 架构设计

```
Layer 2: 图编辑原语 (非可视化对象)
├── Router (路径计算) ✅
├── Connector (图形生成) ✅
└── Anchor (连接点计算) 🆕
    ├── NodeAnchor (节点锚点)
    │   ├── center, top, bottom, left, right (预设)
    │   ├── angle (角度锚点)
    │   └── absolute (绝对位置)
    └── EdgeAnchor (边锚点)
        ├── start, end, middle (预设)
        └── ratio (比例锚点)
```

### 核心组件

#### 1. AnchorPoint 数据结构

```typescript
export interface AnchorPoint {
  x: number;
  y: number;
  tangent: Vec2;   // 切向量
  normal: Vec2;    // 法向量
}
```

#### 2. Anchor 函数类型

```typescript
// NodeAnchor: 计算节点上的连接点
export type NodeAnchorFunction = (
  shape: DisplayObject,
  args?: NodeAnchorArgs
) => AnchorResult;

// EdgeAnchor: 计算边上的连接点
export type EdgeAnchorFunction = (
  points: Vec2[],
  args?: EdgeAnchorArgs
) => AnchorResult;
```

#### 3. Anchor 注册表

```typescript
export class AnchorRegistry {
  // 注册自定义锚点
  registerNodeAnchor(name: string, fn: NodeAnchorFunction): void;
  registerEdgeAnchor(name: string, fn: EdgeAnchorFunction): void;

  // 解析锚点定义
  resolveNodeAnchor(definition: AnchorDefinition): NodeAnchorFunction | undefined;
  resolveEdgeAnchor(definition: AnchorDefinition): EdgeAnchorFunction | undefined;
}
```

### 使用方式

#### 1. 使用预设锚点

```typescript
// 字符串形式
graph.registerNodeAnchor('center', (shape) => [100, 100]);
graph.registerNodeAnchor('top', (shape) => [100, 0]);

// 在 Node 中使用
node.createPort({
  id: 'port1',
  anchor: 'top'  // 使用预设锚点
});
```

#### 2. 使用带参数的锚点

```typescript
// 对象形式
graph.registerNodeAnchor('angle', (shape, args) => {
  const angle = args?.angle || 0;
  return [cx + r * cos(angle), cy + r * sin(angle)];
});

// 使用
node.createPort({
  id: 'port1',
  anchor: { name: 'angle', args: { angle: 45 } }
});
```

#### 3. 注册自定义锚点

```typescript
// 注册自定义锚点
graph.registerNodeAnchor('smart', (shape) => {
  // 自定义计算逻辑
  const bounds = shape.getLocalBounds();
  return [bounds.x + bounds.width / 2, bounds.y];
});

// 使用
node.createPort({
  id: 'port1',
  anchor: 'smart'
});
```

#### 4. 直接使用函数

```typescript
node.createPort({
  id: 'port1',
  anchor: (shape) => {
    // 内联函数
    return [shape.style.x + 50, shape.style.y];
  }
});
```

### 与 x6 的对应关系

| x6 | GE | 说明 |
|-----|-------|------|
| `Registry.NodeAnchor.presets` | `NodeAnchorPresets` | 预设锚点 |
| `Registry.EdgeAnchor.presets` | `EdgeAnchorPresets` | 边锚点预设 |
| `Graph.registerAnchor()` | `graph.registerNodeAnchor()` | 注册接口 |
| `type NodeAnchor` | `type NodeAnchorFunction` | 函数类型 |

### 迁移计划

#### 短期 (本周)
- ✅ 创建新的 Anchor 系统文件
- ✅ 在 Graph 中集成 Anchor 注册表
- [ ] 更新 Node 使用新 Anchor 系统
- [ ] 更新 Edge 使用新 Anchor 系统

#### 中期 (下周)
- [ ] 废弃旧的 `computeAnchorForShape` 和 `computeAnchor`
- [ ] 添加更多预设锚点 (topLeft, bottomRight 等)
- [ ] 编写 Anchor 系统单元测试

#### 长期
- [ ] 支持 Anchor 组合
- [ ] 支持 Anchor 动画
- [ ] 可视化 Anchor 调试工具

## 代码示例

### 在 Node 中使用

```typescript
// 之前
node.computeAnchorForLayout({ name: 'angle', args: { angle: 45 } });

// 之后
const anchorFn = graph.getNodeAnchor('angle');
if (anchorFn) {
  const result = anchorFn(node.getPrimaryShape(), { angle: 45 });
}
```

### 在 Edge 中使用

```typescript
// 之前
computeAnchor(points, { t: 0.5 });

// 之后
const anchorFn = graph.getEdgeAnchor('middle');
if (anchorFn) {
  const result = anchorFn(edge.getPoints());
}
```

### 注册自定义 Anchor

```typescript
// 注册
graph.registerNodeAnchor('myCustom', (shape, args) => {
  const dx = args?.dx || 0;
  const dy = args?.dy || 0;
  const bounds = shape.getLocalBounds();
  return [bounds.x + bounds.width / 2 + dx, bounds.y + bounds.height / 2 + dy];
});

// 使用
node.createPort({
  id: 'port1',
  anchor: { name: 'myCustom', args: { dx: 10, dy: -10 } }
});
```

## 总结

1. **Anchor 是 Layer 2 原语**：非可视化对象，策略函数
2. **统一数据结构**：NodeAnchor 和 EdgeAnchor 都返回 AnchorPoint
3. **可扩展性**：通过注册表支持自定义锚点
4. **与 x6 一致**：遵循相同的设计模式

这个重构将使 GE 的 Anchor 系统更加完善和可扩展。
