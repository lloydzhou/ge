# 坐标系统

GE 自建 2D 坐标层，绕过 g-lite SVG camera 的 3D 透视投影不一致问题。

## 坐标转换

| 方法 | 说明 |
|------|------|
| `canvas2Viewport({ x, y })` | 世界坐标 → 屏幕坐标 |
| `viewport2Canvas({ x, y })` | 屏幕坐标 → 世界坐标 |
| `pickNode(vx, vy)` | 屏幕坐标 → 命中 Node（自定义命中，不用 g-lite hit test） |

```ts
const screen = graph.canvas2Viewport({ x: 100, y: 100 });
const world = graph.viewport2Canvas({ x: 200, y: 200 });
const node = graph.pickNode(200, 200);
```

## Pan / Zoom

| 方法 | 说明 |
|------|------|
| `panBy(dx, dy)` | 相对平移（屏幕像素） |
| `panTo(x, y)` | 平移使世界坐标居中 |

GE 用 `root.translate`（2D）实现 pan，不污染 scene graph：

```ts
graph.panBy(50, 0);     // 右移 50px
graph.panTo(300, 200);  // 世界坐标 (300,200) 居中
```

## zoomToFit

自动缩放并平移，使所有内容适配视口：

```ts
graph.zoomToFit();     // padding 20
graph.zoomToFit(40);   // padding 40
```

## culling（虚拟渲染）

只渲染视口内的节点，提升大图性能：

```ts
graph.culling = true;   // 启用
graph.culling = false;  // 关闭（恢复全部显示）
```

## 设计说明

GE 绕过 g-lite SVG camera 的 3D 投影，改用自有 2D 坐标层：

- **pan** = `root.translate`（2D，不污染 scene graph）
- **zoom** = `camera.setZoom`（线性 scale）
- **公式**：`viewport = (world + panOffset - center) × zoom + center`

这确保 pan / zoom / minimap / culling 后的坐标转换与 DOM 渲染完全一致。
