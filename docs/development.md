# GE Development Guide

## Project Structure

```
ge/
├── packages/
│   ├── ge-core/          # Core graph editor functionality
│   ├── ge-plugins/       # Plugin system (future)
│   └── ge-react/         # React components (future)
├── demo/                 # Demo pages
├── docs/                 # Documentation
└── examples/             # Example applications (future)
```

## Getting Started

### Installation

```bash
cd ge
pnpm install
```

### Development

```bash
# Build the project
pnpm run build

# Watch for changes
pnpm run dev
```

## Core Concepts

### 1. Graph
The main container that extends Canvas and manages nodes and edges.

### 2. Node
CustomElement that represents a graph node with draggable capability.

### 3. Edge
CustomElement that represents a connection between nodes.

### 4. Port
CustomElement that represents connection points on nodes.

## Architecture

All core components extend CustomElement to leverage:
- Lifecycle methods (connectedCallback, disconnectedCallback)
- Custom styling
- Event handling
- DOM-like API

## Development Roadmap

1. **Phase 1**: Basic architecture (current)
   - Graph, Node, Edge, Port implementation
   - DOM-style API
   - Basic event handling

2. **Phase 2**: Core editing features
   - Node dragging
   - Edge connection
   - Selection system

3. **Phase 3**: Plugin system
   - Modular architecture
   - Built-in plugins (selection, drag, etc.)

4. **Phase 4**: Advanced features
   - Undo/redo
   - Alignment tools
   - Keyboard shortcuts

## Testing

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

## Building

```bash
# Build for production
pnpm build

# Build in watch mode
pnpm dev
```