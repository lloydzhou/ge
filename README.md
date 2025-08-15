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
const foundNode = graph.getElementById('my-node');

// 查询节点 - 类似 document.querySelectorAll
const nodes = graph.querySelectorAll('g-node');
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
// 创建自定义节点类
class CustomNode extends Node {
  constructor(config) {
    super(config);
    
    // 添加自定义元素
    this.rect = new Rect({
      style: {
        width: config.style.width,
        height: config.style.height,
        fill: config.style.fill
      }
    });
    
    this.label = new Text({
      style: {
        text: config.style.label,
        fill: '#000'
      }
    });
    
    // 组织元素结构
    this.appendChild(this.rect);
    this.appendChild(this.label);
    
    // 添加交互
    this.addEventListener('click', this.onClick.bind(this));
  }
  
  onClick(event) {
    console.log('Custom node clicked:', this.id);
  }
}

// 使用自定义节点
const customNode = new CustomNode({
  id: 'custom-1',
  x: 100,
  y: 100,
  style: {
    width: 120,
    height: 60,
    fill: '#fff',
    label: 'Custom Node'
  }
});

graph.appendChild(customNode);
```

### 2. 数据绑定

```typescript
// 创建带有数据的节点
const node = new Node({
  id: 'data-node',
  x: 100,
  y: 100,
  data: {
    name: 'John',
    age: 30,
    department: 'Engineering'
  },
  style: {
    width: 120,
    height: 80
  }
});

// 访问数据
console.log(node.data.name); // 'John'

// 更新数据
node.data.age = 31;
```

## 架构设计（更新）

项目采用模块化、可插拔的设计，核心按职责拆分：

```
@antv/ge/
├── core/                # 核心实现（对外仍通过 packages/ge-core/src/index.ts 暴露）
│   ├── Graph.ts         # 图容器（继承 Canvas）
│   ├── Node.ts          # 节点（继承 CustomElement）
│   ├── Edge.ts          # 边（继承 CustomElement）
│   ├── Port.ts          # 端口（继承 CustomElement）
│   └── EdgeMarker.ts    # 边端 marker 抽象（创建/更新/销毁）
├── plugins/             # 插件系统（交互/工具）
│   ├── ConnectionPlugin.ts
│   ├── RendererPluginAdapter.ts
│   └── ...
├── utils/               # 工具函数（推荐直接引用）
│   ├── shapeResolver.ts # 运行时 shape 解析（优先使用 graph.document.customElements）
│   ├── edgeLayout.ts    # Edge 上的 anchor 计算（computeAnchor）
│   └── nodeAnchor.ts    # Node/Port 通用的 anchor 计算（computeAnchorForShape）
└── types/               # 类型定义与共享类型
```

关键设计点：
- 运行时 shape 注册与解析：优先使用 graph.document.customElements（支持按图隔离的自定义形状），API 接受 `shape?: string | Function`。
- 去中心化布局计算：Edge 的 anchor（computeAnchor）和 Node 的 anchor（computeAnchorForShape）都放在 utils，Port/EdgeMarker/工具复用同一套计算，便于扩展和测试。
- Marker 抽象（EdgeMarker）：负责 marker 的创建、朝向、位置更新与销毁，Edge 只负责提供 anchor。
- 插件化：交互（连接、拖拽、对齐等）以插件形式实现，便于按需加载和替换实现。


## 开发路线图（更新与优先级）

短期优先（当前迭代，1-2 周）
- [ ] 类型巩固：将 `shape?: string|Function` 等类型统一到共享 types，移除临时的 any/ts-ignore。 (高)
- [ ] 文档与示例：完善 README、examples，添加自定义 shape、port、marker 的使用示例并保证示例覆盖 polygon/ellipse/angle 等场景。(高)
- [ ] 单元测试：为 utils（edgeLayout/nodeAnchor/shapeResolver）编写单元测试，覆盖关键几何和边界条件。(中)

中期计划（2-6 周）
- [ ] 插件完善：使 ConnectionPlugin/Drag/Selection 等具备更完善的拾取与交互逻辑（包含异步拾取支持）。(中)
- [ ] 性能与稳定性：解决内存泄漏、提高大图渲染性能、增加更多集成测试与基准测试。(中)
- [ ] 类型导出与包入口：在包顶层导出常用 utils/types，改善外部使用体验。(中)

长期目标（6 周以上）
- [ ] 高级编辑功能：自动布局、控制点编辑、撤销/重做、快捷键与工具栏体系。(低)
- [ ] 生态与集成：提供 React/Vue 封装、示例模板与官方教程。(低)

如果你同意，我可以马上：
- 将 README 中的“高级用法”示例也替换为使用 `shape` 参数的版本（把 CustomNode 示例改为示范如何继承并使用 shape），并把上面文档里的要点进一步压缩成 API 摘要；或
- 直接开始为 `computeAnchorForShape` 写单元测试（需要我先检查项目是否有测试框架，例如 jest 或 vitest）。

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