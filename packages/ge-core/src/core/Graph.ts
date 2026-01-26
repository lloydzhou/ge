import { Canvas, CustomEvent } from '@antv/g-lite';
import type { GraphData, GraphOptions, RenderingPlugin, RenderingPluginContext } from '../types';
import { Node } from './node/Node';
import { Edge } from './edge/Edge';
import { AnchorRegistry, type NodeAnchorFunction, type EdgeAnchorFunction } from './anchor/Anchor';

export class Graph extends Canvas {
  private nodesById: Map<string, Node> = new Map();
  private edgesById: Map<string, Edge> = new Map();
  public anchorRegistry: AnchorRegistry;

  constructor(config: GraphOptions) {
    super(config as any); // GraphOptions extends CanvasConfig but may have extra properties

    // Initialize anchor registry
    this.anchorRegistry = new AnchorRegistry();

    // Expose renderer if provided so plugins can access it
    try {
      if (config && config.renderer) {
        (this as any).renderer = config.renderer;
      }
    } catch (e) {
      // ignore
    }

    console.log('constructor', this);

    // Add graph reference to context so plugins can access it
    (this.context as any).graph = this;

    // Configure document draggable for camera panning
    // This enables g-plugin-dragndrop to handle canvas background dragging
    if (config.draggable) {
      try {
        this.document.style.draggable = true;
        // Set cursor on canvas DOM element
        const canvas = config.container;
        if (canvas && typeof canvas === 'string') {
          const el = document.getElementById(canvas);
          if (el) el.style.cursor = 'grab';
        } else if (canvas instanceof HTMLElement) {
          canvas.style.cursor = 'grab';
        }
        console.log('[Graph] Document draggable enabled, cursor set to grab');
      } catch (e) {
        console.warn('[Graph] Failed to set document draggable:', e);
      }
    }
  }

  // ============================================
  // Plugin Management (directly using Canvas's renderingPlugins)
  // ============================================

  /**
   * Apply a plugin to the graph
   * Plugin is added to Canvas's renderingPlugins array and receives RenderingPluginContext
   * @param plugin - Plugin with apply(context, runtime) method
   * @returns this for chaining
   */
  use(plugin: RenderingPlugin): this {
    if (!plugin) {
      console.warn('Invalid plugin: plugin is undefined or null');
      return this;
    }

    try {
      // Add to Canvas's renderingPlugins array
      if (this.context?.renderingPlugins) {
        this.context.renderingPlugins.push(plugin);
      }

      // Call plugin's apply method with RenderingPluginContext
      const runtime = (this as any).globalRuntime;
      plugin.apply(this.context as RenderingPluginContext, runtime);
    } catch (e) {
      const pluginName = (plugin as any).name || 'unknown';
      console.error(`Failed to apply plugin ${pluginName}:`, e);
    }

    return this;
  }

  /**
   * Remove a plugin from the graph
   * @param pluginName - Name of the plugin to remove
   * @returns this for chaining
   */
  dispose(pluginName: string): this {
    if (!this.context?.renderingPlugins) {
      console.warn('Plugin system not available');
      return this;
    }

    const index = this.context.renderingPlugins.findIndex((p) => (p as any).name === pluginName);
    if (index === -1) {
      console.warn(`Plugin "${pluginName}" not found`);
      return this;
    }

    try {
      const plugin = this.context.renderingPlugins[index] as any;
      // Call plugin's destroy method if it exists
      if (typeof plugin.destroy === 'function') {
        plugin.destroy();
      }
      // Remove from renderingPlugins array
      this.context.renderingPlugins.splice(index, 1);
    } catch (e) {
      console.error(`Failed to dispose plugin ${pluginName}:`, e);
    }

    return this;
  }

  /**
   * Get a plugin by name
   */
  getPlugin(name: string): RenderingPlugin | undefined {
    if (!this.context?.renderingPlugins) return undefined;
    return this.context.renderingPlugins.find((p) => (p as any).name === name);
  }

  /**
   * Get all plugins
   */
  getPlugins(): RenderingPlugin[] {
    if (!this.context?.renderingPlugins) return [];
    return this.context.renderingPlugins;
  }

  /**
   * Remove all plugins
   */
  disposeAllPlugins(): this {
    if (!this.context?.renderingPlugins) return this;

    // Collect plugin names first to avoid modification during iteration
    const pluginsWithNames = this.context.renderingPlugins
      .map((p, i) => ({ plugin: p, name: (p as any).name, index: i }))
      .filter(({ name }) => name);

    // Dispose in reverse order to maintain proper cleanup
    for (let i = pluginsWithNames.length - 1; i >= 0; i--) {
      const { name } = pluginsWithNames[i];
      this.dispose(name);
    }

    return this;
  }

  // ============================================
  // Registry Management
  // ============================================

  registerNode(node: Node): void {
    try {
      const id = node.getId();
      if (id) this.nodesById.set(id, node);
    } catch (e) {
      // ignore
    }
  }

  unregisterNode(node: Node): void {
    try {
      const id = node.getId();
      if (id) this.nodesById.delete(id);
    } catch (e) {
      // ignore
    }
  }

  registerEdge(edge: Edge): void {
    try {
      const id = edge.getId();
      if (id) this.edgesById.set(id, edge);
    } catch (e) {
      // ignore
    }
  }

  unregisterEdge(edge: Edge): void {
    try {
      const id = edge.getId();
      if (id) this.edgesById.delete(id);
    } catch (e) {
      // ignore
    }
  }

  // ============================================
  // Anchor Management
  // ============================================

  /**
   * Register a custom NodeAnchor
   * @param name - Anchor name (e.g., 'custom-top')
   * @param fn - Anchor function
   */
  registerNodeAnchor(name: string, fn: NodeAnchorFunction): this {
    this.anchorRegistry.registerNodeAnchor(name, fn);
    return this;
  }

  /**
   * Register a custom EdgeAnchor
   * @param name - Anchor name (e.g., 'quarter')
   * @param fn - Anchor function
   */
  registerEdgeAnchor(name: string, fn: EdgeAnchorFunction): this {
    this.anchorRegistry.registerEdgeAnchor(name, fn);
    return this;
  }

  /**
   * Register both NodeAnchor and EdgeAnchor (same function)
   * @param name - Anchor name
   * @param fn - Anchor function
   */
  registerAnchor(name: string, fn: NodeAnchorFunction | EdgeAnchorFunction): this {
    this.anchorRegistry.registerNodeAnchor(name, fn as NodeAnchorFunction);
    this.anchorRegistry.registerEdgeAnchor(name, fn as EdgeAnchorFunction);
    return this;
  }

  /**
   * Get a NodeAnchor function by name or definition
   */
  getNodeAnchor(definition: string | { name: string; args?: any }): NodeAnchorFunction | undefined {
    if (typeof definition === 'string') {
      return this.anchorRegistry.getNodeAnchor(definition);
    }
    return this.anchorRegistry.resolveNodeAnchor(definition);
  }

  /**
   * Get an EdgeAnchor function by name or definition
   */
  getEdgeAnchor(definition: string | { name: string; args?: any }): EdgeAnchorFunction | undefined {
    if (typeof definition === 'string') {
      return this.anchorRegistry.getEdgeAnchor(definition);
    }
    return this.anchorRegistry.resolveEdgeAnchor(definition);
  }

  /**
   * List all registered NodeAnchors
   */
  listNodeAnchors(): string[] {
    return this.anchorRegistry.listNodeAnchors();
  }

  /**
   * List all registered EdgeAnchors
   */
  listEdgeAnchors(): string[] {
    return this.anchorRegistry.listEdgeAnchors();
  }

  // Override appendChild/removeChild to keep registry in sync
  appendChild(child: any): any {
    const res = super.appendChild(child);
    if (child && typeof child.getId === 'function') {
      // Heuristic: if it looks like a Node, register it
      if ((child as any).className === 'g-node' || typeof (child as any).getPrimaryShape === 'function') {
        this.registerNode(child as Node);
      }
      if ((child as any).className === 'g-edge' || typeof (child as any).getSource === 'function') {
        this.registerEdge(child as Edge);
      }
    }
    return res;
  }

  removeChild(child: any): any {
    const res = super.removeChild(child);
    if (child && typeof child.getId === 'function') {
      if ((child as any).className === 'g-node' || typeof (child as any).getPrimaryShape === 'function') {
        this.unregisterNode(child as Node);
      }
      if ((child as any).className === 'g-edge' || typeof (child as any).getSource === 'function') {
        this.unregisterEdge(child as Edge);
      }
    }
    return res;
  }

  // ============================================
  // Data Management
  // ============================================

  /**
   * Load graph data
   */
  setData(data: GraphData): void {
    // Clear existing nodes and edges
    this.document.documentElement.removeChildren();

    // Clear registries
    this.nodesById.clear();
    this.edgesById.clear();

    // Create nodes
    data.nodes.forEach((nodeData) => {
      try {
        // 如果 shape 是字符串，尝试从 graph 的 customElements 中解析为 ctor
        try {
          if (nodeData && typeof nodeData.shape === 'string') {
            const ctor = (this as any).customElements?.get?.(nodeData.shape);
            if (ctor) nodeData = { ...nodeData, shape: ctor };
          }
        } catch (e) {
          // ignore
        }

        // Cast to NodeConfig (with index signature) from NodeData
        const node = new Node(nodeData as any);
        this.appendChild(node);
      } catch (e) {
        // ignore
      }
    });

    // Create edges
    data.edges.forEach((edgeData) => {
      try {
        // 如果 edge shape 是字符串，尝试从 graph 的 customElements 中解析为 ctor
        try {
          if (edgeData && typeof edgeData.shape === 'string') {
            const ctor = (this as any).customElements?.get?.(edgeData.shape);
            if (ctor) edgeData = { ...edgeData, shape: ctor };
          }
        } catch (e) {
          // ignore
        }

        // Cast to EdgeConfig (with index signature) from EdgeData
        const edge = new Edge(edgeData as any);
        this.appendChild(edge);
      } catch (e: any) {
        // Skip edges with missing nodes
        console.warn(`Failed to create edge ${edgeData.id}: ${e.message}`);
      }
    });

    // Dispatch a custom event to notify that graph data has been loaded
    this.dispatchEvent(new CustomEvent('graphdataloaded', { data }));
  }

  /**
   * Get current graph data
   */
  getData(): GraphData {
    const nodes: any[] = [];
    const edges: any[] = [];

    // Collect all nodes from registry
    this.nodesById.forEach((node) => {
      try {
        nodes.push(node.getData());
      } catch (e) {}
    });

    // Collect all edges from registry
    this.edgesById.forEach((edge) => {
      try {
        edges.push(edge.getData());
      } catch (e) {}
    });

    // Fallback: if registry empty, use DOM queries
    if (nodes.length === 0) {
      this.document.querySelectorAll('g-node').forEach((node: any) => {
        nodes.push(node.getData());
      });
    }

    if (edges.length === 0) {
      this.document.querySelectorAll('g-edge').forEach((edge: any) => {
        edges.push(edge.getData());
      });
    }

    return { nodes, edges };
  }

  // ============================================
  // Element Access
  // ============================================

  getNodeById(id: string): Node | undefined {
    const fromMap = this.nodesById.get(id);
    if (fromMap) return fromMap as unknown as Node;
    return this.document.getElementById(id) as unknown as Node;
  }

  getEdgeById(id: string): Edge | undefined {
    const fromMap = this.edgesById.get(id);
    if (fromMap) return fromMap as unknown as Edge;
    return this.document.getElementById(id) as unknown as Edge;
  }

  getNodes(): Node[] {
    const nodes: Node[] = [];
    this.nodesById.forEach((n) => nodes.push(n));
    if (nodes.length === 0) {
      this.document.querySelectorAll('g-node').forEach((node: any) => {
        nodes.push(node);
      });
    }
    return nodes;
  }

  getEdges(): Edge[] {
    const edges: Edge[] = [];
    this.edgesById.forEach((e) => edges.push(e));
    if (edges.length === 0) {
      this.document.querySelectorAll('g-edge').forEach((edge: any) => {
        edges.push(edge);
      });
    }
    return edges;
  }

  // ============================================
  // Cleanup
  // ============================================

  destroy(cleanUp?: boolean, skipTriggerEvent?: boolean): void {
    // Dispose all plugins first
    this.disposeAllPlugins();

    // Call parent destroy
    super.destroy(cleanUp, skipTriggerEvent);
  }
}
