# 编辑动作 Edit

集成剪贴板与连线插件，演示编辑核心动作。

<ExamplePreview src="plugin/edit" :height="460" />

## 操作

- 选中节点后，右上角 **复制 / 粘贴 / 克隆**
- **Alt + 拖拽节点** → 拖出创建新连线
- **Delete** 删除选中 · **Ctrl/Cmd + Z** 撤销
- 选中后出现 **8 向缩放手柄** 与 **旋转手柄**

## 涉及插件

```ts
graph.use(new ClipboardPlugin());   // 复制 / 粘贴 / 克隆
graph.use(new CreateEdgePlugin({ trigger: 'alt' })); // Alt 拖拽连线
graph.use(new ResizePlugin());      // 8 向缩放
graph.use(new RotatePlugin());      // 旋转
graph.use(new KeyboardPlugin());    // Delete / 快捷键
```

## 源码

<<< ../../../examples/plugin/edit.ts
