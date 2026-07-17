# 导出图片 Export

`toDataURL(type)` 将画布栅格化为图片数据 URL。SVG 渲染器会先导出 SVG，再用 canvas 栅格化为真正的 PNG/JPEG。

<ExamplePreview src="data/export" />

## 用法

```ts
const url = await graph.toDataURL('image/png');

// 触发下载
const a = document.createElement('a');
a.href = url;
a.download = 'graph.png';
a.click();
```

> GE 默认 SVG 渲染，`toDataURL` 内部会强制栅格化，确保产出的 `.png` 可被图片查看器正常打开。

## 源码

<<< ../../../examples/data/export.ts
