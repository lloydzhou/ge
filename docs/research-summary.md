# GE 重构建议：基于 antv/g-lite 和 antv/x6 研究

## 研究结论

### @antv/g-lite 已经提供的能力

经确认，以下 API 在 @antv/g-lite 中**原生支持**，GE 不需要自己实现：

1. **style 属性直接赋值**
   ```typescript
   // ✅ 原生支持
   node.style.width = 120;
   node.style.fill = '#e6f7ff';
   ```

2. **setAttribute/getAttribute**
   ```typescript
   // ✅ 原生支持
   node.setAttribute('data-custom', 'value');
   const value = node.getAttribute('data-custom');
   ```

3. **querySelector/querySelectorAll**
   ```typescript
   // ✅ 原生支持（通过 document）
   graph.document.querySelector('circle');
   graph.document.querySelectorAll('g-node');
   ```

4. **children 属性**
   ```typescript
   // ✅ 原生支持
   const children = node.children;
   ```

5. **getPosition()**
   ```typescript
   // ✅ 原生支持
   const pos = node.getPosition(); // [x, y]
   ```

### antv/x6 的优秀抽象

1. **端口系统**
   - `Port.Manager` - 端口管理器
   - 支持端口组（group）
   - 端口位置配置灵活

2. **工具系统**
   - Tool 基类
   - 内置工具：Selection, Panning, Connecting, Vertices 等
   - 工具激活/停用机制

3. **事件系统**
   - 完整的图编辑器事件：`node:click`, `edge:added` 等
   - 事件命名空间清晰

4. **插件系统**
   - Clipboard, History, Keyboard, Snapline 等内置插件
   - 简洁的插件 API

## 更新后的重构方案

### 阶段 1：充分利用 @antv/g-lite（立即行动）

#### 1.1 移除冗余方法
```typescript
// ❌ 删除这些（DisplayObject 已有）
Node.ts 中的 getPosition()
Node.ts 中的 positionLabel() 的手动计算

// ✅ 直接使用父类方法
node.style.width = 120;  // 直接操作
```

#### 1.2 统一 DOM 接口
```typescript
// ❌ 移除便捷方法
graph.addNode()
graph.addEdge()

// ✅ 统一使用 DOM
graph.appendChild(new Node(...))
```

### 阶段 2：借鉴 x6 的抽象（参考实现）

#### 2.1 改进 Port 系统
```typescript
// 当前 GE 的 Port
class Port extends CustomElement {
  createPort(config)
  getPort(id)
}

// 参考 x6 的设计
class PortManager {
  add(port: Port)
  remove(id: string)
  get(id: string): Port
  getAll(): Port[]
  getPortsByGroup(group: string): Port[]
}
```

#### 2.2 改进工具系统
```typescript
// 参考 x6 的 Tool 基类
abstract class Tool {
  graph: Graph;
  activate(): void;
  deactivate(): void;
  getPosition(): Point;
  setPosition(pos: Point): void;
}

// 内置工具
class SelectionTool extends Tool { }
class ConnectingTool extends Tool { }
```

#### 2.3 改进事件命名
```typescript
// 当前
'node:moved'          // GE 自定义

// 参考 x6 的命名
'node:change:position'  // 更清晰
'node:click'
'edge:added'
```

### 阶段 3：保持 GE 的特色

GE 的独特优势应该保持：
- CommandHistory（撤销/重做）- x6 没有内置
- 插件系统的具体实现
- 与 @antv/g-lite 的深度集成
- 形状解析系统

## 具体实施步骤

### Step 1: 清理冗余代码（1天）

```typescript
// packages/ge-core/src/core/node/Node.ts
// 删除 getPosition() - 使用父类的
// 简化 positionLabel() - 直接操作 style

// packages/ge-core/src/core/Graph.ts
// 移除 addNode/addEdge
```

### Step 2: 暴露原生 API（1天）

```typescript
// 确保 style 可以直接操作
// 确保可以 setAttribute/getAttribute
// 确保 querySelector 可用
```

### Step 3: 参考 x6 改进 Port（2-3天）

```typescript
// 创建 PortManager
// 改进 Port 的创建和使用
// 支持端口组
```

### Step 4: 改进工具系统（3-5天）

```typescript
// 创建 Tool 基类
// 实现基础工具
// 集成到插件系统
```

### Step 5: 更新文档和示例（2天）

```typescript
// 更新 README
// 更新示例代码
// 添加迁移指南
```

## 风险评估

| 风险 | 级别 | 缓解措施 |
|------|------|---------|
| 破坏性变更 | 高 | 分阶段发布，提供兼容层 |
| 性能影响 | 中 | 充分测试验证 |
| 学习曲线 | 中 | 提供迁移指南 |

## 预期收益

1. **代码质量** - 移除 30%+ 冗余代码
2. **API 一致性** - 完全符合 DOM 标准
3. **维护性** - 更容易理解和维护
4. **扩展性** - 借鉴 x6 的优秀设计
5. **用户体验** - 更直观的 API

## 下一步行动

我建议：
1. **先深入研究** - 查看 @antv/g-lite 的源码确认细节
2. **小步快跑** - 先从最简单的改进开始
3. **充分测试** - 每个阶段都有测试覆盖

是否开始深入研究 @antv/g-lite 的源码？
