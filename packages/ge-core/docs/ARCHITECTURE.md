# GE (Graph Editor) 架构设计

## 3 层架构概览

```mermaid
graph TB
    subgraph "Layer 1: 渲染引擎 (@antv/g-lite)"
        Canvas["Canvas<br/>画布容器"]
        CustomElement["CustomElement<br/>自定义元素基类"]
        DisplayObject["DisplayObject<br/>显示对象基类"]
    end

    subgraph "Layer 1.5: GE 中间层"
        GEInteractive["GEInteractiveElement<br/>交互元素基类"]
    end

    subgraph "Layer 2: 图编辑原语 (非可视化对象)"
        Router["Router<br/>路由器 - 计算路径点"]
        Connector["Connector<br/>连接器 - 生成图形"]
        Anchor["Anchor<br/>锚点计算 - 连接点位置"]
    end

    subgraph "Layer 3: 可视化元素 (GE)"
        Graph["Graph<br/>图容器"]
        Node["Node<br/>节点"]
        Edge["Edge<br/>边"]
        Port["Port<br/>端口"]
    end

    Canvas -->|"继承"| Graph
    CustomElement -->|"继承"| GEInteractive
    GEInteractive -->|"继承"| Node
    GEInteractive -->|"继承"| Edge
    GEInteractive -->|"继承"| Port
    DisplayObject -->|"继承"| CustomElement
```

## 类继承关系图

```mermaid
classDiagram
    %% g-lite 基础类
    class DisplayObject {
        <<abstract>>
        +getLocalBounds()
        +setPosition()
        +getPosition()
    }

    class CustomElement {
        <<abstract>>
        +connectedCallback()
        +disconnectedCallback()
        +appendChild()
        +removeChild()
    }

    class Canvas {
        +document
        +context
        +renderingPlugins[]
    }

    %% GE 中间层
    class GEInteractiveElement {
        <<abstract>>
        #_isDragging: boolean
        #_dragType: GEInteractionType
        #_dataTransfer: GEDataTransfer
        #_pointerId: number
        #_dragStartPos: [number, number]
        +_getEventPrefix(type): string
        +_createDataTransfer(): GEDataTransfer
        +_findGraphParent(): Graph
        +_emitToGraph(eventName, detail): void
        +_getCanvasPosition(clientX, clientY): [number, number]
        +_endDrag(): void
        +_cancelDrag(): void
        +_handleConnectOver(e): boolean
        +_handleConnectDrop(e): boolean
        +getData(): any
    }

    %% GE 可视化元素
    class Graph {
        +nodesById: Map
        +edgesById: Map
        +eventBus: EventTarget
        +commandHistory: CommandHistory
        +anchorRegistry: AnchorRegistry
        +registerNodeAnchor()
        +registerEdgeAnchor()
        +use()
        +dispose()
        +getNodeById()
        +getEdgeById()
        +getNodes()
        +getEdges()
    }

    class Node {
        -primaryShape: T
        -label: Text
        -data: NodeConfig
        -portsById: Map
        +getPrimaryShape()
        +createPort()
        +computeAnchorForLayout()
        +getId()
        +getData()
    }

    class Edge {
        -primaryShape: T
        -label: Text
        -data: EdgeData
        -sourceNode: EdgeEndpoint
        -targetNode: EdgeEndpoint
        -router: EdgeRouter
        -connector: EdgeConnector
        +connectTo()
        +updatePositionFromNodes()
        +getId()
        +getData()
    }

    class Port {
        -circle: DisplayObject
        -data: PortConfig
        -owner: Node
        -layout: PortLayoutOptions
        +updatePosition()
        +getAbsolutePosition()
        +getRelativePosition()
        +getId()
        +getData()
    }

    %% Layer 2 原语
    class EdgeRouter {
        <<interface>>
        +route(points): Vec2[]
    }

    class EdgeConnector {
        <<interface>>
        +connect(points, style): DisplayObject
    }

    class AnchorRegistry {
        -nodeAnchors: Map
        -edgeAnchors: Map
        +registerNodeAnchor()
        +registerEdgeAnchor()
        +getNodeAnchor()
        +getEdgeAnchor()
    }

    %% 继承关系
    DisplayObject <|-- CustomElement
    CustomElement <|-- GEInteractiveElement
    Canvas <|-- Graph
    GEInteractiveElement <|-- Node
    GEInteractiveElement <|-- Edge
    GEInteractiveElement <|-- Port

    %% 组合关系
    Graph *-- AnchorRegistry : contains
    Graph *-- CommandHistory : contains
    Node "1" *-- "1..*" Port : contains
    Edge "1" --> "1" EdgeRouter : uses
    Edge "1" --> "1" EdgeConnector : uses
    Edge "2" --> "2" Node : connects
```

## Anchor 系统详细设计

```mermaid
graph TB
    subgraph "Anchor 数据结构"
        AnchorPoint["AnchorPoint<br/>x, y: number<br/>tangent: Vec2<br/>normal: Vec2"]
    end

    subgraph "NodeAnchor 预设"
        center["center<br/>中心点"]
        top["top<br/>顶部"]
        bottom["bottom<br/>底部"]
        left["left<br/>左侧"]
        right["right<br/>右侧"]
        angle["angle<br/>角度锚点"]
        absolute["absolute<br/>绝对位置"]
    end

    subgraph "EdgeAnchor 预设"
        start["start<br/>起点"]
        end["end<br/>终点"]
        middle["middle<br/>中点"]
        ratio["ratio<br/>比例位置"]
    end

    subgraph "注册表"
        AnchorRegistry["AnchorRegistry<br/>- nodeAnchors: Map<br/>- edgeAnchors: Map"]
    end

    AnchorPoint --> AnchorRegistry
    center --> AnchorRegistry
    top --> AnchorRegistry
    bottom --> AnchorRegistry
    left --> AnchorRegistry
    right --> AnchorRegistry
    angle --> AnchorRegistry
    absolute --> AnchorRegistry
    start --> AnchorRegistry
    end --> AnchorRegistry
    middle --> AnchorRegistry
    ratio --> AnchorRegistry

    Graph -->|"has a"| AnchorRegistry
    Node -->|"使用"| AnchorRegistry
    Edge -->|"使用"| AnchorRegistry
```

## 边绘制流程

```mermaid
sequenceDiagram
    participant E as Edge
    participant R as Router
    participant C as Connector
    participant G as Graph

    E->>R: route([start, end], vertices)
    R-->>E: routedPoints (路径点)
    E->>C: connect(routedPoints, style)
    C-->>E: primaryShape (DisplayObject)
    E->>E: appendChild(primaryShape)
    E->>E: positionLabel()
    E->>E: updateMarkers()
```

## 节点-端口-边关系

```mermaid
graph LR
    subgraph "Node A"
        NA["Node"]
        P1["Port 1<br/>layout: 'left'"]
        P2["Port 2<br/>layout: 'right'"]
    end

    subgraph "Node B"
        NB["Node"]
        P3["Port 3<br/>layout: 'left'"]
        P4["Port 4<br/>layout: 'right'"]
    end

    E["Edge"]

    NA -.->|"contains"| P1
    NA -.->|"contains"| P2
    NB -.->|"contains"| P3
    NB -.->|"contains"| P4

    E -->|"source"| P2
    E -->|"target"| P3
```

## 事件驱动交互系统

GE 采用事件驱动的交互设计，模仿浏览器原生 Drag-and-Drop API。系统分为两套独立的事件流：

```mermaid
graph TB
    subgraph "交互事件源"
        Node["Node<br/>节点"]
        Port["Port<br/>端口"]
    end

    subgraph "事件派发"
        E1["node:dragstart<br/>开始拖拽节点"]
        E2["node:drag<br/>拖拽中"]
        E3["node:dragend<br/>拖拽结束"]
        E4["connect:start<br/>开始连线"]
        E5["connect:drag<br/>连线拖拽中"]
        E6["connect:end<br/>连线结束"]
    end

    subgraph "事件处理器"
        Graph1["Graph<br/>处理节点移动"]
        Plugin["ConnectionPlugin<br/>处理连线创建"]
        Custom["用户自定义<br/>监听器"]
    end

    Node -->|"派发"| E1
    Node -->|"派发"| E2
    Node -->|"派发"| E3
    Node -->|"派发"| E4
    Node -->|"派发"| E5
    Node -->|"派发"| E6

    Port -->|"派发"| E4
    Port -->|"派发"| E5
    Port -->|"派发"| E6

    E1 --> Graph1
    E2 --> Graph1
    E3 --> Graph1

    E4 --> Plugin
    E5 --> Plugin
    E6 --> Plugin

    E1 -.->|"可选"| Custom
    E4 -.->|"可选"| Custom
```

### 节点拖拽流程

```mermaid
sequenceDiagram
    participant U as User
    participant N as Node
    participant G as Graph
    participant E as EventBus

    U->>N: pointerdown (draggable=true)
    N->>N: _startDrag(NODE_DRAG)
    N->>E: dispatch('node:dragstart')
    E-->>G: on 'node:dragstart'
    G->>G: _handleNodeDragStart()

    U->>N: pointermove
    N->>N: _handlePointerMove()
    N->>E: dispatch('node:drag')
    E-->>G: on 'node:drag'
    G->>N: setPosition(deltaX, deltaY)

    U->>N: pointerup
    N->>N: _handlePointerUp()
    N->>E: dispatch('node:dragend')
    E-->>G: on 'node:dragend'
    G->>G: _handleNodeDragEnd()
```

### 连线创建流程

```mermaid
sequenceDiagram
    participant U as User
    participant S as Source (Node/Port)
    participant E as EventBus
    participant P as ConnectionPlugin
    participant T as Target (Node/Port)

    U->>S: pointerdown (sourceConnectable=true)
    S->>S: _startDrag(CONNECTION)
    S->>E: dispatch('connect:start')
    E-->>P: on 'connect:start'
    P->>P: 创建临时边 (tempEdge)

    U->>S: pointermove
    S->>S: _handlePointerMove()
    S->>E: dispatch('connect:drag', {x, y})
    E-->>P: on 'connect:drag'
    P->>P: 更新临时边位置
    P->>P: 磁力吸附检测

    U->>S: pointerup
    S->>S: _handlePointerUp()
    S->>E: dispatch('connect:end', {x, y})
    E-->>P: on 'connect:end'
    P->>P: 检测目标位置
    P->>T: _canConnectTo(source, target)
    T-->>P: 验证通过
    P->>P: 创建实际边
    P->>P: 移除临时边
```

### 事件类型定义

```typescript
// 交互类型枚举
enum GEInteractionType {
  NODE_DRAG = 'ge:nodedrag',    // 节点拖拽
  CONNECTION = 'ge:connection',  // 连线创建
}

// 数据传输对象（类似浏览器 dataTransfer）
interface GEDataTransfer {
  setData(type: string, data: unknown): void;
  getData(type: string): unknown;
  hasType(type: string): boolean;
  clearData(): void;
  effectAllowed: 'move' | 'copy' | 'link' | 'none';
  dropEffect: 'move' | 'copy' | 'link' | 'none';
}

// 事件详情
interface NodeDragEventDetail {
  type: GEInteractionType;
  source: Node;
  x: number;
  y: number;
  dataTransfer: GEDataTransfer;
}

interface ConnectEventDetail {
  source: Node | Port;
  x: number;
  y: number;
  dataTransfer: GEDataTransfer;
}
```

### 配置示例

```typescript
// 节点配置
const node = graph.addNode({
  id: 'node1',
  x: 100,
  y: 100,

  // 拖拽配置
  draggable: {
    enabled: true,
    onDragStart: (e) => console.log('开始拖拽'),
    onDrag: (e) => console.log('拖拽中'),
  },

  // 作为连线源
  sourceConnectable: {
    enabled: true,
    onDragStart: (e) => console.log('开始连线'),
  },

  // 作为连线目标
  targetConnectable: {
    enabled: true,
    onDragOver: (e) => true,  // 接受悬停
    onDrop: (e) => true,       // 接受放置
  },

  // 连接验证
  connectable: (source, target) => {
    // 自定义验证逻辑
    return source.id !== target.id;
  },
});
```

## 插件系统架构

```mermaid
graph TB
    subgraph "Canvas RenderingPlugin"
        Plugin["RenderingPlugin<br/>{ name, apply, destroy }"]
    end

    subgraph "插件示例"
        CP["ConnectionPlugin<br/>处理连线交互"]
        GP["GridPlugin<br/>绘制网格背景"]
        ZP["ZoomPlugin<br/>缩放控制"]
    end

    Graph["Graph"] -->|"extends"| Canvas
    Graph -->|"use()"| Plugin
    Graph -->|"dispose()"| Plugin
    Plugin -.->|"implemented by"| CP
    Plugin -.->|"implemented by"| GP
    Plugin -.->|"implemented by"| ZP
```

## 核心概念对照表

| 概念 | Layer | 可视化 | 基类 | 作用 |
|------|-------|--------|------|------|
| Canvas | Layer 1 | ✅ | - | 画布容器，DOM 管理 |
| CustomElement | Layer 1 | ✅ | DisplayObject | 自定义元素基类 |
| **GEInteractiveElement** | **Layer 1.5** | **❌** | **CustomElement** | **交互元素基类，共享拖拽逻辑** |
| Graph | Layer 3 | ✅ | Canvas | 图编辑容器，处理 node:drag* |
| Node | Layer 3 | ✅ | GEInteractiveElement | 节点，派发交互事件 |
| Edge | Layer 3 | ✅ | GEInteractiveElement | 边 |
| Port | Layer 3 | ✅ | GEInteractiveElement | 端口/连接桩，只支持连线 |
| Router | Layer 2 | ❌ | (纯类) | 计算路径点 |
| Connector | Layer 2 | ❌ | (纯类) | 生成图形 |
| Anchor | Layer 2 | ❌ | (策略函数) | 计算连接点 |
| ConnectionPlugin | Layer 3 | ❌ | RenderingPlugin | 处理 connect:* 事件 |

## 事件系统对照表（与浏览器 Drag-Drop API 对应）

| 浏览器 API | GE 事件 | 说明 |
|-----------|---------|------|
| `draggable="true"` | `draggable: true` | 标记元素可拖拽 |
| `ondragstart` | `node:dragstart` / `connect:start` | 开始拖拽 |
| `ondrag` | `node:drag` / `connect:drag` | 拖拽中 |
| `ondragend` | `node:dragend` / `connect:end` | 拖拽结束 |
| `ondragover` | `connect:over` | 悬停在目标上 |
| `ondrop` | `connect:drop` | 放置到目标 |
| `dataTransfer` | `GEDataTransfer` | 拖拽数据传输 |

## 设计模式应用

| 模式 | 应用位置 | 说明 |
|------|----------|------|
| 继承模式 | Graph extends Canvas | 复用 Canvas 的渲染能力 |
| **中间层模式** | **GEInteractiveElement** | **共享交互逻辑，减少代码重复** |
| 组合模式 | Node 包含 primaryShape + label + ports | 灵活组合可视化元素 |
| 策略模式 | Router/Connector/Anchor | 可替换的算法实现 |
| 注册表模式 | AnchorRegistry, customElements | 可扩展的组件注册 |
| 观察者模式 | EventBus, 事件派发 | 事件通信，解耦组件 |
| **事件发射器模式** | **Node/Port 派发事件** | **分离事件发射和处理** |
| 插件模式 | RenderingPlugin | 功能扩展，ConnectionPlugin 处理连线 |
