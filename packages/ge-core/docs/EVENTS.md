# GE 事件系统文档

GE (Graph Editor) 的事件系统基于 @antv/g 的官方 [g-plugin-dragndrop](https://g.antv.antgroup.com/en/plugins/dragndrop) 插件，使用标准 PointerEvents 和 DOM 风格的拖拽 API。

## 设计理念

1. **使用官方插件**：依赖 g-plugin-dragndrop 提供底层拖拽能力
2. **配置驱动**：通过 `style.draggable`、`style.linkable`、`style.linkto` 配置交互行为
3. **事件委托**：插件在 Graph 级别监听事件，统一处理交互逻辑
4. **标准事件**：使用 `dragstart`、`drag`、`dragend`、`drop` 等标准事件名

## 事件类型概览

| 事件名称 | 来源 | 处理者 | 说明 |
|---------|-------|-----------|------|
| `dragstart` | g-plugin-dragndrop | MovePlugin/ConnectionPlugin | 开始拖拽 |
| `drag` | g-plugin-dragndrop | MovePlugin/ConnectionPlugin | 拖拽中 |
| `dragend` | g-plugin-dragndrop | MovePlugin | 拖拽结束 |
| `drop` | g-plugin-dragndrop | ConnectionPlugin | 放置到目标 |
| `node:moved` | Node | 应用层 | 节点移动后（GE 特有事件） |
| `node:added` | Graph | 应用层 | 节点添加后（GE 特有事件） |

## 配置交互行为

### 节点拖拽 (draggable)

使用 `MovePlugin` 实现节点拖拽移动：

```typescript
import { Graph, Node, MovePlugin } from '@antv/ge-core';

const graph = new Graph({
  container: 'container',
  width: 800,
  height: 600,
});

// 使用 MovePlugin（会自动注册 g-plugin-dragndrop）
graph.use(new MovePlugin({
  snapToGrid: false,     // 是否网格对齐
  gridSize: 10,          // 网格大小
}));

// 创建可拖拽节点
const node = new Node({
  id: 'node1',
  x: 100,
  y: 100,
  style: {
    width: 100,
    height: 60,
    fill: '#f0f0f0',
    draggable: true,  // 启用拖拽
  },
});

graph.appendChild(node);
```

### 节点连线 (linkable / linkto)

使用 `ConnectionPlugin` 实现连线创建：

```typescript
import { Graph, Node, ConnectionPlugin } from '@antv/ge-core';

const graph = new Graph({
  container: 'container',
  width: 800,
  height: 600,
});

// 使用 ConnectionPlugin
graph.use(new ConnectionPlugin({
  defaultEdgeStyle: {
    stroke: '#1890ff',
    lineWidth: 2,
  },
}));

// 创建可连线节点
const node = new Node({
  id: 'node1',
  x: 100,
  y: 100,
  style: {
    width: 100,
    height: 60,
    fill: '#f0f0f0',
    linkable: true,   // 可作为连线源
    linkto: true,     // 可作为连线目标
  },
});

graph.appendChild(node);
```

### 端口连线

```typescript
const node = new Node({
  id: 'node1',
  x: 100,
  y: 100,
  style: {
    width: 100,
    height: 60,
    fill: '#f0f0f0',
  },
});

// 创建可连线端口
node.createPort({
  id: 'output',
  layout: 'right',
  style: {
    linkable: true,   // 可作为连线源
  },
});

node.createPort({
  id: 'input',
  layout: 'left',
  style: {
    linkto: true,     // 可作为连线目标
  },
});
```

### 画布平移 (拖拽画布背景)

```typescript
import { Canvas, CanvasRenderer } from '@antv/g-lite';
import { Plugin as DragndropPlugin } from '@antv/g-plugin-dragndrop';

const renderer = new CanvasRenderer();
renderer.registerPlugin(new DragndropPlugin({
  isDocumentDraggable: true,  // 启用画布拖拽
}));

const graph = new Graph({
  container: 'container',
  width: 800,
  height: 600,
  draggable: true,  // 设置画布可拖拽（显示 grab 光标）
  renderer,
});

// MovePlugin 会自动处理画布拖拽的相机平移
graph.use(new MovePlugin());
```

## MovePlugin 事件处理

MovePlugin 监听 g-plugin-dragndrop 事件并处理节点移动：

```typescript
graph.use(new MovePlugin());

// MovePlugin 内部实现（简化）
class MovePlugin {
  apply(context) {
    const graph = context.graph;

    // 注册 g-plugin-dragndrop（如果未注册）
    const renderer = graph.renderer;
    if (!this._isDragndropRegistered(renderer)) {
      const dragndropPlugin = new DragndropPlugin({
        isDocumentDraggable: graph.document?.style?.draggable,
      });
      renderer.registerPlugin(dragndropPlugin);
    }

    // 监听节点拖拽
    this._onDrag = (e) => {
      const target = e.target;
      if (target?.style?.draggable) {
        // 使用 requestAnimationFrame 实现平滑移动
        const { canvasX, canvasY } = e;
        target.setPosition(canvasX, canvasY);
      }
    };

    graph.addEventListener('drag', this._onDrag);
  }
}
```

## ConnectionPlugin 事件处理

ConnectionPlugin 监听 g-plugin-dragndrop 事件并处理连线创建：

```typescript
graph.use(new ConnectionPlugin({
  defaultEdgeStyle: { stroke: '#1890ff', lineWidth: 2 },
}));

// ConnectionPlugin 内部实现（简化）
class ConnectionPlugin {
  apply(context) {
    const graph = context.graph;

    // 注册 g-plugin-dragndrop（如果未注册）
    const renderer = graph.renderer;
    if (!this._isDragndropRegistered(renderer)) {
      renderer.registerPlugin(new DragndropPlugin());
    }

    // 监听连线开始
    this._onDragStart = (e) => {
      const target = e.target;
      if (target?.style?.linkable) {
        // 创建临时边
        this._tempEdge = new Edge({
          source: target,
          target: { x: e.canvasX, y: e.canvasY },
        });
        graph.appendChild(this._tempEdge);
      }
    };

    // 监听连线拖拽
    this._onDrag = (e) => {
      if (this._tempEdge) {
        this._tempEdge.target = { x: e.canvasX, y: e.canvasY };
      }
    };

    // 监听连线结束
    this._onDrop = (e) => {
      const target = e.target;
      if (this._tempEdge && target?.style?.linkto) {
        // 创建实际边
        const edge = new Edge({
          id: `edge-${Date.now()}`,
          source: this._tempEdge.source,
          target: target,
        });
        graph.appendChild(edge);
      }
      // 清理临时边
      if (this._tempEdge) {
        graph.removeChild(this._tempEdge);
        this._tempEdge = null;
      }
    };

    graph.addEventListener('dragstart', this._onDragStart);
    graph.addEventListener('drag', this._onDrag);
    graph.addEventListener('drop', this._onDrop);
  }
}
```

## GE 特有事件

除了 g-plugin-dragndrop 的标准事件外，GE 还派发一些特有事件供应用层使用：

### node:moved

节点移动后派发（不是拖拽中，而是移动完成后）：

```typescript
graph.addEventListener('node:moved', (e) => {
  const { id, x, y } = e.detail;
  console.log(`节点 ${id} 移动到 (${x}, ${y})`);
  // 可以在这里保存节点位置到后端
});
```

### node:added

节点添加到图后派发：

```typescript
graph.addEventListener('node:added', (e) => {
  const { id, x, y } = e.detail;
  console.log(`节点 ${id} 添加到 (${x}, ${y})`);
});
```

## 配置优先级

节点可以同时配置多种交互能力：

```typescript
const node = new Node({
  id: 'node1',
  x: 100,
  y: 100,
  style: {
    draggable: true,    // 可拖拽移动
    linkable: true,     // 可作为连线源
    linkto: true,       // 可作为连线目标
  },
});
```

**交互行为：**
- 鼠标按下 → g-plugin-dragndrop 派发 `dragstart`
- MovePlugin 检查 `style.draggable` → 如果 true，处理移动
- ConnectionPlugin 检查 `style.linkable` → 如果 true，创建连线

## 自定义事件处理

您可以在应用层监听拖拽事件并添加自定义逻辑：

```typescript
// 监听所有拖拽事件
graph.addEventListener('dragstart', (e) => {
  const target = e.target;
  console.log('开始拖拽:', target.getId());

  // 可以在这里添加自定义逻辑
  // 例如：高亮选中的节点
  target.style.stroke = '#ff0000';
});

graph.addEventListener('drag', (e) => {
  // 拖拽中
  // 注意：此事件频繁触发，避免复杂计算
  const { canvasX, canvasY } = e;
});

graph.addEventListener('dragend', (e) => {
  const target = e.target;
  console.log('拖拽结束:', target.getId());

  // 恢复样式
  target.style.stroke = '#000000';
});

graph.addEventListener('drop', (e) => {
  const target = e.target;
  console.log('放置到:', target.getId());
});
```

## 光标样式

GE 自动设置合适的光标样式：

| 配置 | 光标样式 |
|------|----------|
| `draggable: true` | `grab` / `grabbing` |
| `linkable: true` | `crosshair` |
| `linkto: true` | 默认光标 |
| 画布可拖拽 | `grab` / `grabbing` |

您也可以在样式中自定义：

```typescript
const node = new Node({
  id: 'node1',
  style: {
    draggable: true,
    cursor: 'move',  // 自定义光标
  },
});
```

## 完整示例

```typescript
import { CanvasRenderer } from '@antv/g-lite';
import { Plugin as DragndropPlugin } from '@antv/g-plugin-dragndrop';
import { Graph, Node, Edge, MovePlugin, ConnectionPlugin } from '@antv/ge-core';

// 1. 创建渲染器并注册 g-plugin-dragndrop
const renderer = new CanvasRenderer();
renderer.registerPlugin(new DragndropPlugin({
  isDocumentDraggable: true,  // 启用画布拖拽
}));

// 2. 创建图
const graph = new Graph({
  container: 'container',
  width: 800,
  height: 600,
  draggable: true,  // 设置画布可拖拽（显示 grab 光标）
  renderer,
});

// 3. 使用插件
graph.use(new MovePlugin({
  snapToGrid: true,
  gridSize: 10,
}));
graph.use(new ConnectionPlugin({
  defaultEdgeStyle: {
    stroke: '#1890ff',
    lineWidth: 2,
  },
}));

// 4. 创建节点
const node1 = new Node({
  id: 'node1',
  x: 100,
  y: 100,
  style: {
    width: 100,
    height: 60,
    fill: '#f0f0f0',
    draggable: true,  // 可拖拽
    linkable: true,   // 可连线源
    linkto: true,     // 可连线目标
  },
});

const node2 = new Node({
  id: 'node2',
  x: 400,
  y: 100,
  style: {
    width: 100,
    height: 60,
    fill: '#f0f0f0',
    draggable: true,
    linkable: true,
    linkto: true,
  },
});

graph.appendChild(node1);
graph.appendChild(node2);

// 5. 监听 GE 特有事件
graph.addEventListener('node:moved', (e) => {
  console.log('节点移动:', e.detail);
});

graph.addEventListener('node:added', (e) => {
  console.log('节点添加:', e.detail);
});

// 现在您可以：
// - 拖拽节点移动位置
// - 从一个节点拖拽到另一个节点创建连线
// - 拖拽画布背景平移视图
```

## 注意事项

1. **依赖 g-plugin-dragndrop**：确保正确注册了 g-plugin-dragndrop 插件
2. **MovePlugin 和 ConnectionPlugin 会自动注册**：如果未注册，它们会自动注册 g-plugin-dragndrop
3. **事件目标**：`e.target` 是被拖拽的元素（Node 或 Port）
4. **坐标系统**：`canvasX`、`canvasY` 是画布坐标，不是屏幕坐标
5. **性能考虑**：`drag` 事件频繁触发，避免在处理器中进行复杂计算

## 迁移指南

如果您使用的是旧版 GE 自定义拖拽系统，迁移到新系统：

### 旧配置（已弃用）
```typescript
// ❌ 旧方式
const node = new Node({
  draggable: true,
  sourceConnectable: true,  // 已弃用
  targetConnectable: true,  // 已弃用
});
```

### 新配置
```typescript
// ✅ 新方式
const node = new Node({
  style: {
    draggable: true,
    linkable: true,   // 替代 sourceConnectable
    linkto: true,     // 替代 targetConnectable
  },
});
```

### 旧事件（已弃用）
```typescript
// ❌ 旧事件
graph.addEventListener('node:dragstart', ...);
graph.addEventListener('node:drag', ...);
graph.addEventListener('node:dragend', ...);
graph.addEventListener('connect:start', ...);
graph.addEventListener('connect:drag', ...);
graph.addEventListener('connect:end', ...);
```

### 新事件
```typescript
// ✅ 新事件（g-plugin-dragndrop 标准事件）
graph.addEventListener('dragstart', ...);
graph.addEventListener('drag', ...);
graph.addEventListener('dragend', ...);
graph.addEventListener('drop', ...);

// ✅ GE 特有事件（应用层使用）
graph.addEventListener('node:moved', ...);
graph.addEventListener('node:added', ...);
```

## 参考

- [g-plugin-dragndrop 官方文档](https://g.antv.antgroup.com/en/plugins/dragndrop)
- [MovePlugin 源码](../src/plugins/MovePlugin.ts)
- [ConnectionPlugin 源码](../src/plugins/ConnectionPlugin.ts)
