# GE - Graph Editor for G

基于 [AntV/G](https://g.antv.antgroup.com/)，采用类 DOM 的 API 设计的现代化图编辑器库。

GE 以开放、可扩展的架构为核心，面向多样化场景和未来需求，强调灵活性、可组合性与技术融合。关注开发者体验，致力于推动图编辑技术的边界。

## 特性

- 面向未来的架构设计，开放且可扩展
- 类 DOM 风格 API，与 Web 标准一致，易用性强
- 灵活的技术融合与生态适配
- 强调可组合性与开发者体验
- 支持多样化场景与持续演进

## 安装

```bash
npm install @antv/ge
```

## 快速开始

```typescript
import { Graph, Node, Edge } from '@antv/ge';
import { Rect, Circle } from '@antv/g-lite';

// 创建图编辑器实例（类似创建 canvas 元素）
const graph = new Graph({
  container: 'container',
  width: 800,
  height: 600,
});

// 等待图准备就绪（类似 window.onload）
graph.addEventListener('ready', () => {
  // 创建节点（类似 createElement）
  const node1 = new Node({
    id: 'node1',
    x: 100,
    y: 100,
    shape: Rect,
    style: {
      width: 100,
      height: 40,
      fill: '#fff',
      stroke: '#000',
      label: 'Node 1'
    }
  });
  
  // 添加节点到图中（类似 appendChild）
  graph.appendChild(node1);
  
  // 创建另一个节点
  const node2 = new Node({
    id: 'node2',
    x: 300,
    y: 100,
    shape: Circle,
    style: {
      r: 40,
      fill: '#fff',
      stroke: '#000',
      label: 'Node 2'
    }
  });
  
  graph.appendChild(node2);
  
  // 创建边（类似创建其他元素）
  const edge = new Edge({
    id: 'edge1',
    source: 'node1',
    target: 'node2',
    style: {
      stroke: '#000',
      lineWidth: 1
    }
  });
  
  // 添加边到图中
  graph.appendChild(edge);
});

// 监听节点点击事件（类似 addEventListener）
graph.addEventListener('click', (event) => {
  if (event.target instanceof Node) {
    console.log('Clicked node:', event.target.id);
  }
});
```

<!-- 示例渲染截图 -->
<p>
  <img width="800" height="600" alt="Image" src="https://github.com/user-attachments/assets/55aacbb7-6d9d-4905-aa17-a960d28ce2fd" />
</p>

## DOM 风格 API 设计

### 1. 元素创建和操作

```typescript
// 创建节点 - 类似 document.createElement('div')
const node = new Node({
  id: 'my-node',
  x: 100,
  y: 100,
  style: {
    width: 100,
    height: 40,
    fill: '#fff'
  }
});

// 添加到图中 - 类似 parent.appendChild(child)
graph.appendChild(node);

// 移除节点 - 类似 parent.removeChild(child)
graph.removeChild(node);

// 获取节点 - 类似 document.getElementById
const foundNode = graph.document.getElementById('my-node');
// 或者使用更快的注册表查找
const foundNode2 = graph.getNodeById('my-node');

// 查询节点 - 类似 document.querySelectorAll
const nodes = graph.document.querySelectorAll('g-node');
```

### 2. 属性操作

```typescript
// 设置样式 - 类似 element.style.setProperty
node.style.width = 120;
node.style.height = 50;
node.style.fill = '#e6f7ff';

// 获取样式 - 类似 element.style.getPropertyValue
const width = node.style.width;

// 设置属性 - 类似 element.setAttribute
node.setAttribute('data-type', 'custom-node');

// 获取属性 - 类似 element.getAttribute
const type = node.getAttribute('data-type');
```

### 3. 事件处理

```typescript
// 添加事件监听器 - 类似 element.addEventListener
node.addEventListener('mouseenter', (event) => {
  node.style.fill = '#e6f7ff';
});

node.addEventListener('mouseleave', (event) => {
  node.style.fill = '#fff';
});

// 移除事件监听器 - 类似 element.removeEventListener
node.removeEventListener('mouseenter', handler);
```

### 4. 子元素操作

```typescript
// 节点可以包含子元素
const label = new Text({
  style: {
    text: 'My Node',
    fill: '#000'
  }
});

node.appendChild(label);

// 获取子元素
const children = node.children;

// 移除子元素
node.removeChild(label);
```

## 高级用法

### 1. 自定义节点类型

```typescript
// 方式1: 使用 shape 注册自定义元素
import { Rect } from '@antv/g-lite';

graph.customElements.define('custom-rect', Rect);

const node = new Node({
  id: 'n1',
  shape: 'custom-rect',
  x: 100,
  y: 100,
  style: {
    width: 100,
    height: 60,
    fill: '#fff'
  }
});

graph.appendChild(node);

// 方式2: 继承 Node 类
class CustomNode extends Node {
  constructor(config) {
    super(config);
    // 添加自定义逻辑
  }
}

const customNode = new CustomNode({
  id: 'n2',
  x: 200,
  y: 100
});

graph.appendChild(customNode);
```

### 2. 自定义路由器

```typescript
import type { EdgeRouter } from '@antv/ge';
import type { Vec2 } from '@antv/ge';

class MyRouter implements EdgeRouter {
  route(points: Vec2[], vertices?: Vec2[]): Vec2[] {
    // 自定义路由逻辑
    return points;
  }
}

const edge = new Edge({
  id: 'e1',
  source: 'n1',
  target: 'n2',
  style: {
    router: new MyRouter()
  }
});
```

### 3. 自定义连接器

```typescript
import type { EdgeConnector } from '@antv/ge';
import { DisplayObject } from '@antv/g-lite';
import type { BaseEdgeStyleProps } from '@antv/ge';

class MyConnector implements EdgeConnector {
  connect(points: Vec2[], style: BaseEdgeStyleProps): DisplayObject {
    // 自定义图形生成
    return new Line({
      style: {
        x1: points[0][0],
        y1: points[0][1],
        x2: points[1][0],
        y2: points[1][1],
        ...style
      }
    });
  }
}

const edge = new Edge({
  id: 'e1',
  source: 'n1',
  target: 'n2',
  style: {
    connector: new MyConnector()
  }
});
```

## 架构设计

### 核心理念

GE 以 **@antv/g-lite** 为渲染引擎，在其上抽象图编辑的"原语"（借鉴 antv/x6 的概念）。

**关键类比**:
- Canvas (DOM) + Context (ctx)
- Graph (继承 Canvas) + 图编辑原语 (非可视化对象)

### 三层架构

```
┌─────────────────────────────────────────────────────────┐
│  Layer 3: GE 可视化元素 (继承 CustomElement)            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │  Graph  │ │  Node   │ │  Edge   │ │  Port   │      │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘      │
└───────┼───────────┼───────────┼───────────┼───────────┘
        │           │           │           │
┌───────┴───────────┴───────────┴───────────┴───────────┐
│  Layer 2: GE 图编辑原语 (非可视化对象)                 │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐               │
│  │ Router  │ │Connector │ │  Anchor  │               │
│  │(路径计算)│ │(图形生成) │ │(锚点计算) │               │
│  └─────────┘ └──────────┘ └──────────┘               │
└───────┬───────────┬───────────┬───────────────────────┘
        │           │           │
┌───────┴───────────┴───────────┴───────────────────────┐
│  Layer 1: @antv/g-lite (渲染引擎)                      │
│  ┌─────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ Canvas  │ │CustomElement │ │DisplayObject │       │
│  └─────────┘ └──────────────┘ └──────────────┘       │
└───────────────────────────────────────────────────────┘
```

### Layer 1: @antv/g-lite

GE 完全基于 @antv/g-lite 构建，复用其渲染能力：

| g-lite | GE 对应 |
|--------|--------|
| Canvas | Graph (图容器) |
| CustomElement | Node, Edge, Port (可视化元素) |
| RenderingPlugin | 插件系统 |

### Layer 2: 图编辑原语 (非可视化对象)

这些是 **纯 JS 对象**，不继承 DisplayObject：

| 原语 | 作用 | 示例 |
|------|------|------|
| Router | 计算边的路径点 | NormalRouter, OrthogonalRouter, ManhattanRouter |
| Connector | 生成路径图形 | NormalConnector (Line), PolylineConnector (Polyline) |
| Anchor | 计算连接点位置 | computeAnchor(shape, angle) |

### Layer 3: 可视化元素

继承 CustomElement，负责实际渲染：

- **Graph**: 图容器，继承 Canvas，管理节点/边注册表
- **Node**: 节点，包含 primaryShape、label、ports
- **Edge**: 边，包含 path、label、markers，使用 Router + Connector
- **Port**: 端口，节点上的连接桩

### 文件结构

```
packages/ge-core/src/
├── core/
│   ├── Graph.ts              # 继承 Canvas，图容器
│   ├── node/
│   │   └── Node.ts            # 继承 CustomElement，节点基类
│   ├── edge/
│   │   ├── Edge.ts            # 继承 CustomElement，边基类
│   │   ├── EdgeMarker.ts      # 箭头管理
│   │   ├── EdgeRouter.ts      # 路由器接口和实现
│   │   └── EdgeConnector.ts    # 连接器接口和实现
│   ├── port/
│   │   └── Port.ts            # 继承 CustomElement，端口
│   └── CommandHistory.ts      # 撤销/重做
├── utils/
│   ├── edgeLayout.ts          # 锚点计算工具
│   └── shapeResolver.ts       # 形状解析工具
├── plugins/
│   └── ConnectionPlugin.ts    # 连线插件
└── types/
    └── index.ts               # 类型定义
```


## 开发路线图

详细的开发计划请参考 [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)

**近期重点 (1-2 周):**
- [ ] 配置 Jest 测试环境和测试脚本
- [ ] 完善类型系统，移除临时 any/ts-ignore
- [ ] 为核心工具函数编写单元测试

**短期目标 (2-4 周):**
- [ ] 实现 SelectionPlugin 和 DragPlugin
- [ ] ConnectionPlugin 功能增强
- [ ] 插件开发文档

**中期目标 (1-2 月):**
- [ ] 性能优化与大图渲染支持
- [ ] 撤销/重做系统完善
- [ ] 布局算法集成

**长期目标 (3+ 月):**
- [ ] React/Vue 框架集成
- [ ] 完整示例库和教程
- [ ] 生态建设

## 与 DOM API 的对应关系

| GE API | DOM API | 说明 |
|--------|---------|------|
| `graph.appendChild(node)` | `parent.appendChild(child)` | 添加子元素 |
| `graph.removeChild(node)` | `parent.removeChild(child)` | 秼除子元素 |
| `graph.getElementById(id)` | `document.getElementById(id)` | 通过 ID 获取元素 |
| `graph.querySelectorAll(selector)` | `document.querySelectorAll(selector)` | 查询元素 |
| `node.addEventListener(type, handler)` | `element.addEventListener(type, handler)` | 添加事件监听器 |
| `node.style.width = 100` | `element.style.width = '100px'` | 设置样式 |
| `node.setAttribute(name, value)` | `element.setAttribute(name, value)` | 设置属性 |

## 贡献

我们欢迎任何形式的贡献，包括但不限于：

- 提交 Issue
- 提交 Pull Request
- 改进文档
- 提供使用案例

## License

MIT

## 相关链接

- [AntV 官网](https://antv.vision/)
- [AntV/G](https://g.antv.antgroup.com/)
- [GitHub](https://github.com/antvis/GE)