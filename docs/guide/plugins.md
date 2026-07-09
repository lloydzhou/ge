# 插件系统

GE 提供 21 个插件，覆盖图编辑器的全部交互能力。

## 安装插件

```ts
import { DragPlugin, SelectionPlugin, HistoryPlugin } from '@antv/ge';

graph.use(new DragPlugin());
graph.use(new SelectionPlugin());
graph.use(new HistoryPlugin());
```

## 节点变换

| 插件 | 用途 |
|------|------|
| `DragPlugin` | 节点拖拽移动 |
| `ResizePlugin` | 8 向尺寸调整（`resizable: true`） |
| `RotatePlugin` | 旋转（`rotatable: true`，`angle` attribute） |

## 选择与交互

| 插件 | 用途 |
|------|------|
| `SelectionPlugin` | 点击选中 + 空白拖拽框选（Shift 多选） |
| `HoverPlugin` | 悬停高亮（节点 + 边） |
| `BoundaryPlugin` | 选中节点虚线外包围框 |

## 连线

| 插件 | 用途 |
|------|------|
| `CreateEdgePlugin` | Alt 拖节点 / 拖 Port 创建边 |
| `VertexPlugin` | 边 waypoint 增删 + 端点重连 + segments |

## 编辑

| 插件 | 用途 |
|------|------|
| `KeyboardPlugin` | Delete / Ctrl+Z/Y/A/C/V/D |
| `ClipboardPlugin` | 复制 / 粘贴 / 克隆 |
| `EditLabelPlugin` | 双击节点 inline 编辑标签 |
| `HistoryPlugin` | 撤销 / 重做（snapshot） |
| `TransformPlugin` | 多选整体平移 |

## 视图

| 插件 | 用途 |
|------|------|
| `ScrollerPlugin` | 滚轮缩放 + 中/右键平移 |
| `MinimapPlugin` | 缩略导航（拖框平移） |
| `GridPlugin` | 背景网格 |
| `SnaplinePlugin` | 对齐辅助线 |

## 其他

| 插件 | 用途 |
|------|------|
| `GroupPlugin` | 分组嵌套 |
| `DndPlugin` | Stencil 拖拽创建 |
| `ContextMenuPlugin` | 右键菜单 |
| `TooltipPlugin` | 悬停提示 |

## 架构

| 基类 | 说明 |
|------|------|
| `OverlayPlugin` | DOM overlay 插件基类（Resize/Rotate/Boundary 继承，DRY） |

## 移除插件

```ts
graph.dispose('drag');
```
