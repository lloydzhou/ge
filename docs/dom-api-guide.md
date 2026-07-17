# GE DOM API Guide

This guide explains the native DOM-style APIs available in GE, which are inherited from @antv/g-lite.

## Available DOM APIs

### 1. Style Property Direct Assignment

GE elements support direct style manipulation, just like DOM elements:

```typescript
// Get a node
const node = graph.getNodeById('node1');

// Direct style manipulation
node.style.width = 120;
node.style.height = 80;
node.style.fill = '#e6f7ff';
node.style.stroke = '#1890ff';
node.style.lineWidth = 2;
node.style.opacity = 0.8;
```

### 2. setAttribute / getAttribute

Store custom data on elements using DOM-style attribute methods:

```typescript
const node = graph.getNodeById('node1');

// Set custom attributes
node.setAttribute('data-custom', 'value');
node.setAttribute('data-type', 'special');

// Get attributes back
const value = node.getAttribute('data-custom'); // 'value'
const type = node.getAttribute('data-type');   // 'special'
```

### 3. querySelector / querySelectorAll

Query elements using CSS selectors through the graph's document:

```typescript
// Query all nodes
const nodes = graph.document.querySelectorAll('g-node');

// Query all edges
const edges = graph.document.querySelectorAll('g-edge');

// Query by ID (preferred over getElementById for consistency)
const node = graph.document.querySelector('#node1');

// Query with CSS selectors
const blueNodes = graph.document.querySelectorAll('g-node[style*="#1890ff"]');
```

### 4. children Property

Access child elements directly:

```typescript
const node = graph.getNodeById('node1');

// Get all children
const children = node.children;

// Children is an array-like object
for (const child of children) {
  console.log(child.className); // 'g-port', 'text', etc.
}
```

### 5. Position Methods

DisplayObject provides built-in position methods:

```typescript
const node = graph.getNodeById('node1');

// Get current position
const [x, y] = node.getPosition(); // inherited from DisplayObject

// Set position
node.setPosition(100, 200);
node.setPosition([100, 200]);

// Set position with z-coordinate
node.setPosition(100, 200, 0);
```

### 6. appendChild / removeChild

Standard DOM-style methods for adding/removing elements:

```typescript
// Add a node
const node = new Node({ id: 'n1', x: 100, y: 100 });
graph.appendChild(node);

// Add an edge
const edge = new Edge({
  id: 'e1',
  source: 'n1',
  target: 'n2'
});
graph.appendChild(edge);

// Remove elements
graph.removeChild(node);
graph.removeChild(edge);
```

## Migration from Convenience Methods

### Old API (Deprecated)

```typescript
// ❌ Deprecated
const node = graph.addNode({ id: 'n1', x: 100, y: 100 });
const edge = graph.addEdge({ id: 'e1', source: 'n1', target: 'n2' });
graph.removeNode('n1');
graph.removeEdge('e1');
```

### New DOM-Style API (Recommended)

```typescript
// ✅ Recommended - DOM-style
const node = new Node({ id: 'n1', x: 100, y: 100 });
graph.appendChild(node);

const edge = new Edge({ id: 'e1', source: 'n1', target: 'n2' });
graph.appendChild(edge);

// To remove, get the element first
const nodeToRemove = graph.getNodeById('n1');
graph.removeChild(nodeToRemove);
```

## Port Management

Ports use the same DOM-style APIs:

```typescript
const node = graph.getNodeById('node1');

// Create a port
const port = node.createPort({
  id: 'port1',
  layout: { position: 'top' },
  style: { fill: '#1890ff' }
});

// Port styling
port.style.r = 6;
port.style.fill = '#fff';
port.style.stroke = '#1890ff';

// Access port's children
const portChildren = port.children;
```

## Event Handling

GE uses DOM-style events:

```typescript
const node = graph.getNodeById('node1');

// Add event listener
node.addEventListener('click', (e) => {
  console.log('Node clicked:', node.getId());
});

// Remove event listener
node.removeEventListener('click', handler);

// Dispatch custom events
node.dispatchEvent(new CustomEvent('custom:event', { detail: { data: 'value' } }));
```

## Element References

### getElementById

Find elements by ID:

```typescript
const node = graph.document.getElementById('node1');
const edge = graph.document.getElementById('edge1');
```

### Registry Lookups (Faster)

For performance-critical code, use the graph's registry:

```typescript
// Faster than querySelector
const node = graph.getNodeById('node1');
const edge = graph.getEdgeById('edge1');

// Get all nodes/edges from registry
const allNodes = graph.getNodes();
const allEdges = graph.getEdges();
```

## Complete Example

```typescript
import { Graph, Node, Edge } from '@opengem/ge-core';

// Create graph
const graph = new Graph({
  container: 'container',
  width: 800,
  height: 600
});

// Create nodes using DOM-style API
const node1 = new Node({
  id: 'n1',
  x: 100,
  y: 100,
  style: {
    width: 120,
    height: 60,
    fill: '#e6f7ff',
    stroke: '#1890ff'
  }
});
graph.appendChild(node1);

const node2 = new Node({
  id: 'n2',
  x: 300,
  y: 100
});
graph.appendChild(node2);

// Create edge
const edge = new Edge({
  id: 'e1',
  source: 'n1',
  target: 'n2'
});
graph.appendChild(edge);

// Direct style manipulation
node1.style.fill = '#f0f0f0';

// Query elements
const allNodes = graph.document.querySelectorAll('g-node');
console.log('Total nodes:', allNodes.length);

// Set custom attributes
node1.setAttribute('data-status', 'active');

// Position manipulation
const [x, y] = node1.getPosition();
node1.setPosition(x + 50, y);
```

## API Reference

### DisplayObject (Base Class)

All GE elements inherit these from DisplayObject:

- `style: StyleProps` - Direct style property access
- `getPosition(): [number, number]` - Get element position
- `setPosition(x, y, z?)` - Set element position
- `getAttribute(name): string | null` - Get attribute value
- `setAttribute(name, value)` - Set attribute value
- `children: DisplayObject[]` - Child elements
- `appendChild(child)` - Add child element
- `removeChild(child)` - Remove child element

### Graph (Canvas)

- `document: Document` - The graph's document for queries
- `querySelector(selector)` - Query single element
- `querySelectorAll(selector)` - Query all matching elements
- `getElementById(id)` - Find element by ID
- `getNodeById(id)` - Fast registry lookup for nodes
- `getEdgeById(id)` - Fast registry lookup for edges
- `getNodes()` - Get all nodes from registry
- `getEdges()` - Get all edges from registry

## Best Practices

1. **addNode 与 appendChild 等价**: `addNode({...})` 内部就是 `createElement` + `appendChild` 的便捷封装，二者可随意选用
2. **Use registry for performance**: `getNodeById()` is faster than `querySelector('#id')`
3. **Direct style manipulation**: Use `element.style.prop = value` instead of data mutation
4. **Query with selectors**: Use `querySelectorAll` for complex queries instead of manual iteration
5. **Clean up resources**: Always call `removeChild` when removing elements
