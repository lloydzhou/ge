# 内置 Shape

GE 提供 12 个内置 shape，覆盖常见图编辑场景。

## shape 列表

| Shape | 用途 | 示例 |
|-------|------|------|
| `rect` | 矩形（默认，支持 radius 圆角） | 流程框 |
| `circle` | 圆形 | 起止点 |
| `ellipse` | 椭圆 | 状态 |
| `diamond` | 菱形 | 判断 / 决策 |
| `triangle` | 三角形 | 警告 / 方向 |
| `hexagon` | 六边形 | 准备 / 处理 |
| `parallelogram` | 平行四边形 | 数据 / IO |
| `cylinder` | 圆柱 | 数据库 / 存储 |
| `star` | 五角星 | 重要 / 标记 |
| `text` | 纯文本 | 标注（无边框） |
| `cross` | 十字 | 特殊标记 |
| `arrow` | 箭头 | 方向指示 |

## 使用

```ts
// shape 字符串
graph.addNode({ shape: 'diamond', x: 100, y: 100, width: 100, height: 80, label: '判断' });

// rect 支持圆角
graph.addNode({ shape: 'rect', x: 300, y: 100, width: 120, height: 60, radius: 12, label: '圆角' });

// text 无边框
graph.addNode({ shape: 'text', x: 500, y: 100, width: 120, height: 30, label: '纯文本' });
```

## 自定义 Shape

通过 ShapeRegistry 注册：

```ts
import { Path } from '@antv/g-lite';

class MyShape {
  name = 'my-shape';
  create(s) {
    return new Path({ style: { d: '...', fill: s.fill, stroke: s.stroke } });
  }
}

graph.shapeRegistry.register(new MyShape());
graph.addNode({ shape: 'my-shape', x: 100, y: 100 });
```
