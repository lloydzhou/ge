# GE DOM API 指南

GE 的节点 / 边 / 端口都是真正的 DOM 元素（继承自 g-lite `CustomElement`），可直接使用 DOM 原生 API。

> 原则：改属性优先用 `setAttribute`（触发 Scheduler 调度合并），查询走 `getNode` / `getElementById`，事件用 `addEventListener`。

## 1. setAttribute / getAttribute

```ts
const node = graph.getNode('n1');

// 设置属性（走 markDirty，由 Scheduler 在帧边界统一刷新）
node.setAttribute('width', 120);
node.setAttribute('fill', '#e6f7ff');
node.setAttribute('label', '节点 A');

// 读取属性
console.log(node.getAttribute('x')); // '100'
```

## 2. 增删：addNode / appendChild / removeCell

`addNode` 与 `appendChild(new Node(...))` **完全等价**——前者内部就是 `document.createElement` + `appendChild` 的便捷封装：

```ts
// 便捷写法
const node = graph.addNode({ id: 'n1', shape: 'rect', x: 100, y: 100, width: 120, height: 60 });

// 等价的显式 DOM 写法
const node2 = new Node({ id: 'n2', shape: 'rect', x: 300, y: 100, width: 120, height: 60 });
graph.appendChild(node2);

// 删除：按 id 或按元素
graph.removeCell('n1');
graph.removeChild(node2);
```

## 3. 查询

```ts
graph.getNode('n1');            // 按 id 取节点
graph.getElementById('n1');     // 按 id 取任意元素（走 document）
graph.getNodes();               // 全部节点
graph.getEdges();               // 全部边

// 也可走 document 的 CSS 选择器查询
graph.document.querySelectorAll('g-node');
graph.document.querySelector('#n1');
```

## 4. 位置

```ts
const node = graph.getNode('n1');

// 移动到指定坐标
node.moveTo(200, 150);

// 或通过属性
node.setAttribute('x', 200);
node.setAttribute('y', 150);

// 读取世界 bbox（含 group offset）
const bb = node.getWorldBBox();
```

## 5. Port（端口）

```ts
import { Port } from '@antv/ge';

const node = graph.getNode('n1');

// 方式一：graph.addPort（局部坐标 x/y）
graph.addPort(node, { id: 'p1', x: 120, y: 30, fill: '#1890ff' });

// 方式二：DOM 风格 appendChild（layout 自动布局）
node.appendChild(new Port({ id: 'p2', layout: 'right' }));
```

## 6. 事件

```ts
const node = graph.getNode('n1');

node.addEventListener('click', (e) => {
  console.log('clicked:', node.id);   // 用 node.id，GE 无 getId()
});

node.removeEventListener('click', handler);
node.dispatchEvent(new CustomEvent('custom:event', { detail: {} }));
```

## 7. children

```ts
const node = graph.getNode('n1');
for (const child of node.children) {
  console.log(child.className); // 'ge-port' / 'text' ...
}
```

## 完整示例

```ts
import { Graph, Node, Edge } from '@antv/ge';

const graph = new Graph({ container: '#app', width: 800, height: 600 });

const a = graph.addNode({ id: 'a', shape: 'rect', x: 100, y: 100, width: 120, height: 60, fill: '#e6f7ff', stroke: '#1890ff' });
graph.addNode({ id: 'b', shape: 'rect', x: 360, y: 100, width: 120, height: 60 });
graph.addEdge({ id: 'e1', source: 'a', target: 'b' });

// 改属性
a.setAttribute('fill', '#f0f0f0');

// 移动
a.moveTo(150, 120);

// 查询
console.log(graph.getNodes().length);   // 2
console.log(graph.getNode('a') === a);  // true

// 删除
graph.removeCell('b');
```

## API 参考

### Graph

| 方法 | 说明 |
|------|------|
| `addNode(props)` / `addEdge(props)` | 创建并 appendChild（便捷封装） |
| `appendChild(el)` / `removeChild(el)` / `removeCell(id)` | DOM 增删 |
| `getNode(id)` / `getElementById(id)` | 按 id 查询 |
| `getNodes()` / `getEdges()` | 全量查询 |
| `use(plugin)` / `dispose(name)` | 插件安装 / 卸载 |
| `toJSON()` / `fromJSON(data)` / `toDataURL(type)` | 序列化 / 导出 |

### Node / Edge（继承 Cell → CustomElement）

| 方法 | 说明 |
|------|------|
| `setAttribute(k, v)` / `getAttribute(k)` | 属性读写 |
| `moveTo(x, y)` | 移动（Node） |
| `getWorldBBox()` | 世界 bbox（Node） |
| `appendChild(child)` / `removeChild(child)` | 子元素操作 |
| `addEventListener` / `removeEventListener` / `dispatchEvent` | 事件 |
| `getData()` / `setData(patch)` | 自定义业务数据 |

## 最佳实践

1. **改属性用 setAttribute**：触发 Scheduler 合并，避免高频同步重绘。
2. **查询用 getNode / getElementById**：比 querySelector 快（无需解析选择器）。
3. **删除走 removeCell / removeChild**：触发 disconnectedCallback 清理监听器，避免内存泄漏。
4. **addNode 与 appendChild 等价**：内部都是 `createElement + appendChild`，按喜好选用。
