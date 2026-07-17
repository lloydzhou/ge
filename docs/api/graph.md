# Graph API

`Graph` 是图编辑器容器，继承自 `@antv/g-lite` 的 `Canvas`。

## 创建

```ts
const graph = new Graph({
  container: '#app',  // 选择器字符串或 HTMLElement
  width: 800,
  height: 600,
});
```

## 元素操作

### addNode / addEdge

```ts
const node = graph.addNode({ id: 'n1', shape: 'rect', x: 100, y: 100, label: 'A' });
const edge = graph.addEdge({ source: 'n1', target: 'n2' });
```

### appendChild（DOM 风格）

```ts
const node = new Node({ shape: 'rect', x: 100, y: 100 });
graph.appendChild(node);
```

### removeChild / removeCell

```ts
graph.removeChild(node);
graph.removeCell('n1');
```

## 查询

| 方法 | 返回 |
|------|------|
| `getNode(id)` | Node \| null |
| `getNodes()` | Node[] |
| `getEdges()` | Edge[] |
| `getCells()` | (Node \| Edge)[] |
| `getElementById(id)` | 任意元素 |
| `clear()` | 清空所有 |

## 坐标

```ts
graph.canvas2Viewport({ x, y });   // 世界 → 屏幕
graph.viewport2Canvas({ x, y });   // 屏幕 → 世界
graph.pickNode(viewportX, vy);     // 命中检测 → Node | null
```

## 视图

```ts
graph.panBy(dx, dy);       // 相对平移
graph.panTo(x, y);         // 平移到世界坐标
graph.zoomToFit(padding);  // 自适应视口
graph.resize(w, h);        // 调整画布
graph.culling = true;      // 启用虚拟渲染
```

## 序列化

```ts
const data = graph.toJSON();    // 导出
graph.fromJSON(data);           // 导入
graph.toDataURL('image/png');   // PNG data URL
graph.toSVGString();            // SVG 字符串
graph.batch(() => { ... });     // 批量（History 合并）
```

## 布局

```ts
import { hierarchicalLayout } from '@antv/ge';

// 布局函数为纯函数，返回 positions Map，由 graph.applyLayout 应用
const positions = hierarchicalLayout(nodes, edges, { nodeGap: 140, layerGap: 110 });
graph.applyLayout(positions);
// 可用：gridLayout / circularLayout / forceLayout / hierarchicalLayout / treeLayout
```

## 插件

```ts
graph.use(new DragPlugin());    // 安装
graph.getPlugin('drag');        // 获取
graph.dispose('drag');          // 移除
```

## 事件

```ts
graph.addEventListener('cell:added', (e) => {});
graph.addEventListener('cell:removed', (e) => {});
graph.addEventListener('cell:change', (e) => {});
```
