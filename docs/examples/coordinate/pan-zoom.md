# 平移与缩放 Pan / Zoom

`ScrollerPlugin` 提供完整的视口交互：滚轮以光标为中心缩放、空白处拖拽平移画布。程序化控制通过 `setZoom` / `zoomToFit` / `panTo`。

<ExamplePreview src="coordinate/pan-zoom" :height="460" />

## 操作

- **滚轮**：以光标位置为中心缩放
- **空白处拖拽**：平移画布
- 右上按钮：放大 / 缩小 / 自适应（zoomToFit）/ 重置

## API

| 方法 | 说明 |
|------|------|
| `graph.setZoom(z)` | 设置缩放比例 |
| `graph.zoomToFit(padding?)` | 自适应所有元素 |
| `graph.panTo(x, y)` / `panBy(dx, dy)` | 平移到 / 平移偏移（世界坐标） |
| `graph.getCamera().getZoom()` | 获取当前缩放 |

## 源码

<<< ../../../examples/coordinate/pan-zoom.ts
