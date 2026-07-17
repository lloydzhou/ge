# 模具拖拽 Stencil

左侧模板面板通过 HTML5 拖拽创建节点。`DndPlugin` 注册模板，`dragstart` 写入 `dataTransfer`，拖到画布释放即生成节点。

<ExamplePreview src="plugin/stencil" />

## 操作

将左侧「矩形 / 圆形 / 绿色块」拖到画布空白处释放，即可创建对应节点。

## 用法

```ts
const dnd = graph.use(new DndPlugin());
dnd.registerTemplate({ type: 'rect', props: { width: 120, height: 50, shape: 'rect', label: '矩形' } });

// 模板 DOM 项
el.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/ge-template', 'rect'));
```

## 源码

<<< ../../../examples/plugin/stencil.ts
