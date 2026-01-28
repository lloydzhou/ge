# GE vs X6 Feature Comparison & TODO List

## Overview

This document provides a comprehensive comparison between GE (Graph Editor) and AntV X6, identifying gaps and creating a prioritized TODO list for future development.

---

## Part 1: Feature Comparison Table

| Feature Category | AntV X6 | GE Status | Gap Priority |
|-----------------|---------|-----------|--------------|
| **Core Elements** |
| Node (基础节点) | ✅ Full | ✅ Full (with generic shapes) | - |
| Edge (边) | ✅ Full | ✅ Full (with Router/Connector) | - |
| Port (端口) | ✅ Full | ✅ Full (with layout system) | - |
| Group (分组) | ✅ Full | ❌ Not Implemented | 🔴 High |
| Cell (基础元素) | ✅ Base class | ✅ GEInteractiveElement | - |
| **Interactions** |
| Dragging (拖拽) | ✅ Full | ✅ Full (MovePlugin) | - |
| Connecting (连线) | ✅ Full | ✅ Full (ConnectionPlugin) | - |
| Selection (选择) | ✅ Full (multi/box) | ⚠️ Partial (only single) | 🟡 Medium |
| Resizing (调整大小) | ✅ Full | ❌ Not Implemented | 🟡 Medium |
| Rotating (旋转) | ✅ Full | ❌ Not Implemented | 🟢 Low |
| Embedding (嵌入) | ✅ Full | ❌ Not Implemented | 🟢 Low |
| **Tools** |
| Dnd (拖放面板) | ✅ Plugin | ❌ Not Implemented | 🟡 Medium |
| Clipboard (剪贴板) | ✅ Plugin | ❌ Not Implemented | 🟡 Medium |
| History (撤销重做) | ✅ Plugin | ⚠️ Partial (Command exists) | 🔴 High |
| Keyboard (快捷键) | ✅ Plugin | ❌ Not Implemented | 🟡 Medium |
| Scroller (缩放平移) | ✅ Plugin | ❌ Not Implemented | 🔴 High |
| Minimap (小地图) | ✅ Plugin | ❌ Not Implemented | 🟢 Low |
| Snapline (对齐线) | ✅ Plugin | ❌ Not Implemented | 🟡 Medium |
| Stencil (组件库) | ✅ Plugin | ❌ Not Implemented | 🟡 Medium |
| Transform (变换控制) | ✅ Plugin | ❌ Not Implemented | 🟡 Medium |
| Export (导出) | ✅ Plugin | ❌ Not Implemented | 🟡 Medium |
| **Labels & Markers** |
| Node Labels | ✅ Single | ✅ Single (ItemLabelElement) | - |
| Edge Labels | ✅ Multiple | ✅ Multiple (ItemLabelElement) | - |
| Label Positioning | ✅ Full | ✅ Full (distance/offset/angle) | - |
| Markers (箭头) | ✅ Full | ✅ Full (EdgeMarker) | - |
| Label Editing | ✅ Inline | ⚠️ Partial (contenteditable) | 🟢 Low |
| **Routers** |
| Normal (直线) | ✅ | ✅ (NormalRouter) | - |
| Orthogonal (正交) | ✅ | ✅ (OrthogonalRouter) | - |
| Manhattan (曼哈顿) | ✅ | ⚠️ Referenced only | 🟢 Low |
| One Way (单行道) | ✅ | ❌ Not Implemented | 🟢 Low |
| ER (实体关系) | ✅ | ❌ Not Implemented | 🟢 Low |
| Metro (地铁风格) | ✅ | ❌ Not Implemented | 🟢 Low |
| **Connectors** |
| Line | ✅ | ✅ (NormalConnector) | - |
| Polyline | ✅ | ✅ (PolylineConnector) | - |
| Smooth (贝塞尔) | ✅ | ✅ (SmoothConnector) | - |
| Rounded (圆角) | ✅ | ✅ (RoundedConnector) | - |
| Jump (跳线) | ✅ | ❌ Not Implemented | 🟢 Low |
| **Anchors** |
| Node Anchors | ✅ Presets | ✅ Presets (nodeAnchor.ts) | - |
| Edge Anchors | ✅ Presets | ✅ Presets (edgeLayout.ts) | - |
| Custom Anchors | ✅ Registry | ✅ Registry | - |
| **Events** |
| DOM Events | ✅ Full | ✅ Full (CustomEvent) | - |
| Node Events | ✅ Full | ✅ Full | - |
| Edge Events | ✅ Full | ✅ Full | - |
| Connection Events | ✅ Full | ✅ Full | - |
| **Data & Serialization** |
| toJSON | ✅ Full | ⚠️ Basic (getData) | 🟡 Medium |
| fromJSON | ✅ Full | ⚠️ Basic (setData) | 🟡 Medium |
| Diff Export | ✅ | ❌ Not Implemented | 🟢 Low |
| **Layouts** |
| GridLayout | ✅ Package | ❌ Not Integrated | 🟡 Medium |
| DAGLayout | ✅ Package | ❌ Not Integrated | 🟡 Medium |
| TreeLayout | ✅ Package | ❌ Not Integrated | 🟢 Low |
| ForceLayout | ✅ Package | ❌ Not Integrated | 🟢 Low |
| CircleLayout | ✅ Package | ❌ Not Integrated | 🟢 Low |
| **Advanced Features** |
| Animation | ✅ Full | ❌ Not Implemented | 🟢 Low |
| Virtual Rendering | ✅ For large graphs | ❌ Not Implemented | 🟢 Low |
| React/Vue Integration | ✅ Full | ❌ Not Implemented | 🟢 Low |
| Validation Rules | ✅ Full | ⚠️ Basic only | 🟡 Medium |

**Legend:**
- ✅ Full - Fully implemented
- ⚠️ Partial - Partially implemented or needs enhancement
- ❌ Not Implemented - Feature missing
- 🔴 High - Critical gap, high priority
- 🟡 Medium - Important gap, medium priority
- 🟢 Low - Nice to have, low priority

---

## Part 2: Detailed Comparison by Category

### 2.1 Architecture & Rendering

**X6:**
- Based on HTML/SVG rendering
- Canvas-based with direct DOM manipulation
- Component-based with registration system

**GE:**
- Based on @antv/g-lite (Canvas-based rendering engine)
- CustomElement-based architecture
- Generic shape support (extensible)
- Cleaner separation: GEInteractiveElement → ItemElement/ItemToolElement

**Verdict:** GE has a **more modern, type-safe architecture** with better abstractions.

### 2.2 Plugin System

**X6 (v3.x):**
```javascript
import { Selection, Dnd, Clipboard, History, Keyboard,
         Minimap, Scroller, Stencil, Snapline, Transform } from '@antv/x6'
```
All plugins are in the main package, easy to use.

**GE:**
- Uses @antv/g-lite's RenderingPlugin system
- Currently has: ConnectionPlugin, MovePlugin
- Plugin system is more flexible but less batteries-included

**Verdict:** X6 has **more built-in plugins**. GE needs plugin development.

### 2.3 Tool System

**X6:**
- Dnd tool for drag-and-drop from palette
- Stencil for component library
- Selection tool (box selection, multi-select)
- Transform tool (resize, rotate handles)

**GE:**
- ItemToolElement abstraction for tools
- No Dnd/Stencil/Selection/Transform tools yet
- Has ButtonRemove, NodeEditor concepts (proposed)

**Verdict:** X6 has **complete tool ecosystem**. GE needs tool implementation.

### 2.4 Selection System

**X6:**
- Single click selection
- Ctrl/Cmd + click for multi-selection
- Box selection (drag to select area)
- Selection state management

**GE:**
- Basic click selection (via DOM events)
- No multi-selection
- No box selection
- No selection state management

**Gap:** 🔴 High - Critical for UX

### 2.5 Undo/Redo (History)

**X6:**
```javascript
import { History } from '@antv/x6'
const history = new History({ enabled: true })
graph.use(history)

graph.undo()
graph.redo()
graph.canUndo()
```

**GE:**
- Command interface exists (AddNodeCommand, RemoveNodeCommand, etc.)
- CommandHistory class exists but not fully implemented
- No HistoryPlugin

**Gap:** 🔴 High - Core editing feature

### 2.6 Viewport & Navigation

**X6 (Scroller plugin):**
- Pan (drag canvas)
- Zoom (mouse wheel, buttons)
- Auto-center content
- Minimap navigation

**GE:**
- None of these features
- Would need ScrollerPlugin

**Gap:** 🔴 High - Essential for large graphs

### 2.7 Clipboard (Copy/Paste)

**X6:**
```javascript
import { Clipboard } from '@antv/x6'
const clipboard = new Clipboard()
graph.use(clipboard)

// Cmd/Ctrl + C to copy
// Cmd/Ctrl + V to paste
// Cmd/Ctrl + X to cut
```

**GE:**
- Not implemented

**Gap:** 🟡 Medium - Important productivity feature

### 2.8 Keyboard Shortcuts

**X6:**
```javascript
import { Keyboard } from '@antv/x6'
const keyboard = new Keyboard({
  allowed: true
})
graph.use(keyboard)

// Bind keys
graph.bindKey(['meta+c', 'ctrl+c'], () => {
  graph.copy(cells)
})
```

**GE:**
- Not implemented

**Gap:** 🟡 Medium - UX improvement

### 2.9 Alignment Guides (Snapline)

**X6:**
- Real-time alignment lines during drag
- Shows distance between elements
- Helps with precise positioning

**GE:**
- Not implemented
- MovePlugin has grid snapping but no visual guides

**Gap:** 🟡 Medium - Visual UX improvement

### 2.10 Resize & Transform Controls

**X6:**
- Resize handles on nodes
- Rotate handles
- Constraint configuration (min/max size)
- Visual feedback during transform

**GE:**
- Not implemented
- No resize handles
- No rotate handles

**Gap:** 🟡 Medium - Common diagramming need

### 2.11 Drag & Drop (Dnd/Stencil)

**X6:**
- Stencil: component palette
- Drag from palette to canvas
- Dnd tool for custom drag sources

**GE:**
- Not implemented
- Would be useful for node palettes

**Gap:** 🟡 Medium - Important for diagram editors

### 2.12 Group (Container Nodes)

**X6:**
- Parent-child relationships
- Nested nodes
- Boundary constraints
- Group collapsing/expanding

**GE:**
- Not implemented
- Would need Group element extending ItemElement

**Gap:** 🔴 High - Core diagramming feature

### 2.13 Serialization

**X6:**
```javascript
// Export
const data = graph.toJSON()

// Import
graph.fromJSON(data)

// Differential export
const diffData = graph.toJSON({ diff: true })
```

**GE:**
- Basic `getData()` / `setData()`
- No differential export
- No format options

**Gap:** 🟡 Medium - Enhancement needed

### 2.14 Layout Algorithms

**X6:**
```javascript
import { DagreLayout } from '@antv/layout'
const layout = new DagreLayout({
  type: 'dagre',
  rankdir: 'TB'
})
const model = layout.layout(graph.toJSON())
graph.fromJSON(model)
```

**GE:**
- Layout algorithms exist in @antv/layout
- Not integrated into GE
- Would need layout plugin/integration

**Gap:** 🟡 Medium - Integration work needed

### 2.15 Validation System

**X6:**
```javascript
connecting: {
  allowMulti: false,
  allowLoop: false,
  allowNode: false,
  allowEdge: false,
  validateConnection({ source, target }) {
    return true/false
  }
}
```

**GE:**
- Basic connection validation via `style.linkto`
- ConnectionPlugin handles edge creation with validation
- Validation through event delegation (check style properties)

**Gap:** 🟡 Medium - Enhancement needed

---

## Part 3: Prioritized TODO List

### 🔴 HIGH PRIORITY (Critical Features)

#### 1. Selection System
**Description:** Implement multi-selection and box selection for nodes/edges.

**Tasks:**
- [ ] Create `SelectionPlugin` class
- [ ] Implement single-click selection (already works via DOM)
- [ ] Implement Ctrl/Cmd + click for multi-selection
- [ ] Implement box selection (drag rectangle)
- [ ] Add visual feedback for selected elements
- [ ] Add `getSelectedCells()`, `select(cell)`, `unselect(cell)`, `selectAll()`, `clearSelection()` methods

**Files to Create:**
- `packages/ge-core/src/plugins/SelectionPlugin.ts`

**Estimated Effort:** 3-4 days

---

#### 2. Scroller Plugin (Viewport Navigation)
**Description:** Implement pan and zoom functionality with mouse wheel and drag.

**Tasks:**
- [ ] Create `ScrollerPlugin` class
- [ ] Implement pan (drag canvas, mouse wheel pan)
- [ ] Implement zoom (mouse wheel, pinch gesture)
- [ ] Add zoom buttons (+/-)
- [ ] Add fit-to-content functionality
- [ ] Add min/max zoom limits
- [ ] Coordinate system transformation

**Files to Create:**
- `packages/ge-core/src/plugins/ScrollerPlugin.ts`

**Estimated Effort:** 4-5 days

---

#### 3. History Plugin (Undo/Redo)
**Description:** Complete the undo/redo system using existing Command infrastructure.

**Tasks:**
- [ ] Create `HistoryPlugin` class using existing CommandHistory
- [ ] Ensure all mutations use commands (AddNodeCommand, etc.)
- [ ] Add `undo()`, `redo()`, `canUndo()`, `canRedo()` methods to Graph
- [ ] Add keyboard shortcuts (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z)
- [ ] Track history stack limit

**Files to Modify:**
- `packages/ge-core/src/core/CommandHistory.ts` (complete implementation)
- `packages/ge-core/src/plugins/HistoryPlugin.ts` (create)

**Estimated Effort:** 3-4 days

---

#### 4. Group Element
**Description:** Implement container nodes that can contain other nodes.

**Tasks:**
- [ ] Create `Group<TShape>` class extending ItemElement
- [ ] Implement parent-child relationships
- [ ] Add boundary constraints (children stay inside parent)
- [ ] Implement group collapsing/expanding
- [ ] Add `addGroup()`, `getGroups()`, `ungroup()` methods

**Files to Create:**
- `packages/ge-core/src/core/group/Group.ts`

**Estimated Effort:** 5-6 days

---

### 🟡 MEDIUM PRIORITY (Important Features)

#### 5. Clipboard Plugin (Copy/Paste)
**Description:** Implement copy, cut, and paste functionality.

**Tasks:**
- [ ] Create `ClipboardPlugin` class
- [ ] Implement `copy(cells)`, `cut(cells)`, `paste(options)` methods
- [ ] Add keyboard shortcuts (Ctrl/Cmd+C, X, V)
- [ ] Handle ID regeneration on paste
- [ ] Offset pasted content from original

**Files to Create:**
- `packages/ge-core/src/plugins/ClipboardPlugin.ts`

**Estimated Effort:** 2-3 days

---

#### 6. Keyboard Plugin
**Description:** Implement keyboard shortcut system.

**Tasks:**
- [ ] Create `KeyboardPlugin` class
- [ ] Implement key binding system
- [ ] Add modifier key support (Ctrl, Shift, Alt, Meta)
- [ ] Prevent default browser behavior when needed
- [ ] Bind common shortcuts (delete, undo, redo, etc.)

**Files to Create:**
- `packages/ge-core/src/plugins/KeyboardPlugin.ts`

**Estimated Effort:** 2 days

---

#### 7. Snapline Plugin (Alignment Guides)
**Description:** Show alignment lines during drag operations.

**Tasks:**
- [ ] Create `SnaplinePlugin` class
- [ ] Detect alignment with other elements
- [ ] Draw horizontal/vertical guide lines
- [ ] Show distance between elements
- [ ] Performance optimization for large graphs

**Files to Create:**
- `packages/ge-core/src/plugins/SnaplinePlugin.ts`

**Estimated Effort:** 3-4 days

---

#### 8. Transform Plugin (Resize/Rotate)
**Description:** Add visual resize and rotate handles to nodes.

**Tasks:**
- [ ] Create `TransformPlugin` class
- [ ] Draw resize handles on selected nodes
- [ ] Implement drag-to-resize functionality
- [ ] Add rotate handle
- [ ] Add min/max size constraints
- [ ] Add aspect ratio lock option

**Files to Create:**
- `packages/ge-core/src/plugins/TransformPlugin.ts`

**Estimated Effort:** 4-5 days

---

#### 9. Dnd Plugin (Drag & Drop)
**Description:** Enable drag-and-drop from external palettes.

**Tasks:**
- [ ] Create `DndPlugin` class
- [ ] Accept drag events from external sources
- [ ] Create preview during drag
- [ ] Drop to create nodes
- [ ] Support custom drag sources

**Files to Create:**
- `packages/ge-core/src/plugins/DndPlugin.ts`

**Estimated Effort:** 3 days

---

#### 10. Stencil Plugin (Component Palette)
**Description:** Create component library palette for drag-and-drop.

**Tasks:**
- [ ] Create `StencilPlugin` class
- [ ] Render component list
- [ ] Search/filter functionality
- [ ] Categories/groups
- [ ] Collapsible sections

**Files to Create:**
- `packages/ge-core/src/plugins/StencilPlugin.ts`

**Estimated Effort:** 4-5 days

---

#### 11. Enhanced Serialization
**Description:** Improve toJSON/fromJSON with more options.

**Tasks:**
- [ ] Add differential export (only changed cells)
- [ ] Add format options (pretty print, compact)
- [ ] Add export options (exclude certain properties)
- [ ] Add import validation
- [ ] Add migration support (version compatibility)

**Files to Modify:**
- `packages/ge-core/src/core/Graph.ts` (getData/setData methods)

**Estimated Effort:** 2-3 days

---

#### 12. Validation System
**Description:** Comprehensive connection and interaction validation.

**Tasks:**
- [ ] Add `allowMulti` option (multiple edges between same nodes)
- [ ] Add `allowLoop` option (self-loops)
- [ ] Add `allowNode` option (node-to-node edges)
- [ ] Add `allowEdge` option (edge-to-edge connections)
- [ ] Add `validateConnection` callback function

**Files to Modify:**
- `packages/ge-core/src/types/index.ts` (add validation types)
- `packages/ge-core/src/plugins/ConnectionPlugin.ts` (implement validation)

**Estimated Effort:** 2 days

---

#### 13. Layout Integration
**Description:** Integrate @antv/layout algorithms.

**Tasks:**
- [ ] Create layout adapter for @antv/layout
- [ ] Add `layout(options)` method to Graph
- [ ] Support DagreLayout, GridLayout, ForceLayout
- [ ] Animate layout transitions
- [ ] Save/restore original positions

**Files to Create:**
- `packages/ge-core/src/utils/layoutAdapter.ts`

**Estimated Effort:** 3-4 days

---

### 🟢 LOW PRIORITY (Nice to Have)

#### 14. Minimap Plugin
**Description:** Navigation viewport for large graphs.

**Tasks:**
- [ ] Create `MinimapPlugin` class
- [ ] Render miniature version of graph
- [ ] Show current viewport rectangle
- [ ] Click/drag to navigate
- [ ] Auto-update on graph changes

**Files to Create:**
- `packages/ge-core/src/plugins/MinimapPlugin.ts`

**Estimated Effort:** 3-4 days

---

#### 15. Export Plugin
**Description:** Export diagram to PNG, SVG, JPEG.

**Tasks:**
- [ ] Create `ExportPlugin` class
- [ ] Export to PNG
- [ ] Export to SVG
- [ ] Export to JPEG
- [ ] Add quality and size options

**Files to Create:**
- `packages/ge-core/src/plugins/ExportPlugin.ts`

**Estimated Effort:** 2-3 days

---

#### 16. Additional Routers
**Description:** Implement missing router algorithms.

**Tasks:**
- [ ] Complete ManhattanRouter implementation
- [ ] Add OneWayRouter (one-way streets)
- [ ] Add ERRouter (entity relationship)
- [ ] Add MetroRouter (metro-style)

**Files to Modify:**
- `packages/ge-core/src/core/edge/EdgeRouter.ts`

**Estimated Effort:** 2-3 days

---

#### 17. Additional Connectors
**Description:** Implement missing connector types.

**Tasks:**
- [ ] Add JumpConnector (jump-over effect)
- [ ] Add CurvedConnector (smooth curve)

**Files to Modify:**
- `packages/ge-core/src/core/edge/EdgeConnector.ts`

**Estimated Effort:** 1-2 days

---

#### 18. Animation Support
**Description:** Add animation capabilities for transitions.

**Tasks:**
- [ ] Create animation utility
- [ ] Animate node position changes
- [ ] Animate edge path changes
- [ ] Add animation duration/easing options

**Files to Create:**
- `packages/ge-core/src/utils/animation.ts`

**Estimated Effort:** 3-4 days

---

#### 19. Virtual Rendering
**Description:** Optimize rendering for large graphs.

**Tasks:**
- [ ] Implement viewport-based culling
- [ ] Only render visible elements
- [ ] Add virtualization threshold
- [ ] Performance optimization

**Estimated Effort:** 5-7 days

---

#### 20. React/Vue Integration
**Description:** Provide framework-specific components.

**Tasks:**
- [ ] Create React components
- [ ] Create Vue components
- [ ] Documentation and examples

**Estimated Effort:** 5-7 days per framework

---

## Part 4: Implementation Roadmap

### Phase 1: Core Editing Features (Weeks 1-4)
1. Selection System (Week 1)
2. History Plugin (Week 1-2)
3. Clipboard Plugin (Week 2)
4. Keyboard Plugin (Week 2)
5. Validation System (Week 3)

### Phase 2: Viewport & Navigation (Weeks 5-6)
1. Scroller Plugin (Week 5)
2. Minimap Plugin (Week 6)
3. Grid System Enhancement (Week 6)

### Phase 3: Interactive Tools (Weeks 7-10)
1. Snapline Plugin (Week 7)
2. Transform Plugin (Week 8-9)
3. Dnd Plugin (Week 9)
4. Stencil Plugin (Week 10)

### Phase 4: Advanced Features (Weeks 11-14)
1. Group Element (Week 11-12)
2. Layout Integration (Week 12-13)
3. Enhanced Serialization (Week 13)
4. Animation Support (Week 14)

### Phase 5: Optimization & Integration (Weeks 15+)
1. Virtual Rendering
2. React/Vue Integration
3. Additional Routers/Connectors
4. Export Plugin
5. Performance Optimization

---

## Part 5: Architecture Summary (Current State)

**What GE Has Done Well:**

1. ✅ **Clean Architecture**
   - GEInteractiveElement → ItemElement/ItemToolElement separation
   - Generic shape support with type safety
   - DOM-like API design

2. ✅ **Core Interactions**
   - Dragging (MovePlugin)
   - Connecting (ConnectionPlugin)
   - Event system (CustomEvent)

3. ✅ **Labels & Markers**
   - Multiple edge labels
   - Label positioning (distance/offset/angle)
   - Markers (arrows)

4. ✅ **Router & Connector System**
   - Modular router architecture
   - Multiple connector types
   - Anchor presets

5. ✅ **ID Management** (Just Completed!)
   - Unified ID generation
   - Single source of truth (this.id)
   - No redundant id in data

**What Needs Improvement:**

1. ❌ **Plugin Ecosystem** - Need more built-in plugins
2. ❌ **Selection** - No multi-selection or box selection
3. ❌ **History** - Commands exist but not fully implemented
4. ❌ **Viewport** - No pan/zoom/minimap
5. ❌ **Tools** - No Dnd/Stencil/Transform tools

---

## Summary

**GE's Strengths:**
- Modern, type-safe architecture
- Clean separation of concerns
- DOM-like API
- Generic shape system
- Extensible plugin foundation

**GE's Gaps vs X6:**
- Missing critical editing features (selection, history, viewport)
- Fewer built-in plugins
- Less batteries-included
- Needs tool ecosystem development

**Recommendation:** Focus on **Phase 1 (Core Editing Features)** first, as these are essential for basic graph editing functionality.

---

## Part 6: Verification Plan

This is a reference document for future development planning. For each feature implementation, use the following verification approach:

### For Plugin Development:
1. **Unit Tests**: Test plugin class initialization and event handling
2. **Integration Tests**: Test plugin integration with Graph
3. **Visual Tests**: Verify plugin behavior visually
4. **API Tests**: Test all public methods and options

### For Element Development (Node/Edge/Group):
1. **DOM Tests**: Verify DOM-like API works (appendChild, removeChild, etc.)
2. **Position Tests**: Verify positioning calculations
3. **Style Tests**: Verify style application
4. **Event Tests**: Verify event dispatching and handling

### Testing Strategy:
- Use Jest for unit/integration tests
- Use visual regression tests for UI components
- Test with realistic graph scenarios (50+ nodes/edges)

### Example Test Flow:
```bash
# Run all tests
npm test

# Run specific test file
npm test SelectionPlugin.test.ts

# Run with coverage
npm test -- --coverage
```

---

## Part 7: Quick Reference

### Critical Files for Plugin Development:
- **Base Plugin**: `packages/ge-core/src/plugins/` (ConnectionPlugin.ts, MovePlugin.ts as reference)
- **Graph Class**: `packages/ge-core/src/core/Graph.ts`
- **Event Types**: `packages/ge-core/src/types/events.ts`
- **Plugin Interface**: `@antv/g-lite` RenderingPlugin

### Critical Files for Element Development:
- **Base Classes**: `GEInteractiveElement.ts`, `ItemElement.ts`, `ItemToolElement.ts`
- **Existing Elements**: `Node.ts`, `Edge.ts`, `Port.ts`
- **Shape Resolution**: `shapeResolver.ts`
- **Anchor System**: `nodeAnchor.ts`, `edgeLayout.ts`

### Key Architecture Decisions:
1. ✅ Use `this.id` as single source of truth (NOT `this.data.id`)
2. ✅ Use DOM-like API (appendChild, removeChild, querySelector)
3. ✅ Extend GEInteractiveElement for interactive elements
4. ✅ Extend ItemElement for collection managers (Node, Edge, Group)
5. ✅ Extend ItemToolElement for positionable items (Port, Tools, Labels)
6. ✅ Use CustomEvent for event dispatching
7. ✅ Use RenderingPlugin interface for plugins

```
DisplayObject (@antv/g-lite)
  ↑
CustomElement (@antv/g-lite)
  ↑
GEInteractiveElement<TShape> (交互功能)
  ↑
ItemElement (管理 tools/ports/labels 集合 + 布局算法)
  ↑
Node | Edge | Group (未来的容器节点)
  ↓ 包含:
  - tools: ItemToolElement[]
  - ports: ItemToolElement[]
  - labels: ItemToolElement[]

ItemToolElement<TShape> (单个 item 的位置计算)
  ↑
Port | EdgeLabel | ButtonRemove | NodeEditor | ...
```

**职责分离：**
| 类 | 职责 |
|---|------|
| **ItemElement** | • 管理 tools/ports/labels 集合<br>• 提供布局算法（均匀分布等）<br>• 配置 → 自动生成 ItemToolElement<br>• ItemToolElement 还是在 owner.children 中（符合 DOM） |
| **ItemToolElement** | • 通过 owner.primaryShape + layout 计算位置<br>• distance, offset, angle 参数<br>• getIndex() 获取同组索引 |
| **Node/Edge/Group** | • 继承 ItemElement<br>• 拥有 tools/ports/labels 集合 |

**为什么这样设计：**
1. ✅ 清晰的职责分离 - 集合管理 vs 单项定位
2. ✅ Node/Edge/Group 都可以有 tools/ports/labels
3. ✅ 符合 DOM - ItemToolElement 在 children 中
4. ✅ ItemElement 可以提供统一的布局算法（如均匀分布）

**Unified Concept:**
- **Edge Labels**: owner (Node/Edge) 的 primaryShape 是 **Path**（Line, Polyline 等）
- **Node Ports**: owner (Node) 的 primaryShape 是 **Shape**（Rect, Circle, Ellipse = **闭合 Path**）
- 两者都通过 ItemToolElement 的 `calculatePosition()` 计算位置

**Shared Parameters in ItemToolElement:**
| Parameter | Edge Labels | Node Ports | ButtonRemove | Purpose |
|-----------|-------------|------------|-------------|---------|
| `distance` | t: 0-1 along path | 沿边的距离 (0-1) | (可能用) | 位置 |
| `offset.normal` | 法向偏移 | 法向偏移 | (可能用) | 法向偏移 |
| `offset.tangent` | 切向偏移 | 切向偏移 | (可能用) | 切向偏移 |
| `angle` | 旋转角度 | 旋转角度 | (可能用) | 方向 |
| `layout` | - | top/bottom/left/right | - | 布局类型 |
| `index` | 第几个 label | 第几个 port | - | 用于分布计算 |

**ItemElement 提供的能力：**
```typescript
class ItemElement extends GEInteractiveElement {
  // 集合管理
  protected tools: ItemToolElement[] = [];
  protected ports: ItemToolElement[] = [];
  protected labels: ItemToolElement[] = [];

  // 布局算法
  distributeItems(items: ItemToolElement[]): void {
    // 根据 index 均匀分布 items
  }

  // 添加 item
  addPort(config): Port {
    const port = new Port(config);
    this.ports.push(port);
    port._owner = this;
    this.appendChild(port);
    this.distributeItems(this.ports);
    return port;
  }
}
```

**ItemToolElement 提供的能力：**
```typescript
class ItemToolElement extends GEInteractiveElement {
  protected _owner: ItemElement | null = null;
  protected position: { distance?, offset?, angle? };
  protected layout: string | ItemLayoutOptions;

  // 统一的位置计算
  calculatePosition(): Vec2 {
    if (!this._owner?.primaryShape) return [0, 0];
    // 根据是 Path 还是 Shape 计算位置
  }

  // 获取同组 items（用于 index 计算）
  getSiblings(): ItemToolElement[] {
    // 从 _owner 获取同 layout 的 items
  }

  // 获取自己的 index
  getIndex(): number {
    const siblings = this.getSiblings();
    return siblings.indexOf(this);
  }
}
```

## Analysis of User Suggestions

### 1. Markers (✅ Already Good)
- **Status**: Well implemented
- **Capability**: Presentation-only, correct rendering
- **Conclusion**: No changes needed, EdgeMarker is solid

### 2. Labels (❌ Needs Work)
- **Current**: Single string label only
- **x6 Features**:
  - Multiple labels array
  - `position.distance` (t parameter)
  - `position.offset` (normal/tangent)
  - `position.angle` (rotation)
- **Gap**: Significant enhancement needed

### 3. Tools (⚠️ Partial)
- **Current**: EdgeTool exists but limited
- **x6 Features**: DOM elements with built-in interactions
- **Examples**: button-remove, node-editor (double-click to edit)
- **Gap**: Need proper tool architecture

### 4. Port as Special Tool (💡 Insightful)
- **Current**: Port extends GEInteractiveElement directly
- **User's Idea**: Port could be a special ItemToolElement
- **Rationale**: Ports share characteristics with tools

### 5. ItemToolElement Abstraction (🎯 Key Design)
- **Purpose**: Middle layer for tools and ports
- **Shared Needs**:
  - Owner reference (node/edge)
  - Easy owner access
  - Relative positioning
  - Built-in interactions
- **Inheritance**: `GEInteractiveElement → ItemToolElement → Port/Tools`

### 6. Label Editing (💡 Good Idea)
- **Approach**: Add `labelShape` to parent class
- **Properties**: `editable` flag
- **Plugin**: EditPlugin for in-place editing
- **Scope**: All elements with labels (Node, Edge, Port)

### 7. Port API Issues (❌ Real Problems)
- **createPort** not DOM-like
- **Port Manager** design questionable
- **Compare to**: optgroup/option relationship

## Current State Summary

### Strengths
- ✅ Clean GEInteractiveElement architecture
- ✅ DOM-like event system
- ✅ Generic primaryShape support
- ✅ Markers well implemented

### Weaknesses
- ❌ Single label only (no multiple labels)
- ❌ No label rotation
- ❌ Tools don't inherit GEInteractiveElement
- ❌ createPort API not DOM-consistent
- ❌ No standardized tool architecture

---

## Design Proposals

### Proposal 1: Two-Layer Architecture - ItemElement + ItemToolElement (ACCEPTED ✓)

**Overview**: Create two new base classes to separate concerns:

1. **ItemElement**: Base class for Node/Edge/Group - manages collections (tools/ports/labels arrays) and provides layout algorithms
2. **ItemToolElement**: Base class for Port/EdgeLabel/Tools - handles individual positioning via owner.primaryShape

#### Part A: ItemElement (Collection Manager)

```typescript
// Inheritance hierarchy
CustomElement<any>
  ↑
GEInteractiveElement<TShape> (existing - interactions)
  ↑
ItemElement<TShape> (NEW - collection management)
  ↑
Node | Edge | Group

// ItemElement - manages tools/ports/labels collections
export abstract class ItemElement<TShape extends DisplayObject = DisplayObject>
  extends GEInteractiveElement<TShape> {

  // Collection arrays (for tracking and layout)
  protected tools: ItemToolElement[] = [];
  protected ports: ItemToolElement[] = [];
  protected labels: ItemToolElement[] = [];

  /**
   * Layout algorithm: distribute items evenly
   * Called when items are added/removed
   */
  protected distributeItems(items: ItemToolElement[]): void {
    const count = items.length;
    if (count === 0) return;

    // Sort by index and distribute evenly
    items.sort((a, b) => (a.getIndex?.() ?? 0) - (b.getIndex?.() ?? 0));

    items.forEach((item, i) => {
      // Update item's position based on distribution
      item.updateDistributedPosition?.(i, count);
    });
  }

  /**
   * Add a port to this element
   * Port is added to children AND tracked in ports array
   */
  addPort(config: PortConfig): Port {
    const port = new Port(config);
    this.ports.push(port);
    this.appendChild(port);
    this.distributeItems(this.ports);
    return port;
  }

  /**
   * Get all ports
   */
  getPorts(): Port[] {
    return [...this.ports];
  }

  /**
   * Get all tools
   */
  getTools(): ItemToolElement[] {
    return [...this.tools];
  }

  /**
   * Get all labels
   */
  getLabels(): ItemToolElement[] {
    return [...this.labels];
  }
}
```

**ItemElement Responsibilities:**
- ✅ Manage tools/ports/labels arrays (for tracking and layout)
- ✅ Provide `distributeItems()` layout algorithm
- ✅ Provide convenience methods (addPort, getPorts, etc.)
- ✅ Track items by layout type for distribution

**Note**: ItemToolElement instances still live in `owner.children` (DOM-compliant). The arrays in ItemElement are for tracking and layout only.

#### Part B: ItemToolElement (Individual Positioning)

Create `ItemToolElement<TShape>` with **unified positioning logic**:

```typescript
// Inheritance hierarchy
CustomElement<any>
  ↑
GEInteractiveElement<TShape> (existing - interactions)
  ↑
ItemToolElement<TShape> (NEW - positioning logic)
  ↑
Port | ButtonRemove | NodeEditor | EdgeLabel | etc.

// ItemToolElement - ALL positioning logic here
export abstract class ItemToolElement<TShape extends DisplayObject = Circle>
  extends GEInteractiveElement<TShape> {

  // Owner reference
  protected _owner: Node | Edge | null = null;
  protected layout: ItemLayoutOptions;

  // Position parameters (unified for all items)
  protected position: {
    distance?: number;    // 0-1 along path
    offset?: {
      normal?: number;
      tangent?: number;
    };
    angle?: number;       // rotation in degrees
  };

  // === UNIFIED POSITIONING LOGIC ===
  // This is where the shared logic for Labels and Ports lives

  /**
   * Calculate position based on owner's primaryShape
   * Works for both Edge (Path) and Node (closed Shape)
   */
  protected calculatePosition(): Vec2 {
    if (!this._owner?.primaryShape) return [0, 0];

    const shape = this._owner.primaryShape;

    // Get position along the shape
    if (this.isPathLike(shape)) {
      // For Edge labels: position along Path using distance (t)
      return this.calculatePositionOnPath(shape, this.position.distance);
    } else {
      // For Node ports: position on Shape using layout
      return this.calculatePositionOnShape(shape, this.layout);
    }
  }

  // For Edge: get point at distance t (0-1) along Path
  protected calculatePositionOnPath(path: Path, t: number): Vec2 {
    const point = path.getPointAtLength(t * path.getTotalLength());
    // Apply offset and angle
    return this.applyOffsetAndAngle(point, path.getTangentAt(t));
  }

  // For Node: get point based on layout (top, bottom, left, right, etc.)
  protected calculatePositionOnShape(shape: DisplayObject, layout: string): Vec2 {
    const bounds = shape.getLocalBounds();
    const center = [(bounds.min[0] + bounds.max[0]) / 2, (bounds.min[1] + bounds.max[1]) / 2];
    const size = [bounds.max[0] - bounds.min[0], bounds.max[1] - bounds.min[1]];

    // Calculate based on layout type
    switch (layout) {
      case 'top': return [center[0], bounds.min[1]];
      case 'bottom': return [center[0], bounds.max[1]];
      case 'left': return [bounds.min[0], center[1]];
      case 'right': return [bounds.max[0], center[1]];
      default: return center;
    }
  }

  // Apply offset (normal/tangent) and angle rotation
  protected applyOffsetAndAngle(point: Vec2, tangent?: Vec2): Vec2 {
    // Apply normal offset
    if (this.position.offset?.normal && tangent) {
      const normal = [-tangent[1], tangent[0]]; // Perpendicular
      point[0] += normal[0] * this.position.offset.normal;
      point[1] += normal[1] * this.position.offset.normal;
    }
    // Apply tangent offset
    if (this.position.offset?.tangent && tangent) {
      point[0] += tangent[0] * this.position.offset.tangent;
      point[1] += tangent[1] * this.position.offset.tangent;
    }
    // Apply angle rotation
    if (this.position.angle) {
      // Rotate point around origin by angle
    }
    return point;
  }

  // Get siblings for index calculation (for distribution)
  protected getSiblings(): ItemToolElement[] {
    if (!this._owner) return [];
    return Array.from(this._owner.children)
      .filter(c => c instanceof ItemToolElement && c.layout === this.layout);
  }

  // Get index among siblings (for even distribution)
  protected getIndex(): number {
    const siblings = this.getSiblings();
    return siblings.indexOf(this);
  }
}
```

**Key Point:** All positioning logic lives in `ItemToolElement`:

```typescript
CustomElement<any>
  ↑
GEInteractiveElement<TShape> (existing - interactions)
  ↑
ItemToolElement<TShape> (NEW - ALL positioning logic here)
  ↑
Port | ButtonRemove | NodeEditor | EdgeLabel | etc.
```

- **Port** extends ItemToolElement → gets positioning for free
- **EdgeLabel** extends ItemToolElement → gets positioning for free
- **ButtonRemove** extends ItemToolElement → gets positioning for free

**Why EdgeLabel extends ItemToolElement:**
1. ✅ Gets unified positioning logic (distance, offset, angle)
2. ✅ Can be editable (for EditPlugin)
3. ✅ Clean design - all positionable items use same base
4. ✅ Consistent with user's insight that Labels and Ports are "the same thing"

**Note:** EdgeLabel is primarily a label (text display), but it shares the same positioning needs as Port, so it makes sense to inherit from ItemToolElement. The "Tool" in ItemToolElement refers to "positioned item attached to owner" rather than "interactive tool".

**No Need For:**
- ❌ Separate positioning logic for Labels vs Ports
- ❌ AttachedItem vs PositionedItem distinction
- ❌ Layout classes on owner

### Proposal 2: Port API Redesign (ACCEPTED ✓)

Make Port API fully DOM-consistent:

**Current (❌ Not DOM-like):**
```typescript
node.createPort({ id: 'p1' });  // Custom API
node.getPort('p1');              // Custom API
node.removePort('p1');           // Custom API
```

**Proposed (✅ DOM-like):**
```typescript
// Use DOM API
const port = new Port({ id: 'p1', layout: 'left' });
node.appendChild(port);

// Standard DOM access
node.querySelector('#p1');          // If ID set
node.children;                     // Expose all children

// Keep convenience methods (optional)
node.getPort('p1');    // Convenience wrapper
node.getPorts();       // Convenience wrapper
```

**PortManager Concept (REJECTED ❌):**
- User suggested: Similar to optgroup/option
- **Analysis**: Not needed
- **Reason**: Ports are just children of Node, naturally managed by DOM
- **Conclusion**: Remove port management complexity, use DOM directly

### Proposal 3: Multiple Labels with Editing (ACCEPTED ✓)

**Design Principle:** Single `labelShape` in base class, Edge manages multiple labels internally.

**A. LabelShape in Base Class (Simple, Clean):**

```typescript
// In GEInteractiveElement - keep simple
export abstract class GEInteractiveElement<TShape> extends CustomElement<any> {
  protected primaryShape: TShape | null = null;
  protected labelShape: Text | null = null;  // Single label, NOT Map

  // Get label
  getLabelShape(): Text | null {
    return this.labelShape;
  }

  // Set label (for Node, Port, etc.)
  setLabelShape(config: { text?: string; fill?: string; fontSize?: number }): void {
    if (!this.labelShape) {
      this.labelShape = new Text({ style: config });
      this.appendChild(this.labelShape);
    } else {
      // Update existing
      if (config.text !== undefined) this.labelShape.style.text = config.text;
      if (config.fill) this.labelShape.style.fill = config.fill;
      // etc.
    }
  }
}
```

**B. Edge Multiple Labels (Edge-specific, not in base class):**

```typescript
// Edge extends to support multiple labels internally
export class Edge<TPath> extends GEInteractiveElement<TPath> {
  // Edge manages multiple labels (not base class concern)
  private labels: Map<string, Text> = new Map();

  // Override getLabelShape to return primary label
  getLabelShape(): Text | null {
    return this.labels.get('default') || this.labels.values().next().value || null;
  }

  // Add label (Edge-specific method)
  addLabel(id: string, config: LabelConfig): Text {
    const text = new Text({ style: { text: config.text, ...config.style } });
    this.labels.set(id, text);
    this.appendChild(text);
    this.updateLabelPosition(id, config.position);
    return text;
  }

  // Remove label
  removeLabel(id: string): void {
    const label = this.labels.get(id);
    if (label) {
      this.removeChild(label);
      this.labels.delete(id);
    }
  }

  // Get specific label
  getLabel(id: string): Text | undefined {
    return this.labels.get(id);
  }
}
```

**C. Label Configuration:**

```typescript
interface LabelConfig {
  id?: string;                    // Default 'default'
  text?: string;
  position?: {
    distance?: number;            // t: 0-1 along edge
    offset?: {
      normal?: number;             // Perpendicular
      tangent?: number;            // Parallel
    };
    angle?: number;                // Rotation in degrees
  };
  style?: {
    fill?: string;
    fontSize?: number;
    background?: string;           // NEW
    padding?: number;              // NEW
  };
  editable?: boolean;              // NEW
}
```

**C. Multiple Labels for Edge (Usage):**

```typescript
// Edge with multiple labels - Edge manages them internally
const edge = new Edge({
  id: 'e1',
  source: 'n1',
  target: 'n2',
  style: {
    // Primary label (backward compatible)
    label: 'Primary',

    // Multiple labels (new feature)
    labels: [
      {
        id: 'label1',
        text: 'Label 1',
        position: { distance: 0.3, offset: { normal: 10 } }
      },
      {
        id: 'label2',
        text: 'Label 2',
        position: { distance: 0.7, angle: 45 }
      }
    ]
  }
});

// Access labels
edge.getLabelShape();      // Returns primary label
edge.getLabel('label1');    // Returns specific label
edge.addLabel('label3', { ... });  // Add new label
```

**D. EditPlugin:**

```typescript
class EditPlugin implements RenderingPlugin {
  name = 'edit';

  // Listen for double-click on labels
  apply(context: RenderingPluginContext) {
    const graph = context.graph as Graph;

    graph.addEventListener('dblclick', (e: Event) => {
      const target = e.target;

      // Check if target has editable label
      if (target instanceof GEInteractiveElement) {
        const label = target.getLabelShape();
        if (label && label.style.editable) {
          this.startEditing(target, label);
        }
      }
    });
  }

  startEditing(element: GEInteractiveElement, label: Text): void {
    // Create input in place
    // On blur: save and destroy
  }
}
```

### Proposal 4: Tool Examples (ACCEPTED ✓)

Implement example tools:

**A. ButtonRemove Tool:**

```typescript
class ButtonRemove extends ItemToolElement {
  constructor(owner: Node | Edge) {
    super({ id: 'btn-remove' });
    this._owner = owner;

    // Create X button shape
    this.primaryShape = new Circle({
      style: { r: 8, fill: '#ff4d4f' }
    });
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', () => {
      if (this._owner) {
        (this._owner.ownerDocument as Graph).removeChild(this._owner);
      }
    });
  }

  updatePosition(): void {
    if (this._owner instanceof Node) {
      const pos = this._owner.getPosition();
      const size = this._owner.getSize();
      this.setPosition([pos[0] + size.width, pos[1]]);
    }
  }
}
```

**B. NodeEditor Tool:**

```typescript
class NodeEditor extends ItemToolElement {
  constructor(owner: Node) {
    super({ id: 'node-editor' });
    this._owner = owner;
  }

  connectedCallback() {
    super.connectedCallback();

    const label = this.getOwnerLabel();
    if (label) {
      label.addEventListener('dblclick', () => {
        this.editLabel(label);
      });
    }
  }

  editLabel(label: Text): void {
    // In-place editing
    const input = document.createElement('input');
    input.value = label.style.text;

    // Position over label
    // On blur: save and remove
  }
}
```

---

## Implementation Plan

### Phase 0: Labels and Ports Share the Same Essence

**Key Understanding:** Labels 和 Ports 是同一种东西，应该共享定位逻辑！

**Unified Design:**
1. **相同的定位参数**: distance, offset (normal/tangent), angle, index
2. **相同的 owner.primaryShape**: Labels 用 Path，Ports 用闭合 Shape（本质一样）
3. **相同的位置计算逻辑**: 根据 primaryShape + 参数计算位置

**Implementation Approach:**
- 创建 ItemElement（集合管理）和 ItemToolElement（单项定位）两层基类
- Labels 和 Ports 都继承 ItemToolElement
- Node/Edge/Group 都继承 ItemElement

**No Need For:**
- ❌ AttachedItem vs PositionedItem 的区分
- ❌ PortManager 类（用 DOM children + querySelector 足够）
- ❌ 额外的 Layout 类挂在 owner 上

### Phase 1: ItemElement Base Class (Collection Manager)
1. Create `ItemElement<TShape>` class extending GEInteractiveElement
2. Add tools/ports/labels arrays
3. Implement `distributeItems()` layout algorithm
4. Implement `addPort()`, `getPorts()`, `getTools()`, `getLabels()` convenience methods
5. Update Node and Edge to extend ItemElement (instead of GEInteractiveElement directly)

**Files:**
- Create: `packages/ge-core/src/core/ItemElement.ts`
- Modify: `packages/ge-core/src/core/node/Node.ts` (extend ItemElement)
- Modify: `packages/ge-core/src/core/edge/Edge.ts` (extend ItemElement)

### Phase 2: ItemToolElement Base Class (Individual Positioning)
1. Create `ItemToolElement<TShape>` class extending GEInteractiveElement
2. Add `_owner` property and `getOwner()` method
3. Implement `calculatePosition()` with unified positioning logic
4. Implement `getSiblings()` and `getIndex()` for distribution support
5. Add `updateDistributedPosition()` for layout algorithm

**Files:**
- Create: `packages/ge-core/src/core/ItemToolElement.ts`

### Phase 3: Port API Redesign
1. Make Port extend ItemToolElement
2. Remove manual port management (portsById Map from Node)
3. Rely on ItemElement's ports array + DOM children for port collection
4. Keep convenience methods (getPort, getPorts) - now delegate to ItemElement

**Files:**
- Modify: `packages/ge-core/src/core/port/Port.ts` (extend ItemToolElement)
- Modify: `packages/ge-core/src/core/node/Node.ts` (use ItemElement's ports array)

### Phase 4: Multiple Labels
1. Add single `labelShape` to GEInteractiveElement (NOT Map)
2. Add `setLabelShape()` method to base class
3. Edge manages multiple labels internally with own `labels` Map
4. Implement label positioning with rotation (distance, offset, angle)
5. Add Edge methods: `addLabel()`, `removeLabel()`, `getLabel()`

**Files:**
- Modify: `packages/ge-core/src/core/GEInteractiveElement.ts` (single labelShape)
- Modify: `packages/ge-core/src/core/edge/Edge.ts` (multiple labels management)
- Modify: `packages/ge-core/src/types/index.ts` (LabelConfig type)

### Phase 5: Label Editing
1. Create EditPlugin
2. Implement in-place editing
3. Add editable property to labels
4. Handle blur to save changes

**Files:**
- Create: `packages/ge-core/src/plugins/EditPlugin.ts`

### Phase 6: Example Tools
1. Implement ButtonRemove tool (extends ItemToolElement)
2. Implement NodeEditor tool (extends ItemToolElement)
3. Add tool registration system

**Files:**
- Create: `packages/ge-core/src/core/tools/ButtonRemove.ts`
- Create: `packages/ge-core/src/core/tools/NodeEditor.ts`
- Modify: `packages/ge-core/src/core/Graph.ts`

---

## Verification

### Testing Strategy
1. **Unit Tests**: Test ItemToolElement base class
2. **Integration Tests**: Test Port API with DOM methods
3. **Visual Tests**: Verify multiple labels display correctly
4. **Interaction Tests**: Test EditPlugin functionality

### Manual Testing
1. Create node with ports using DOM API
2. Create edge with multiple labels
3. Test label editing (double-click)
4. Test button-remove tool

---

## Summary of Design Decisions

| Proposal | Decision | Rationale |
|----------|----------|-----------|
| ItemElement (Collection Manager) | ✅ Accept | Node/Edge/Group need unified collection management |
| ItemToolElement (Individual Positioning) | ✅ Accept | Port/EdgeLabel/Tools share positioning logic |
| PortManager | ❌ Reject | Use DOM children directly |
| Multiple Labels | ✅ Accept | Matches x6 capability |
| Label Editing | ✅ Accept | Useful feature, EditPlugin |
| Port API Redesign | ✅ Accept | More DOM-consistent |
| Markers | ✅ Keep | Already well implemented |

## Open Questions

1. Should ItemToolElement be in core or separate package?
2. Should we deprecate getPort/getPorts convenience methods?
3. Should EditPlugin be in core or plugins package?
