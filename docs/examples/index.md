# 示例

GE 的能力通过一系列可交互示例展示。所有示例均在浏览器端**实时渲染（SVG）**，可直接拖拽、选中、缩放——所见即所得。

## 节点

<div class="example-grid">
  <a class="example-card" href="./node/basic">
    <div class="example-card__icon">🟦</div>
    <h3>基础渲染</h3>
    <p>3 节点 + 3 边，perimeter 锚点与 connector。</p>
  </a>
  <a class="example-card" href="./node/shapes">
    <div class="example-card__icon">⬣</div>
    <h3>内置 Shape</h3>
    <p>12 个内置形状一览（rect / circle / star ...）。</p>
  </a>
  <a class="example-card" href="./node/group">
    <div class="example-card__icon">⊟</div>
    <h3>分组 Group</h3>
    <p>分组 embed，拖动分组组内节点整体跟随。</p>
  </a>
</div>

## 边

<div class="example-grid">
  <a class="example-card" href="./edge/router">
    <div class="example-card__icon">/router</div>
    <h3>路由与连接器</h3>
    <p>normal / orthogonal / manhattan × connector 对比。</p>
  </a>
  <a class="example-card" href="./edge/port">
    <div class="example-card__icon">⦿</div>
    <h3>端口连接</h3>
    <p>Port 挂载 + ratio 锚点精确定位连接点。</p>
  </a>
</div>

## 交互插件

<div class="example-grid">
  <a class="example-card" href="./plugin/interaction">
    <div class="example-card__icon">🖱️</div>
    <h3>拖拽与选中</h3>
    <p>拖拽、框选、撤销重做、小地图。</p>
  </a>
  <a class="example-card" href="./plugin/snapline">
    <div class="example-card__icon">┃</div>
    <h3>对齐辅助线</h3>
    <p>拖拽时显示对齐参考线。</p>
  </a>
  <a class="example-card" href="./plugin/edit">
    <div class="example-card__icon">✂️</div>
    <h3>编辑动作</h3>
    <p>复制 / 粘贴 / 克隆 / Alt 连线。</p>
  </a>
  <a class="example-card" href="./plugin/stencil">
    <div class="example-card__icon">◧</div>
    <h3>模具拖拽</h3>
    <p>HTML5 拖拽模板创建节点。</p>
  </a>
  <a class="example-card" href="./plugin/all-features">
    <div class="example-card__icon">✨</div>
    <h3>全功能演示</h3>
    <p>全部插件 + A* 避障 / Port / 流动动画。</p>
  </a>
</div>

## 布局

<div class="example-grid">
  <a class="example-card" href="./layout/grid">
    <div class="example-card__icon">⊞</div>
    <h3>布局算法</h3>
    <p>网格 / 环形 / 力导向 / 层次一键切换。</p>
  </a>
</div>

## 坐标变换

<div class="example-grid">
  <a class="example-card" href="./coordinate/pan-zoom">
    <div class="example-card__icon">🔍</div>
    <h3>平移与缩放</h3>
    <p>滚轮缩放、空白拖拽平移、zoomToFit。</p>
  </a>
</div>

## 数据导出

<div class="example-grid">
  <a class="example-card" href="./data/serialize">
    <div class="example-card__icon">{ }</div>
    <h3>序列化</h3>
    <p>toJSON 导出 / fromJSON 恢复整图。</p>
  </a>
  <a class="example-card" href="./data/export">
    <div class="example-card__icon">🖼️</div>
    <h3>导出图片</h3>
    <p>toDataURL 栅格化为 PNG 下载。</p>
  </a>
</div>

## React

<div class="example-grid">
  <a class="example-card" href="./react/basic">
    <div class="example-card__icon">⚛️</div>
    <h3>GraphView</h3>
    <p>声明式 &lt;GraphView&gt;，props diff 自动同步。</p>
  </a>
</div>

<style>
.example-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
  margin: 16px 0 28px;
}
.example-card {
  display: block;
  padding: 18px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}
.example-card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}
.example-card__icon {
  font-size: 26px;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}
.example-card h3 {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
}
.example-card p {
  margin: 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}
</style>
