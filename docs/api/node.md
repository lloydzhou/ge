# Node API

`Node` 是图节点，继承自 `Cell`。

## 创建

```ts
const node = new Node({
  shape: 'rect',
  x: 100, y: 100,
  width: 120, height: 60,
  label: '节点',
});
graph.appendChild(node);
```

## 属性（setAttribute）

### 几何

| 属性 | 类型 | 说明 |
|------|------|------|
| `x` / `y` | number | 位置 |
| `width` / `height` | number | 尺寸 |
| `angle` | number | 旋转角度 |

### 样式

| 属性 | 说明 |
|------|------|
| `shape` | 形状名（rect/circle/...） |
| `fill` | 填充色 |
| `stroke` | 描边色 |
| `strokeWidth` | 描边宽 |
| `radius` | 圆角（rect） |
| `shadowColor` / `shadowBlur` | 阴影 |
| `opacity` | 透明度 |
| `visible` | 可见性 |

### 标签

| 属性 | 说明 |
|------|------|
| `label` | 标签文本 |
| `labelFill` | 标签颜色 |
| `labelFontSize` | 标签字号 |

### 交互

| 属性 | 说明 |
|------|------|
| `resizable` | 是否可 resize |
| `rotatable` | 是否可旋转 |
| `stateStyles` | 状态样式（hover/selected） |

## Port

```ts
import { Port } from '@antv/ge';

node.appendChild(new Port({ id: 'p1', layout: 'right' }));
// layout: top / bottom / left / right（同方向自动均匀排列）
```

## 方法

```ts
node.getWorldBBox();   // 世界 bbox（含 group offset）
node.toFront();        // 置顶
node.toBack();         // 置底
node.moveTo(x, y);     // 移动
node.getData();        // 自定义数据
node.setData({ ... });
```

## 事件

```ts
node.addEventListener('click', (e) => {});
node.addEventListener('node:dragstart', (e) => {});
node.addEventListener('node:drag', (e) => {});
node.addEventListener('node:dragend', (e) => {});
```
