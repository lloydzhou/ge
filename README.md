# GE - Graph Editor for G

基于 [AntV/G](https://g.antv.vision/) 的现代化图编辑器库。

[![NPM version](https://img.shields.io/npm/v/@antv/ge.svg)](https://www.npmjs.com/package/@antv/ge)
[![NPM downloads](https://img.shields.io/npm/dm/@antv/ge.svg)](https://www.npmjs.com/package/@antv/ge)

## 简介

GE (Graph Editor) 是一个基于 AntV/G 渲染引擎的现代化图编辑器库。它提供了丰富的图编辑功能，采用类似 DOM 的 API 设计，让开发者感觉像是在使用原生的图编辑接口。

## 特性

- 🚀 **高性能** - 基于 AntV/G 渲染引擎，支持大规模图数据
- 🎨 **DOM 风格 API** - 类似原生 DOM 的操作方式
- 🔧 **插件化架构** - 模块化设计，按需使用功能
- 📦 **TypeScript 支持** - 完整的类型定义
- 🌍 **国际化** - 支持多语言
- 🎨 **主题定制** - 支持自定义主题和样式

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

## 架构设计

```
@antv/ge/
├── Graph.ts           # 图容器（继承 Canvas）
├── Node.ts            # 节点（继承 CustomElement）
├── Edge.ts            # 边（继承 CustomElement）
├── Port.ts            # 端口（继承 CustomElement）
├── plugins/           # 插件系统
│   ├── Selection.ts   # 选择插件
│   ├── Drag.ts        # 拖拽插件
│   ├── Resize.ts      # 缩放插件
│   ├── Connect.ts     # 连接插件
│   └── Align.ts       # 对齐插件
├── themes/            # 主题系统
├── utils/             # 工具函数
└── types/             # 类型定义
```

## 开发路线图

### Phase 1: 基础架构搭建 (1-2周)

- [ ] 项目初始化和基础结构搭建
- [ ] Graph 核心类实现（继承 Canvas）
- [ ] Node 核心类实现（继承 CustomElement）
- [ ] Edge 核心类实现（继承 CustomElement）
- [ ] Port 核心类实现（继承 CustomElement）
- [ ] DOM 风格 API 实现（appendChild, removeChild, querySelector 等）
- [ ] 基础事件系统

### Phase 2: 核心编辑功能 (2-3周)

- [ ] 节点拖拽功能
- [ ] 边的连接功能
- [ ] 基础选择功能
- [ ] 节点删除功能
- [ ] 端口系统实现
- [ ] 样式和属性操作 API

### Phase 3: 插件系统实现 (2-3周)

- [ ] 插件架构设计
- [ ] 选择插件（Selection Plugin）
- [ ] 拖拽插件（Drag Plugin）
- [ ] 缩放插件（Resize Plugin）
- [ ] 连接插件（Connect Plugin）
- [ ] 对齐插件（Align Plugin）

### Phase 4: 高级编辑功能 (3-4周)

- [ ] 多选和框选功能
- [ ] 节点旋转功能
- [ ] 边的控制点编辑
- [ ] 撤销/重做功能
- [ ] 网格对齐和吸附功能
- [ ] 快捷键支持

### Phase 5: 性能优化和稳定性 (2-3周)

- [ ] 大规模数据性能优化
- [ ] 内存泄漏检测和修复
- [ ] 单元测试覆盖率提升
- [ ] 性能基准测试
- [ ] 文档完善

### Phase 6: 高级特性和生态 (3-4周)

- [ ] 自动布局插件
- [ ] 导出/导入功能（JSON、图片等）
- [ ] React/Vue 组件封装
- [ ] 主题系统
- [ ] 国际化支持
- [ ] 官方示例和模板

### Phase 7: 生产就绪 (2周)

- [ ] 完整的文档和教程
- [ ] 性能测试报告
- [ ] 兼容性测试
- [ ] 发布 1.0 版本
- [ ] 社区推广

## 与 DOM API 的对应关系

| GE API | DOM API | 说明 |
|--------|---------|------|
| `graph.appendChild(node)` | `parent.appendChild(child)` | 添加子元素 |
| `graph.removeChild(node)` | `parent.removeChild(child)` | 移除子元素 |
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
- [AntV/G](https://g.antv.vision/)
- [GitHub](https://github.com/antvis/GE)