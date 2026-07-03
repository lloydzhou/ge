# GE — 基于 AntV/G DOM 模型的图编辑器

> GE = g-lite DOM 模型 + 图编辑领域语义。把 [AntV/G](https://g.antv.antgroup.com/) 当作「浏览器引擎」，GE 是跑在它之上的「图编辑 DOM 规范」——就像 HTML 之于浏览器。

## 设计哲学

- **数据结构**：借鉴 X6（Markup/Selector/Attrs/shape 声明式模型）
- **交互 API**：靠拢 DOM（`setAttribute` / `appendChild` / `addEventListener` / `classList` / `querySelector`）

```ts
// 创建（DOM 风格）
graph.appendChild(new Node({ shape: 'rect', x: 100, y: 100, label: 'A' }));

// 变换（attribute 驱动）
node.setAttribute('angle', 45);        // 旋转
node.setAttribute('width', 200);       // 缩放
node.setAttribute('resizable', true);  // 声明式工具配置

// 查询（document API）
graph.getElementById('n1');
graph.querySelector('.selected');

// 事件（DOM 冒泡）
node.addEventListener('click', fn);
graph.addEventListener('node:dragend', fn);
```

## 核心特性

- **类 DOM API**：`appendChild / getElementById / addEventListener / connectedCallback` 直接来自 g-lite。
- **X6 式抽象**：ShapeRegistry + Markup/Selector + Attrs(selector 粒度) + Model(props 序列化)。
- **8 个内置 shape**：rect / circle / ellipse / diamond / triangle / hexagon / parallelogram / cylinder。
- **19 个插件**：Drag / Resize(8向) / Rotate / Selection(框选) / Hover / CreateEdge / Vertex(增删) / Keyboard / Clipboard / Transform / History(snapshot) / Scroller / Snapline / Group(嵌套) / Dnd(坐标校准) / Minimap(拖框导航) / Grid(背景网格) / ContextMenu / Tooltip。
- **边视觉**：双向箭头(startArrow) / 标签(distance 沿路径定位) / Router(normal/orthogonal/manhattan) / Connector(normal/rounded/smooth)。
- **坐标变换**：GE 自有 2D 坐标层（panOffset + 中心缩放），pan/zoom 后坐标转换与渲染完全一致。
- **React 封装**：`@antv/ge-react` 声明式 `<GraphView>`（props diff 自动同步）。

## 快速开始

```bash
pnpm install && pnpm dev    # 启动 examples
pnpm test                    # 75 单测
pnpm build                   # 构建
```

## 示例

| 文件 | 演示 |
|------|------|
| `01-basic` | 基础渲染 + perimeter 锚点 |
| `02-ports` | Port + ratio 锚点 |
| `03-router` | 路由 × 连接器对比 |
| `04-interaction` | 拖拽 + 选中 + 撤销 + 小地图 |
| `05-advanced` | 缩放/平移 + 分组 + 对齐线 + 导出 |
| `06-stencil` | Stencil 拖拽 + 布局 + 小地图拖框 |
| `07-react` | React 声明式 GraphView |
| `08-edit` | 连线 + 键盘 + 复制 + Resize + Rotate + 框选 + Grid |

## License

MIT
