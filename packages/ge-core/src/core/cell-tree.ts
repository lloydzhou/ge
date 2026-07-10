import { Cell } from './Cell';

/** 返回直接领域子元素，排除 body、label、marker 等渲染内部节点。 */
export const getCellChildren = (cell: { childNodes?: Iterable<unknown> }): Cell[] =>
  Array.from(cell.childNodes ?? []).filter((child): child is Cell => child instanceof Cell);

/** 深度优先返回领域后代，保持 DOM 子节点顺序。 */
export const getCellDescendants = (cell: { childNodes?: Iterable<unknown> }): Cell[] => {
  const descendants: Cell[] = [];
  const visit = (parent: { childNodes?: Iterable<unknown> }): void => {
    for (const child of getCellChildren(parent)) {
      descendants.push(child);
      visit(child);
    }
  };
  visit(cell);
  return descendants;
};
