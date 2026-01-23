# GE 重构方案：完全继承 antv/g 模式

## 🎯 重构目标

将 GE 重新定位为 **@antv/g-lite 的图编辑器扩展**，而非独立的图编辑库：
- 充分利用 CustomElement/Canvas 提供的 DOM 接口
- 移除与 @antv/g-lite 功能重复的实现
- 只保留图编辑器特有的业务逻辑
- 统一使用 DOM 风格 API

## 📊 当前问题分析

### 1. 接口不一致问题

| 当前状态 | 问题 | 应该改为 |
|---------|------|----------|
| `graph.addNode(nodeData)` | 非 DOM 接口 | `graph.appendChild(new Node(nodeData))` |
| `graph.addEdge(edgeData)` | 非 DOM 接口 | `graph.appendChild(new Edge(edgeData))` |
| `node.getPosition()` | 重复实现 | 直接用 `DisplayObject.getPosition()` |
| `node.style.width = 100` | 不支持 | 应该直接支持（通过父类） |

### 2. 冗余实现清单

#### Node.ts (`packages/ge-core/src/core/node/Node.ts`)

```typescript
// ❌ 冗余：重复实现位置计算
getPosition(): [number, number] {
  const x = Number((this as any).x) || Number(this.data?.x) || 0;
  const y = Number((this as any).y) || Number(this.data?.y) || 0;
  const transform = this.getLocalTransform();
  // ...复杂的 transform 解析
}

// ✅ 应该：直接使用父类方法
// DisplayObject 已经提供了 getPosition()
```

```typescript
// ❌ 冗余：手动位置标签
private positionLabel(): void {
  const shape = this.primaryShape;
  const style = shape.style;
  // 手动计算中心位置...
  this.label.setLocalPosition([x + width / 2, y + height / 2]);
}

// ✅ 应该：使用 DisplayObject 的布局能力
// 或者让 label 自动居中（通过 CSS-like 样式）
```

#### Edge.ts (`packages/ge-core/src/core/edge/Edge.ts`)

```typescript
// ❌ 冗余：手动获取边点
private getEdgePoints(): Vec2[] {
  if (this.primaryShape instanceof Line) {
    const x1 = Number(this.primaryShape.style.x1) || 0;
    // ...手动解析
  }
}

// ✅ 应该：直接使用 DisplayObject 的 API
// Line/Polyline 应该提供获取路径点的方法
```

#### Graph.ts (`packages/ge-core/src/core/Graph.ts`)

```typescript
// ❌ 非DOM 接口
addNode(nodeData: Partial<NodeData> & { id: string }): Node {
  const node = new Node(nodeData);
  this.appendChild(node);
  return node;
}

// ✅ 统一 DOM 接口
// 用户直接使用：graph.appendChild(new Node(nodeData))
```

## 🔧 重构方案

### 阶段 1：接口统一（高优先级）

#### 1.1 移除便捷方法，统一 DOM 接口

**影响文件**: `Graph.ts`

```typescript
// 移除这些方法
- addNode()
- removeNode()
- addEdge()
- removeEdge()

// 保留注册表管理（在 appendChild/removeChild 中自动处理）
registerNode() / unregisterNode()
registerEdge() / unregisterEdge()
```

**使用方式变化**:

```typescript
// 旧方式
const node = graph.addNode({ id: 'n1', x: 100, y: 100 });
graph.removeNode('n1');

// 新方式（纯 DOM）
const node = new Node({ id: 'n1', x: 100, y: 100 });
graph.appendChild(node);
graph.removeChild(node);
```

#### 1.2 暴露真正的 style 属性

**影响文件**: `Node.ts`, `Edge.ts`, `Port.ts`

确保 `style` 属性可以像 DOM 一样操作：

```typescript
// 应该支持
node.style.width = 120;
node.style.fill = '#e6f7ff';
node.style.stroke = '#1890ff';

// 当前需要改为
node.getData().style.width = 120; // 这是间接访问
```

**实现方式**: 直接操作底层 DisplayObject 的 style

#### 1.3 实现 setAttribute/getAttribute

**影响文件**: 基类需要新增

```typescript
// CustomElement 可能没有直接提供，需要实现
setAttribute(name: string, value: string): void {
  (this as any)[name] = value;
}

getAttribute(name: string): string | null {
  return (this as any)[name] || null;
}
```

### 阶段 2：删除冗余实现（中优先级）

#### 2.1 简化 Node.ts

```typescript
// 移除 getPosition() - 使用父类的
// 简化 positionLabel() - 使用 DisplayObject 布局
// 删除手动的事件分发 - 使用 CustomElement 事件
```

#### 2.2 简化 Edge.ts

```typescript
// 移除 getEdgePoints() - 使用 DisplayObject 方法
// 简化 updatePositionFromNodes() - 利用事件自动更新
```

#### 2.3 优化事件系统

```typescript
// 当前：手动监听 node:moved 事件
// 优化：使用 CustomElement 的 attribute 变化监听
// 或者完全依赖 @antv/g-lite 的事件冒泡
```

### 阶段 3：完善 DOM API（低优先级）

#### 3.1 暴露 children 属性

```typescript
// CustomElement 应该有，确保可用
get children(): DisplayObject[] {
  return super.children || [];
}
```

#### 3.2 实现 querySelector/querySelectorAll

```typescript
// 需要安装 @antv/g-plugin-css-select
// 或者提供简单的实现
querySelector(selector: string): Element | null {
  // 实现 CSS 选择器
}

querySelectorAll(selector: string): Element[] {
  // 实现批量选择
}
```

## 📁 影响文件清单

### 核心修改

1. **Graph.ts** - 移除 addNode/addEdge，优化 appendChild/removeChild
2. **Node.ts** - 删除冗余方法，简化为代理到 DisplayObject
3. **Edge.ts** - 删除冗余方法，简化事件处理
4. **Port.ts** - 简化位置计算

### 新增文件

5. **README.md** - 更新 API 示例
6. **examples/** - 更新所有示例使用新 API
7. **migration-guide.md** - 迁移指南

### 测试更新

8. **所有测试文件** - 更新测试用例

## 🔄 迁移路径

### 用户代码迁移

```typescript
// === 旧 API ===
const node = graph.addNode({ id: 'n1', x: 100 });
graph.addEdge({ id: 'e1', source: 'n1', target: 'n2' });

// === 新 API ===
const node = new Node({ id: 'n1', x: 100 });
graph.appendChild(node);
const edge = new Edge({ id: 'e1', source: 'n1', target: 'n2' });
graph.appendChild(edge);
```

### 向后兼容（可选）

可以保留便捷方法作为 **别名**：

```typescript
/** @deprecated 使用 appendChild 代替 */
addNode(nodeData: NodeData): Node {
  console.warn('addNode is deprecated, use appendChild instead');
  return this.appendChild(new Node(nodeData)) as Node;
}
```

## ⚠️ 风险评估

### 高风险区域

1. **破坏性变更** - 所有用户代码需要更新
2. **事件系统重构** - 可能影响现有插件
3. **性能影响** - 需要验证简化后的性能

### 缓解措施

1. 分阶段发布，保留过渡期
2. 提供自动化迁移工具
3. 充分的测试覆盖

## 📅 实施计划

### Phase 1: 设计与评审（1周）
- [ ] 详细设计方案评审
- [ ] 社区反馈收集
- [ ] 确定最终方案

### Phase 2: 核心重构（2-3周）
- [ ] Graph.ts 重构
- [ ] Node.ts 重构
- [ ] Edge.ts 重构
- [ ] 基础测试更新

### Phase 3: 完善与文档（1周）
- [ ] README 更新
- [ ] 示例更新
- [ ] 迁移指南

### Phase 4: 测试与发布（1周）
- [ ] 全面测试
- [ ] 性能验证
- [ ] 发布 alpha 版本

## 🎯 成功标准

1. ✅ API 完全符合 DOM 风格
2. ✅ 代码量减少 30% 以上
3. ✅ 性能不降低
4. ✅ 向后兼容路径清晰
5. ✅ 文档完整更新
