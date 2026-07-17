---
layout: home

hero:
  name: GE
  text: 图编辑器
  tagline: 基于 AntV/G 的现代化图编辑器，API 靠拢 DOM，数据结构对标 X6
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 示例
      link: /examples/
    - theme: alt
      text: GitHub
      link: https://github.com/lloydzhou/ge

features:
  - icon: 🎯
    title: DOM API 风格
    details: setAttribute / appendChild / addEventListener，开发者知识直接迁移，无需学习命令式 API。
    link: /guide/getting-started
  - icon: 📦
    title: 12 内置 Shape
    details: rect / circle / ellipse / diamond / triangle / hexagon / parallelogram / cylinder / star / text / cross / arrow。
    link: /guide/shapes
  - icon: 🔌
    title: 21 插件
    details: Drag / Resize(8向) / Rotate / Selection(框选) / Hover / CreateEdge / Vertex / Keyboard / Clipboard / History / Minimap / Grid / ... 完整交互体系。
    link: /guide/plugins
  - icon: 🗺️
    title: 完整坐标变换
    details: pan / zoom / 2D 中心缩放 / pickNode 命中检测 / zoomToFit 自适应 / culling 虚拟渲染。
    link: /api/coordinate
  - icon: 🧩
    title: X6 抽象层
    details: ShapeRegistry / Markup+Selector / Attrs / Model，数据结构对标 X6，降低迁移成本。
  - icon: ⚛️
    title: React 支持
    details: "@antv/ge-react 声明式 GraphView，props 变化自动 diff 同步（增/删/改）。"
---

<div class="vp-home-demo">

## 🎬 在线体验

下方是一个**真实渲染的流程图（非截图）**：可拖拽节点、滚轮缩放。点击右上角「全屏交互」获得更大画布。

<ExamplePreview src="home/demo" :height="460" />

> 想看更多能力？前往 [示例库](/examples/) 浏览全部 18 个场景，或阅读 [快速开始](/guide/getting-started)。

</div>
