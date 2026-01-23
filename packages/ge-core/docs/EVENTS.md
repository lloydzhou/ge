# GE 事件系统文档

GE (Graph Editor) 的事件系统设计模仿浏览器原生 Drag-and-Drop API，提供灵活、解耦的交互方式。

## 设计理念

1. **事件发射器模式**：Node/Port 只负责派发事件，不修改自身状态
2. **职责分离**：Graph 处理节点移动，ConnectionPlugin 处理连线创建
3. **多级处理**：可在 Graph/Node/Port 级别监听事件
4. **命名空间**：使用 `node:`、`connect:` 前缀避免与 g-lite 事件冲突

## 事件类型概览

| 事件名称 | 派发者 | 典型处理者 | 说明 |
|---------|-------|-----------|------|
| `node:dragstart` | Node | Graph | 开始拖拽节点 |
| `node:drag` | Node | Graph | 节点拖拽中 |
| `node:dragend` | Node | Graph | 节点拖拽结束 |
| `connect:start` | Node/Port | ConnectionPlugin | 开始创建连线 |
| `connect:drag` | Node/Port | ConnectionPlugin | 连线拖拽中 |
| `connect:end` | Node/Port | ConnectionPlugin | 连线操作结束 |

## 节点拖拽事件

### node:dragstart

当用户在可拖拽的节点上按下指针时触发。

```typescript
interface NodeDragStartEventDetail {
  type: GEInteractionType.NODE_DRAG;
  source: Node;
  x: number;  // 画布坐标 X
  y: number;  // 画布坐标 Y
  dataTransfer: GEDataTransfer;
}
```

**使用示例：**

```typescript
graph.addEventListener('node:dragstart', (e) => {
  const { source, x, y } = e.detail;
  console.log(`开始拖拽节点: ${source.getId()}`);
});
```

### node:drag

当用户拖拽节点移动指针时持续触发。

```typescript
interface NodeDragEventDetail {
  type: GEInteractionType.NODE_DRAG;
  source: Node;
  x: number;
  y: number;
  dataTransfer: GEDataTransfer;
  target?: Node | Port;  // 当前悬停的目标（预留）
}
```

**使用示例：**

```typescript
graph.addEventListener('node:drag', (e) => {
  const { source, x, y } = e.detail;
  // Graph 会自动处理节点移动
  // 这里可以添加额外的逻辑，如磁力吸附、边界检测等
});
```

### node:dragend

当用户释放指针结束拖拽时触发。

```typescript
interface NodeDragEndEventDetail {
  type: GEInteractionType.NODE_DRAG;
  source: Node;
  dropped: boolean;  // 是否成功 drop
  target?: Node | Port;  // 最终目标（预留）
}
```

## 连线创建事件

### connect:start

当用户在可连线的元素上按下指针时触发。

```typescript
interface ConnectStartEventDetail {
  source: Node | Port;  // 连线源
  x: number;
  y: number;
  dataTransfer: GEDataTransfer;
  preventDefault(): void;  // 阻止连线
}
```

**使用示例：**

```typescript
graph.addEventListener('connect:start', (e) => {
  const { source, x, y } = e.detail;
  console.log(`开始从 ${source.getId()} 创建连线`);

  // 可以阻止连线
  if (someCondition) {
    e.detail.preventDefault();
  }
});
```

### connect:drag

当用户拖拽连线移动指针时持续触发。

```typescript
interface ConnectDragEventDetail {
  source: Node | Port;
  x: number;
  y: number;
  dataTransfer: GEDataTransfer;
  target?: Node | Port;  // 当前悬停的目标
}
```

**使用示例：**

```typescript
graph.addEventListener('connect:drag', (e) => {
  const { source, x, y, target } = e.detail;

  // ConnectionPlugin 会显示临时连线
  // 这里可以添加磁力吸附、高亮目标等效果
  if (target) {
    target.style.stroke = '#ff0000';
  }
});
```

### connect:end

当用户释放指针结束连线操作时触发。

```typescript
interface ConnectEndEventDetail {
  source: Node | Port;
  connected: boolean;  // 是否成功创建连线
  target?: Node | Port;  // 连接目标
  x?: number;  // 结束位置
  y?: number;
}
```

**使用示例：**

```typescript
graph.addEventListener('connect:end', (e) => {
  const { source, connected, target } = e.detail;

  if (connected && target) {
    console.log(`成功连接: ${source.getId()} -> ${target.getId()}`);
  } else {
    console.log('连线取消');
  }
});
```

## GEDataTransfer

类似浏览器的 `dataTransfer`，用于在拖拽过程中传递数据。

```typescript
interface GEDataTransfer {
  // 设置数据
  setData(type: string, data: unknown): void;

  // 获取数据
  getData(type: string): unknown;

  // 检查数据类型
  hasType(type: string): boolean;

  // 清除所有数据
  clearData(): void;

  // 允许的效果
  effectAllowed: 'move' | 'copy' | 'link' | 'none';

  // 当前效果
  dropEffect: 'move' | 'copy' | 'link' | 'none';
}
```

**使用示例：**

```typescript
graph.addEventListener('connect:start', (e) => {
  const { dataTransfer } = e.detail;

  // 存储自定义数据
  dataTransfer.setData('connectionType', 'data-flow');
  dataTransfer.setData('sourceType', 'output');

  // 在后续事件中获取
  const connectionType = dataTransfer.getData('connectionType');
});
```

## 配置节点交互行为

### 拖拽配置

```typescript
const node = graph.addNode({
  id: 'node1',
  x: 100,
  y: 100,

  // 简单配置
  draggable: true,

  // 或详细配置
  draggable: {
    enabled: true,
    onDragStart: (e) => {
      console.log('开始拖拽');
      return true;  // 返回 false 可阻止拖拽
    },
    onDrag: (e) => {
      console.log('拖拽位置:', e.detail.x, e.detail.y);
    },
    onDrop: (e) => {
      console.log('拖拽完成');
    },
  },
});
```

### 连线配置

```typescript
const node = graph.addNode({
  id: 'node1',

  // 作为连线源
  sourceConnectable: {
    enabled: true,
    onDragStart: (e) => {
      // 可以阻止连线
      if (someCondition) {
        e.detail.preventDefault();
        return false;
      }
      return true;
    },
    onDrag: (e) => {
      // 更新 dataTransfer 数据
      e.detail.dataTransfer.setData('sourceType', 'output');
    },
  },

  // 作为连线目标
  targetConnectable: {
    enabled: true,
    onDragOver: (e) => {
      // 验证是否接受此连接
      const { source } = e.detail;
      return source.data?.type === 'output';  // 只接受 output
    },
    onDrop: (e) => {
      // 处理连接
      console.log('接受连接:', e.detail.source.getId());
      return true;
    },
  },

  // 通用连接验证
  connectable: (source, target) => {
    // 不允许自连接
    if (source === target) return false;
    // 只允许特定类型之间的连接
    return source.data?.type !== target.data?.type;
  },
});
```

### 同时启用拖拽和连线

当节点同时配置 `draggable` 和 `sourceConnectable` 时：

```typescript
const node = graph.addNode({
  id: 'node1',
  x: 100,
  y: 100,
  draggable: true,        // 可拖拽移动
  sourceConnectable: true, // 可作为连线源
  targetConnectable: true, // 可作为连线目标
});
```

**设计理念：事件驱动，不做限制**

Node 作为事件发射器，根据用户的实际交互行为派发对应的事件：
- 从节点**中心区域**拖拽 → 移动节点 → 派发 `node:*` 事件
- 从节点**边缘区域**拖拽 → 创建连线 → 派发 `connect:*` 事件

开发者完全控制要监听哪些事件以及如何响应：

```typescript
// 监听节点移动事件
graph.addEventListener('node:drag', (e) => {
  const { source, x, y } = e.detail;
  // Graph 会自动处理节点移动
  // 这里可以添加额外逻辑，如磁力吸附、边界检测等
});

// 监听连线创建事件
graph.addEventListener('connect:start', (e) => {
  const { source, x, y } = e.detail;
  console.log(`开始从 ${source.getId()} 创建连线`);
});

// 或者完全不监听某些事件，那它们就不会产生任何效果
```

**鼠标样式：**
- 两者都启用：`cursor: 'grab'`
- 只有 draggable：`cursor: 'move'`
- 只有 sourceConnectable：`cursor: 'crosshair'`

**事件触发顺序（从中心拖拽 - 移动节点）：**
```
pointerdown (节点中心)
  ↓
_determineDragType() → NODE_DRAG
  ↓
_startDrag(NODE_DRAG)
  ↓
dispatch('node:dragstart')  → Graph 准备移动
  ↓
pointermove
  ↓
dispatch('node:drag')       → Graph 更新节点位置
  ↓
pointerup
  ↓
dispatch('node:dragend')    → Graph 完成移动
```

**事件触发顺序（从边缘拖拽 - 创建连线）：**
```
pointerdown (节点边缘)
  ↓
_determineDragType() → CONNECTION
  ↓
_startDrag(CONNECTION)
  ↓
dispatch('connect:start')  → ConnectionPlugin 创建临时边
  ↓
pointermove
  ↓
dispatch('connect:drag')   → ConnectionPlugin 更新临时边
  ↓
pointerup
  ↓
dispatch('connect:end')    → ConnectionPlugin 创建实际边
```

## 端口交互配置

端口只支持连线，不支持拖拽移动：

```typescript
const port = node.createPort({
  id: 'output',
  layout: 'right',

  // 作为连线源
  sourceConnectable: {
    enabled: true,
    onDragStart: (e) => console.log('开始从端口连线'),
  },

  // 作为连线目标
  targetConnectable: {
    enabled: true,
    onDrop: (e) => console.log('连接到端口'),
  },

  // 端口不需要 draggable 配置
});
```

## Graph 级别事件监听

```typescript
const graph = new Graph({ container: 'container' });

// 监听所有节点拖拽事件
graph.addEventListener('node:dragstart', (e) => {
  console.log('节点拖拽开始:', e.detail.source.getId());
});

graph.addEventListener('node:drag', (e) => {
  // Graph 会自动处理节点移动
  // 这里可以添加额外逻辑
});

graph.addEventListener('node:dragend', (e) => {
  console.log('节点拖拽结束:', e.detail.source.getId());
});

// 监听所有连线事件
graph.addEventListener('connect:start', (e) => {
  console.log('连线开始:', e.detail.source.getId());
});

graph.addEventListener('connect:drag', (e) => {
  console.log('连线拖拽中:', e.detail.x, e.detail.y);
});

graph.addEventListener('connect:end', (e) => {
  console.log('连线结束:', e.detail.connected);
});
```

## 使用 ConnectionPlugin

ConnectionPlugin 是可选的便利层，自动处理 `connect:*` 事件：

```typescript
const graph = new Graph({ container: 'container' });

// 使用 ConnectionPlugin
graph.use(new ConnectionPlugin({
  defaultEdgeStyle: {
    stroke: '#1890ff',
    strokeWidth: 2,
  },
  snapToPorts: true,      // 启用端口吸附
  snapDistance: 10,        // 吸附距离（像素）
}));

// 现在连线会自动创建，无需手动处理 connect:* 事件
```

## 完整示例

```typescript
import { Graph } from '@antv/ge-core';

const graph = new Graph({
  container: 'container',
  width: 800,
  height: 600,
});

// 添加 ConnectionPlugin
graph.use(new ConnectionPlugin({
  defaultEdgeStyle: {
    stroke: '#1890ff',
    strokeWidth: 2,
  },
}));

// 创建可拖拽、可连线的节点
const node1 = graph.addNode({
  id: 'node1',
  x: 100,
  y: 100,
  style: { width: 100, height: 60, fill: '#f0f0f0' },
  draggable: true,
  sourceConnectable: true,
  targetConnectable: true,
});

const node2 = graph.addNode({
  id: 'node2',
  x: 400,
  y: 100,
  style: { width: 100, height: 60, fill: '#f0f0f0' },
  draggable: true,
  sourceConnectable: true,
  targetConnectable: true,
});

// 监听连线成功事件
graph.addEventListener('connect:end', (e) => {
  if (e.detail.connected) {
    console.log('连接成功:', e.detail.source.getId(), '->', e.detail.target?.getId());
  }
});

// 监听节点移动事件
graph.addEventListener('node:drag', (e) => {
  // Graph 已自动处理，这里可以添加额外逻辑
  const { source, x, y } = e.detail;
  console.log(`节点 ${source.getId()} 移动到 (${x}, ${y})`);
});
```

## 事件调试

```typescript
// 调试所有交互事件
const eventTypes = [
  'node:dragstart', 'node:drag', 'node:dragend',
  'connect:start', 'connect:drag', 'connect:end',
];

eventTypes.forEach((eventType) => {
  graph.addEventListener(eventType, (e) => {
    console.log(`[Event] ${eventType}:`, e.detail);
  });
});
```

## 注意事项

1. **坐标系统**：事件中的 x、y 是画布坐标，不是屏幕坐标
2. **事件阻止**：在事件处理器中调用 `preventDefault()` 可阻止操作
3. **性能考虑**：`node:drag` 和 `connect:drag` 频繁触发，避免复杂计算
4. **内存泄漏**：移除事件监听器时注意清理
