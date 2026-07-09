# 快速开始

## 安装

::: code-group

```bash [npm]
npm i @antv/ge @antv/g-lite
```

```bash [pnpm]
pnpm add @antv/ge @antv/g-lite
```

:::

## 第一个图

```html
<!DOCTYPE html>
<html>
<head>
  <script type="importmap">
  {
    "imports": {
      "@antv/ge": "https://unpkg.com/@antv/ge/dist/index.umd.js",
      "@antv/g-lite": "https://unpkg.com/@antv/g-lite/dist/index.umd.js"
    }
  }
  </script>
  <style>#app { width: 800px; height: 600px; border: 1px solid #ddd; }</style>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { Graph } from '@antv/ge';

    const graph = new Graph({ container: 'app', width: 800, height: 600 });

    graph.ready.then(() => {
      graph.addNode({ id: 'a', shape: 'rect', x: 100, y: 200, width: 120, height: 50, label: '节点 A' });
      graph.addNode({ id: 'b', shape: 'circle', x: 400, y: 200, width: 80, height: 80, label: '节点 B' });
      graph.addEdge({ id: 'e1', source: 'a', target: 'b', label: '连接' });
    });
  </script>
</body>
</html>
```

## DOM 风格 API

GE 的 API 靠拢浏览器 DOM：

```ts
// 创建 + 添加（类似 createElement + appendChild）
const node = new Node({ shape: 'rect', x: 100, y: 100 });
graph.appendChild(node);

// 响应式属性（类似 setAttribute）
node.setAttribute('width', 200);
node.setAttribute('angle', 45);

// 事件（类似 addEventListener）
node.addEventListener('click', (e) => console.log('clicked'));
graph.addEventListener('cell:added', (e) => console.log('added', e.detail.cell.id));
```

## 设计哲学

- **数据结构**：借鉴 X6（Markup / Selector / Attrs / stateStyles）
- **交互 API**：靠拢 DOM（setAttribute / appendChild / addEventListener）

| 操作 | ❌ 命令式 | ✅ GE DOM 化 |
|------|---------|-------------|
| 创建节点 | graph.addNode({...}) | graph.appendChild(new Node({...})) |
| 变换 | node.resize(w,h) | node.setAttribute('width', w) |
| 工具 | node.addTools(['resize']) | node.setAttribute('resizable', true) |
| 事件 | graph.on('node:click') | graph.addEventListener('click') |
