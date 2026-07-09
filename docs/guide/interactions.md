# 交互能力

## 节点变换

### 旋转

```ts
// 声明式：rotatable attribute
graph.addNode({ shape: 'rect', x: 100, y: 100, width: 120, height: 60, rotatable: true });

// 选中节点 → 显示旋转手柄 → 拖拽旋转
// 或代码控制
node.setAttribute('angle', 45);
```

### Resize

```ts
// 声明式：resizable attribute
graph.addNode({ shape: 'rect', x: 300, y: 100, width: 120, height: 60, resizable: true });

// 选中 → 显示 8 向手柄（4 角 + 4 边）→ 拖拽调整尺寸
```

## 选择

### 框选

空白区域左键拖拽 → 橡皮筋框选。

```ts
graph.use(new SelectionPlugin());
// Shift / Cmd / Ctrl 多选切换
```

## 连线

### Port 连线

```ts
import { Port } from '@antv/ge';

// 节点挂 Port
node.appendChild(new Port({ id: 'p1', layout: 'right' }));

// 直接从 Port 拖出 → 创建边（无需 trigger key）
// 从节点拖出需 Alt（trigger key）
```

### 端点重连

双击边激活 `VertexPlugin`：

- 拖绿色手柄 → 重连 source
- 拖红色手柄 → 重连 target
- 拖边线 → 整段平移（segments）
- 双击边 → 添加 waypoint
- 双击 waypoint → 删除

## 快捷键

`KeyboardPlugin` 提供完整快捷键：

| 快捷键 | 功能 |
|--------|------|
| Delete / Backspace | 删除选中 |
| Ctrl+Z | 撤销 |
| Ctrl+Shift+Z / Ctrl+Y | 重做 |
| Ctrl+A | 全选 |
| Ctrl+C | 复制 |
| Ctrl+V | 粘贴 |
| Ctrl+D | 克隆 |

## 内联编辑

```ts
graph.use(new EditLabelPlugin());
// 双击节点 → input 编辑标签 → 回车确认 / ESC 取消
```
