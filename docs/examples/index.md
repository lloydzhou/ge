# 示例

GE 的能力通过一系列可交互示例展示。所有示例均在浏览器端**实时渲染（SVG）**，可直接拖拽、选中、缩放——所见即所得。

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
  <a class="example-card" href="./edge/router">
    <div class="example-card__icon">/router</div>
    <h3>路由与连接器</h3>
    <p>normal / orthogonal / manhattan × connector 对比。</p>
  </a>
  <a class="example-card" href="./plugin/interaction">
    <div class="example-card__icon">🖱️</div>
    <h3>拖拽与选中</h3>
    <p>拖拽、框选、撤销重做、小地图。</p>
  </a>
  <a class="example-card" href="./plugin/all-features">
    <div class="example-card__icon">✨</div>
    <h3>全功能演示</h3>
    <p>集成全部插件 + A* 避障 / Port / 流动动画。</p>
  </a>
</div>

<style>
.example-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  margin: 24px 0;
}
.example-card {
  display: block;
  padding: 20px;
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
  font-size: 28px;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}
.example-card h3 {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
}
.example-card p {
  margin: 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}
</style>
