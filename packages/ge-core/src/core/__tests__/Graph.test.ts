import { Graph } from '../Graph';
import { Node } from '../node/Node';
import { Edge } from '../edge/Edge';
import { ConnectionPlugin } from '../../plugins/ConnectionPlugin';
import type { RenderingPlugin, GraphData } from '../../../types';

// Mock console methods to avoid cluttering test output
const originalWarn = console.warn;
const originalError = console.error;

beforeEach(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

describe('Graph', () => {
  describe('Constructor', () => {
    test('should create a graph instance with default config', () => {
      const graph = new Graph({ container: 'container' });
      expect(graph).toBeInstanceOf(Graph);
      expect(graph.getNodes()).toEqual([]);
      expect(graph.getEdges()).toEqual([]);
    });

    test('should create a graph with width and height', () => {
      const graph = new Graph({
        container: 'container',
        width: 800,
        height: 600,
      });
      expect(graph).toBeInstanceOf(Graph);
    });

    test('should add graph reference to context', () => {
      const graph = new Graph({ container: 'container' });
      expect((graph.context as any).graph).toBe(graph);
    });
  });

  describe('Plugin System (using Canvas renderingPlugins)', () => {
    test('should apply plugin with use() method', () => {
      const graph = new Graph({ container: 'container' });
      const plugin: RenderingPlugin = {
        name: 'test-plugin',
        apply: jest.fn(),
      };

      const result = graph.use(plugin);
      expect(result).toBe(graph);
      expect(plugin.apply).toHaveBeenCalledWith(
        graph.context,
        expect.anything()
      );
    });

    test('should add plugin to Canvas renderingPlugins array', () => {
      const graph = new Graph({ container: 'container' });
      const plugin: RenderingPlugin = {
        name: 'test-plugin',
        apply: jest.fn(),
      };

      graph.use(plugin);
      expect(graph.context.renderingPlugins).toContain(plugin);
    });

    test('should apply plugin without name', () => {
      const graph = new Graph({ container: 'container' });
      const plugin: RenderingPlugin = {
        apply: jest.fn(),
      };

      const result = graph.use(plugin);
      expect(result).toBe(graph);
      expect(plugin.apply).toHaveBeenCalled();
      expect(graph.context.renderingPlugins).toContain(plugin);
    });

    test('should handle null plugin gracefully', () => {
      const graph = new Graph({ container: 'container' });
      const result = graph.use(null as any);
      expect(result).toBe(graph);
      expect(console.warn).toHaveBeenCalledWith('Invalid plugin: plugin is undefined or null');
    });

    test('should dispose plugin by name', () => {
      const graph = new Graph({ container: 'container' });
      const plugin: RenderingPlugin = {
        name: 'test-plugin',
        apply: jest.fn(),
        destroy: jest.fn(),
      };

      graph.use(plugin);
      const result = graph.dispose('test-plugin');

      expect(result).toBe(graph);
      expect(plugin.destroy).toHaveBeenCalled();
      expect(graph.context.renderingPlugins).not.toContain(plugin);
    });

    test('should warn when disposing non-existent plugin', () => {
      const graph = new Graph({ container: 'container' });
      const result = graph.dispose('non-existent');

      expect(result).toBe(graph);
      expect(console.warn).toHaveBeenCalledWith('Plugin "non-existent" not found');
    });

    test('should get plugin by name', () => {
      const graph = new Graph({ container: 'container' });
      const plugin: RenderingPlugin = {
        name: 'test-plugin',
        apply: jest.fn(),
      };

      graph.use(plugin);
      const retrieved = graph.getPlugin('test-plugin');

      expect(retrieved).toBe(plugin);
    });

    test('should return undefined for non-existent plugin', () => {
      const graph = new Graph({ container: 'container' });
      const retrieved = graph.getPlugin('non-existent');

      expect(retrieved).toBeUndefined();
    });

    test('should get all plugins', () => {
      const graph = new Graph({ container: 'container' });
      const plugin1: RenderingPlugin = {
        name: 'plugin-1',
        apply: jest.fn(),
      };
      const plugin2: RenderingPlugin = {
        name: 'plugin-2',
        apply: jest.fn(),
      };

      graph.use(plugin1).use(plugin2);
      const plugins = graph.getPlugins();

      expect(plugins).toHaveLength(2);
      expect(plugins).toContain(plugin1);
      expect(plugins).toContain(plugin2);
    });

    test('should dispose all plugins', () => {
      const graph = new Graph({ container: 'container' });
      const plugin1: RenderingPlugin = {
        name: 'plugin-1',
        apply: jest.fn(),
        destroy: jest.fn(),
      };
      const plugin2: RenderingPlugin = {
        name: 'plugin-2',
        apply: jest.fn(),
        destroy: jest.fn(),
      };

      graph.use(plugin1).use(plugin2);
      const result = graph.disposeAllPlugins();

      expect(result).toBe(graph);
      expect(plugin1.destroy).toHaveBeenCalled();
      expect(plugin2.destroy).toHaveBeenCalled();
      expect(graph.context.renderingPlugins).toHaveLength(0);
    });

    test('plugin receives RenderingPluginContext with graph', () => {
      const graph = new Graph({ container: 'container' });
      let receivedContext: any;

      const plugin: RenderingPlugin = {
        name: 'test-plugin',
        apply: (context) => {
          receivedContext = context;
        },
      };

      graph.use(plugin);
      expect(receivedContext).toBeDefined();
      expect(receivedContext.graph).toBe(graph);
      expect(receivedContext.document).toBeDefined();
    });
  });

  describe('Node Registry', () => {
    test('should register node when appended', () => {
      const graph = new Graph({ container: 'container' });
      const node = new Node({
        id: 'node-1',
        x: 100,
        y: 100,
      });

      graph.appendChild(node);
      const retrieved = graph.getNodeById('node-1');

      expect(retrieved).toBe(node);
    });

    test('should unregister node when removed', () => {
      const graph = new Graph({ container: 'container' });
      const node = new Node({
        id: 'node-1',
        x: 100,
        y: 100,
      });

      graph.appendChild(node);
      graph.removeChild(node);
      const retrieved = graph.getNodeById('node-1');

      expect(retrieved).toBeUndefined();
    });

    test('should get all nodes', () => {
      const graph = new Graph({ container: 'container' });
      const node1 = new Node({ id: 'node-1', x: 100, y: 100 });
      const node2 = new Node({ id: 'node-2', x: 200, y: 200 });

      graph.appendChild(node1);
      graph.appendChild(node2);
      const nodes = graph.getNodes();

      expect(nodes).toHaveLength(2);
      expect(nodes).toContain(node1);
      expect(nodes).toContain(node2);
    });

    test('should get node by id', () => {
      const graph = new Graph({ container: 'container' });
      const node = new Node({ id: 'test-node', x: 100, y: 100 });

      graph.appendChild(node);
      const retrieved = graph.getNodeById('test-node');

      expect(retrieved).toBe(node);
    });
  });

  describe('Edge Registry', () => {
    test('should register edge when appended', () => {
      const graph = new Graph({ container: 'container' });
      const node1 = new Node({ id: 'node-1', x: 100, y: 100 });
      const node2 = new Node({ id: 'node-2', x: 200, y: 200 });
      const edge = new Edge({
        id: 'edge-1',
        source: node1,
        target: node2,
      });

      graph.appendChild(node1);
      graph.appendChild(node2);
      graph.appendChild(edge);
      const retrieved = graph.getEdgeById('edge-1');

      expect(retrieved).toBe(edge);
    });

    test('should unregister edge when removed', () => {
      const graph = new Graph({ container: 'container' });
      const node1 = new Node({ id: 'node-1', x: 100, y: 100 });
      const node2 = new Node({ id: 'node-2', x: 200, y: 200 });
      const edge = new Edge({
        id: 'edge-1',
        source: node1,
        target: node2,
      });

      graph.appendChild(node1);
      graph.appendChild(node2);
      graph.appendChild(edge);
      graph.removeChild(edge);
      const retrieved = graph.getEdgeById('edge-1');

      expect(retrieved).toBeUndefined();
    });

    test('should get all edges', () => {
      const graph = new Graph({ container: 'container' });
      const node1 = new Node({ id: 'node-1', x: 100, y: 100 });
      const node2 = new Node({ id: 'node-2', x: 200, y: 200 });
      const node3 = new Node({ id: 'node-3', x: 300, y: 300 });
      const edge1 = new Edge({ id: 'edge-1', source: node1, target: node2 });
      const edge2 = new Edge({ id: 'edge-2', source: node2, target: node3 });

      graph.appendChild(node1);
      graph.appendChild(node2);
      graph.appendChild(node3);
      graph.appendChild(edge1);
      graph.appendChild(edge2);
      const edges = graph.getEdges();

      expect(edges).toHaveLength(2);
      expect(edges).toContain(edge1);
      expect(edges).toContain(edge2);
    });

    test('should get edge by id', () => {
      const graph = new Graph({ container: 'container' });
      const node1 = new Node({ id: 'node-1', x: 100, y: 100 });
      const node2 = new Node({ id: 'node-2', x: 200, y: 200 });
      const edge = new Edge({
        id: 'test-edge',
        source: node1,
        target: node2,
      });

      graph.appendChild(node1);
      graph.appendChild(node2);
      graph.appendChild(edge);
      const retrieved = graph.getEdgeById('test-edge');

      expect(retrieved).toBe(edge);
    });
  });

  describe('Data Management', () => {
    test('should set data with nodes and edges', () => {
      const graph = new Graph({ container: 'container' });
      const data: GraphData = {
        nodes: [
          { id: 'node-1', x: 100, y: 100 },
          { id: 'node-2', x: 200, y: 200 },
        ],
        edges: [
          { id: 'edge-1', source: 'node-1', target: 'node-2' },
        ],
      };

      graph.setData(data);
      const nodes = graph.getNodes();
      const edges = graph.getEdges();

      expect(nodes).toHaveLength(2);
      expect(edges).toHaveLength(1);
    });

    test('should get data from graph', () => {
      const graph = new Graph({ container: 'container' });
      const node1 = new Node({ id: 'node-1', x: 100, y: 100 });
      const node2 = new Node({ id: 'node-2', x: 200, y: 200 });

      graph.appendChild(node1);
      graph.appendChild(node2);
      const data = graph.getData();

      expect(data.nodes).toHaveLength(2);
      expect(data.nodes[0].id).toBe('node-1');
      expect(data.nodes[1].id).toBe('node-2');
    });

    test('should clear existing data when setting new data', () => {
      const graph = new Graph({ container: 'container' });
      const node1 = new Node({ id: 'node-1', x: 100, y: 100 });
      graph.appendChild(node1);

      const data: GraphData = {
        nodes: [{ id: 'node-2', x: 200, y: 200 }],
        edges: [],
      };

      graph.setData(data);
      const nodes = graph.getNodes();

      expect(nodes).toHaveLength(1);
      expect(nodes[0].getId()).toBe('node-2');
    });
  });

  describe('Command History', () => {
    test('should have command history instance', () => {
      const graph = new Graph({ container: 'container' });
      expect(graph.commandHistory).toBeDefined();
    });

    test('should execute command', async () => {
      const graph = new Graph({ container: 'container' });
      const command = {
        execute: jest.fn(),
        undo: jest.fn(),
      };

      await graph.executeCommand(command);
      expect(command.execute).toHaveBeenCalled();
    });

    test('should undo command', async () => {
      const graph = new Graph({ container: 'container' });
      const command = {
        execute: jest.fn(),
        undo: jest.fn(),
      };

      await graph.executeCommand(command);
      await graph.undo();
      expect(command.undo).toHaveBeenCalled();
    });

    test('should redo command', async () => {
      const graph = new Graph({ container: 'container' });
      const command = {
        execute: jest.fn(),
        undo: jest.fn(),
      };

      await graph.executeCommand(command);
      await graph.undo();
      await graph.redo();
      expect(command.execute).toHaveBeenCalledTimes(2);
    });

    test('should check if can undo', () => {
      const graph = new Graph({ container: 'container' });
      expect(graph.canUndo()).toBe(false);
    });

    test('should check if can redo', () => {
      const graph = new Graph({ container: 'container' });
      expect(graph.canRedo()).toBe(false);
    });

    test('should clear history', () => {
      const graph = new Graph({ container: 'container' });
      graph.clearHistory();
      expect(graph.canUndo()).toBe(false);
      expect(graph.canRedo()).toBe(false);
    });
  });

  describe('Destroy', () => {
    test('should dispose all plugins when destroyed', () => {
      const graph = new Graph({ container: 'container' });
      const plugin: RenderingPlugin = {
        name: 'test-plugin',
        apply: jest.fn(),
        destroy: jest.fn(),
      };

      graph.use(plugin);
      graph.destroy();

      expect(plugin.destroy).toHaveBeenCalled();
    });
  });
});

describe('Graph with ConnectionPlugin', () => {
  test('should apply ConnectionPlugin', () => {
    const graph = new Graph({ container: 'container' });
    const plugin = new ConnectionPlugin();

    graph.use(plugin);
    const retrieved = graph.getPlugin('connection');

    expect(retrieved).toBe(plugin);
    expect(graph.context.renderingPlugins).toContain(plugin);
  });

  test('should dispose ConnectionPlugin', () => {
    const graph = new Graph({ container: 'container' });
    const plugin = new ConnectionPlugin();

    graph.use(plugin);
    graph.dispose('connection');
    const retrieved = graph.getPlugin('connection');

    expect(retrieved).toBeUndefined();
    expect(graph.context.renderingPlugins).not.toContain(plugin);
  });
});
