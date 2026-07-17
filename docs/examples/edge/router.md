# 路由与连接器

同一对节点之间叠加 4 条边，对比不同 **Router（路由）** 与 **Connector（连接器）** 的视觉效果：

- <span style="color:#52c41a">●</span> `normal` / `normal` — 直线
- <span style="color:#1890ff">●</span> `orthogonal` / `rounded` — 正交路由 + 直角圆滑
- <span style="color:#722ed1">●</span> `manhattan` / `rounded` — 曼哈顿 Z 形路由
- <span style="color:#fa541c">●</span> `manhattan` / `smooth` — 曼哈顿 + 平滑连接

<ExamplePreview src="edge/router" />

## Router（路径走向）

| router | 说明 |
|--------|------|
| `normal` | 直线，两端点直接相连 |
| `orthogonal` | 正交，路径仅含水平/垂直段 |
| `manhattan` | 曼哈顿 Z 形，可绕开节点 |
| `manhattan-astar` | A\* 避障，自动绕开障碍节点 |

## Connector（连线形态）

| connector | 说明 |
|-----------|------|
| `normal` | 直线段 |
| `rounded` | 直角处圆角 |
| `smooth` | 三次贝塞尔曲线 |

## 源码

<<< ../../../examples/edge/router.ts
