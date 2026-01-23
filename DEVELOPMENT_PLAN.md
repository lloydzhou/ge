# GE (Graph Editor) 开发计划

## 当前状态 (2026-01)

### ✅ 已完成
- **架构设计**: 三层架构 (g-lite → 原语 → 可视化元素) 完全实现并验证
- **核心组件**: Graph, Node, Edge, Port 全部实现
- **图编辑原语**: Router, Connector, Anchor 计算全部完成
- **插件系统**: RenderingPlugin 集成完成
- **基础示例**: 3 个完整示例
- **文档更新**: README、CLAUDE.md 与架构对齐

### 📊 实现完整度

| 模块 | 完成度 | 说明 |
|------|--------|------|
| 核心架构 | 100% | Graph, Node, Edge, Port |
| Router 系统 | 100% | Normal, Orthogonal, Manhattan |
| Connector 系统 | 100% | Normal, Polyline, Smooth, Rounded |
| Anchor 计算 | 100% | 支持所有基础形状 |
| Marker 系统 | 100% | 箭头支持 |
| 插件系统 | 80% | ConnectionPlugin 基础完成 |
| 测试覆盖 | 30% | 仅 Graph.test.ts |
| 类型系统 | 85% | 部分 any/ts-ignore |
| 文档 | 90% | README 和示例完善 |

---

## Phase 1: 测试基础设施配置 (1 周)

### 目标
建立完整的测试环境，确保代码质量

### 任务清单

#### 1.1 Jest 配置完善
- [ ] 配置 jest.config.js 支持 TypeScript
- [ ] 配置测试覆盖率阈值 (target: 80%)
- [ ] 配置 CI 集成测试

#### 1.2 测试脚本完善
- [ ] 添加 `test:watch` 脚本
- [ ] 添加 `test:coverage` 脚本
- [ ] 添加 `test:ci` 脚本

#### 1.3 测试工具函数
- [ ] 创建测试工具函数 (testUtils.ts)
  - `createMockGraph()` - 创建测试用 Graph
  - `createMockNode()` - 创建测试用 Node
  - `createMockEdge()` - 创建测试用 Edge
  - `waitForReady()` - 等待 canvas ready

### 验收标准
- ✅ `npm test` 可以正常运行
- ✅ 测试覆盖率报告可生成
- ✅ CI 可以自动运行测试

---

## Phase 2: 类型系统完善 (1 周)

### 目标
移除所有 `any` 和 `@ts-ignore`，建立严格的类型系统

### 任务清单

#### 2.1 核心类型定义
- [ ] 统一 `ShapeType` 类型定义
  ```typescript
  export type ShapeType =
    | 'rect' | 'circle' | 'ellipse' | 'polygon'
    | 'line' | 'path' | 'text'
    | (new () => DisplayObject);
  ```
- [ ] 统一 `EdgeEndpoint` 类型定义
- [ ] 完善 `NodeStyleProps` 和 `EdgeStyleProps`

#### 2.2 移除临时类型处理
- [ ] 移除所有 `as any` 强制转换
- [ ] 移除所有 `@ts-ignore` 注释
- [ ] 为复杂类型添加类型守卫

#### 2.3 类型导出优化
- [ ] 在包顶层导出常用类型
- [ ] 创建 `types.ts` 统一导出入口
- [ ] 添加类型使用示例到文档

### 验收标准
- ✅ 无 `any` 类型（必要的特殊情况除外）
- ✅ 无 `@ts-ignore`
- ✅ `tsc --noEmit` 无错误
- ✅ 类型文档完整

---

## Phase 3: 核心工具函数测试 (1-2 周)

### 目标
为核心工具函数编写完整的单元测试

### 任务清单

#### 3.1 edgeLayout.ts 测试
```typescript
describe('computeAnchor', () => {
  test('should compute anchor at start', () => {});
  test('should compute anchor at end', () => {});
  test('should compute anchor at middle', () => {});
  test('should handle offset along tangent', () => {});
  test('should handle offset along normal', () => {});
  test('should handle segmentIndex', () => {});
  test('should handle degenerate points', () => {});
});
```

#### 3.2 nodeAnchor.ts 测试
```typescript
describe('computeAnchorForShape', () => {
  test('should handle rect shape', () => {});
  test('should handle circle shape', () => {});
  test('should handle ellipse shape', () => {});
  test('should handle polygon shape', () => {});
  test('should handle polyline shape', () => {});
  test('should handle angle layout', () => {});
  test('should handle absolute layout', () => {});
  test('should handle preset layouts', () => {});
  test('should fallback to bounds center', () => {});
});
```

#### 3.3 shapeResolver.ts 测试
```typescript
describe('resolveCtor', () => {
  test('should resolve from customElements registry', () => {});
  test('should return constructor function directly', () => {});
  test('should return null for unknown type', () => {});
  test('should handle invalid context', () => {});
});
```

#### 3.4 Router 测试
```typescript
describe('NormalRouter', () => { /* ... */ });
describe('OrthogonalRouter', () => { /* ... */ });
describe('ManhattanRouter', () => { /* ... */ });
```

#### 3.5 Connector 测试
```typescript
describe('NormalConnector', () => { /* ... */ });
describe('PolylineConnector', () => { /* ... */ });
describe('SmoothConnector', () => { /* ... */ });
describe('RoundedConnector', () => { /* ... */ });
```

### 验收标准
- ✅ 工具函数测试覆盖率 > 90%
- ✅ 所有边界条件有测试覆盖
- ✅ 测试文档完整

---

## Phase 4: 插件系统增强 (2-3 周)

### 目标
完善插件系统，增加交互功能

### 任务清单

#### 4.1 SelectionPlugin 实现
```typescript
export class SelectionPlugin implements RenderingPlugin {
  name = 'selection';

  // 框选功能
  // 多选功能
  // 选中状态管理
  // 键盘快捷键 (Ctrl+A, Esc, Delete)
}
```

#### 4.2 DragPlugin 实现
```typescript
export class DragPlugin implements RenderingPlugin {
  name = 'drag';

  // 节点拖拽
  // 边的端点拖拽
  // 控制点拖拽
  // 拖拽约束 (网格对齐等)
}
```

#### 4.3 ConnectionPlugin 增强
- [ ] 支持虚拟节点创建
- [ ] 支持磁吸连接点
- [ ] 支持连线撤销 (Esc 取消)
- [ ] 优化视觉反馈

#### 4.4 插件开发文档
- [ ] 编写插件开发指南
- [ ] 提供插件模板
- [ ] 添加插件示例

### 验收标准
- ✅ SelectionPlugin 功能完整
- ✅ DragPlugin 功能完整
- ✅ ConnectionPlugin 交互流畅
- ✅ 插件文档完整

---

## Phase 5: 性能优化与稳定性 (2 周)

### 目标
提升性能，解决内存泄漏

### 任务清单

#### 5.1 性能分析
- [ ] 建立性能基准测试
  - 大图渲染 (1000+ 节点)
  - 频繁更新场景
  - 复杂路径计算
- [ ] 使用 Chrome DevTools 分析瓶颈

#### 5.2 渲染优化
- [ ] 实现虚拟渲染 (只渲染可见区域)
- [ ] 批量更新优化
- [ ] 减少不必要的重绘

#### 5.3 内存优化
- [ ] 修复事件监听器泄漏
- [ ] 修复 DisplayObject 引用泄漏
- [ ] 实现对象池模式

#### 5.4 稳定性增强
- [ ] 添加错误边界
- [ ] 添加降级策略
- [ ] 完善错误日志

### 验收标准
- ✅ 1000 节点流畅渲染
- ✅ 无内存泄漏
- ✅ 压力测试通过

---

## Phase 6: 高级编辑功能 (3-4 周)

### 目标
实现高级编辑功能

### 任务清单

#### 6.1 撤销/重做系统
- [ ] 扩展 CommandHistory
- [ ] 实现更多命令类型
  - AddNodeCommand
  - RemoveNodeCommand
  - MoveNodeCommand
  - AddEdgeCommand
  - RemoveEdgeCommand
  - ChangeStyleCommand
- [ ] 添加快捷键支持 (Ctrl+Z, Ctrl+Y)

#### 6.2 布局算法集成
- [ ] DagreLayout (层次布局)
- [ ] ForceLayout (力导向布局)
- [ ] GridLayout (网格布局)
- [ ] 自动布局 API

#### 6.3 控制点编辑
- [ ] 边的控制点可视化
- [ ] 控制点拖拽
- [ ] 曲线编辑

#### 6.4 快捷键体系
- [ ] 快捷键管理器
- [ ] 常用快捷键
  - Delete: 删除选中元素
  - Ctrl+A: 全选
  - Ctrl+C/V: 复制/粘贴
  - Ctrl+D: 快速复制
  - Esc: 取消操作
- [ ] 自定义快捷键 API

#### 6.5 工具栏
- [ ] 工具栏组件
- [ ] 工具选择器
  - 选择工具
  - 节点工具
  - 边工具
  - 文本工具
- [ ] 工具栏配置 API

### 验收标准
- ✅ 撤销/重做功能完整
- ✅ 至少 2 种布局算法
- ✅ 控制点编辑流畅
- ✅ 快捷键体系完整

---

## Phase 7: 生态集成与文档 (2-3 周)

### 目标
建立生态，完善文档

### 任务清单

#### 7.1 React 集成
```typescript
// @antv/ge-react
export function GraphEditor({ data, onReady, ... }) {
  // React 组件封装
}

export function useGraph() {
  // React Hook
}
```

#### 7.2 Vue 集成
```typescript
// @antv/ge-vue
export const GraphEditor = defineComponent({
  // Vue 组件封装
});

export function useGraph() {
  // Vue Composable
}
```

#### 7.3 官方教程
- [ ] 快速开始教程
- [ ] 进阶使用教程
- [ ] 插件开发教程
- [ ] 最佳实践指南
- [ ] API 完整参考

#### 7.4 示例库
- [ ] 流程图编辑器
- [ ] 思维导图编辑器
- [ ] 网络拓扑图
- [ ] UML 类图编辑器
- [ ] 状态机编辑器

#### 7.5 发布准备
- [ ] 完善 CHANGELOG
- [ ] 版本号管理
- [ ] 发布说明
- [ ] 迁移指南

### 验收标准
- ✅ React/Vue 组件可用
- ✅ 教程文档完整
- ✅ 示例库丰富
- ✅ 可正式发布

---

## 时间线总览

| Phase | 内容 | 时间 | 优先级 |
|-------|------|------|--------|
| 1 | 测试基础设施 | 1 周 | 高 |
| 2 | 类型系统完善 | 1 周 | 高 |
| 3 | 核心工具测试 | 1-2 周 | 中 |
| 4 | 插件系统增强 | 2-3 周 | 中 |
| 5 | 性能优化 | 2 周 | 中 |
| 6 | 高级编辑功能 | 3-4 周 | 低 |
| 7 | 生态集成 | 2-3 周 | 低 |

**总计**: 约 12-16 周 (3-4 个月)

---

## 近期可执行任务 (本周可开始)

### 立即可做 (1-2 天)
1. 配置 Jest 测试环境
2. 为 `computeAnchorForShape` 编写第一个测试
3. 创建测试工具函数文件

### 短期任务 (本周)
1. 完成 Phase 1 测试基础设施
2. 开始 Phase 2 类型系统完善
3. 为 edgeLayout.ts 编写测试

### 下周计划
1. 完成 Phase 2
2. 开始 Phase 3 工具函数测试
3. 规划 SelectionPlugin 设计

---

## 备注

- 每个阶段完成后进行一次回顾
- 根据实际情况调整优先级
- 保持架构一致性
- 代码审查必不可少
- 文档与代码同步更新
