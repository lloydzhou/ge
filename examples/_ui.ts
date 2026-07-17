/**
 * 示例共享 UI 工具：在预览舞台内挂载工具条 + 图容器。
 * 供需要按钮/面板的示例使用；纯展示型示例可直接把 container 传给 Graph。
 */

/** 在舞台 host 内创建工具条 + 撑满的图容器 */
export function mountStage(host: HTMLElement) {
  const toolbar = document.createElement('div');
  toolbar.style.cssText =
    'position:absolute;top:10px;right:10px;display:flex;gap:6px;z-index:10;';
  host.appendChild(toolbar);
  const graphDiv = document.createElement('div');
  graphDiv.style.cssText = 'position:absolute;inset:0;';
  host.appendChild(graphDiv);
  return { toolbar, graphDiv };
}

/** 创建一个轻量按钮 */
export function btn(parent: HTMLElement, text: string, onClick: () => void) {
  const b = document.createElement('button');
  b.textContent = text;
  b.style.cssText =
    'padding:6px 12px;border:1px solid #d9d9d9;background:#fff;border-radius:6px;cursor:pointer;font-size:12px;';
  b.addEventListener('click', onClick);
  parent.appendChild(b);
  return b;
}
