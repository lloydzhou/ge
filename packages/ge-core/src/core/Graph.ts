import { Canvas, CustomEvent } from '@antv/g-lite';
import type { GraphData } from '../types';
import { Node } from './Node';
import { Edge } from './Edge';

export class Graph extends Canvas {
  private nodesById: Map<string, Node> = new Map();
  private edgesById: Map<string, Edge> = new Map();
  public eventBus: EventTarget = new EventTarget();
  public plugins: Map<string, any> = new Map();

  constructor(config: any) {
    super(config);
    // expose renderer if provided so plugins can access it
    try {
      if (config && config.renderer) {
        (this as any).renderer = config.renderer;
      }
    } catch (e) {}
  }

  /**
   * Register a node reference in the lightweight registry
   */
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
      const node = new Node(nodeData);
      this.appendChild(node);
    });

    // Create edges
    data.edges.forEach((edgeData) => {
      try {
        const edge = new Edge(edgeData);
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

  /**
   * Add a node to the graph
   */
  addNode(nodeData: any): Node {
    const node = new Node(nodeData);
    this.appendChild(node);
    // register happens in appendChild
    return node;
  }

  /**
   * Remove a node from the graph
   */
  removeNode(nodeId: string): void {
    const node = this.getNodeById(nodeId) as Node;
    if (node) {
      // Remove connected edges first
      const connectedEdges: Edge[] = [];
      this.document.querySelectorAll('g-edge').forEach((edge: any) => {
        if (edge.getSource() === nodeId || edge.getTarget() === nodeId) {
          connectedEdges.push(edge);
        }
      });

      connectedEdges.forEach((edge) => {
        this.removeChild(edge);
      });

      // Remove node
      this.removeChild(node);
    }
  }

  /**
   * Add an edge to the graph
   */
  addEdge(edgeData: any): Edge {
    // Verify that source and target nodes exist
    const sourceNode = this.getNodeById(edgeData.source) as Node;
    const targetNode = this.getNodeById(edgeData.target) as Node;

    if (!sourceNode || !targetNode) {
      throw new Error('Source or target node does not exist');
    }

    const edge = new Edge(edgeData);
    this.appendChild(edge);
    return edge;
  }

  /**
   * Remove an edge from the graph
   */
  removeEdge(edgeId: string): void {
    const edge = this.getEdgeById(edgeId) as Edge;
    if (edge) {
      this.removeChild(edge);
    }
  }

  /**
   * Get a node by id
   */
  getNodeById(id: string): Node | undefined {
    const fromMap = this.nodesById.get(id);
    if (fromMap) return fromMap as Node;
    return this.document.getElementById(id) as Node;
  }

  /**
   * Get an edge by id
   */
  getEdgeById(id: string): Edge | undefined {
    const fromMap = this.edgesById.get(id);
    if (fromMap) return fromMap as Edge;
    return this.document.getElementById(id) as Edge;
  }

  /**
   * Get all nodes
   */
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

  /**
   * Get all edges
   */
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

  /**
   * Install a GE plugin. Plugin must implement { name:string, install(graph), uninstall(graph) }
   */
  installPlugin(plugin: any): void {
    if (!plugin || !plugin.name) return;
    try {
      if (typeof plugin.install === 'function') {
        plugin.install(this);
      }
      this.plugins.set(plugin.name, plugin);
    } catch (e) {
      console.warn('Failed to install plugin', plugin.name, e);
    }
  }

  /**
   * Uninstall a plugin by name
   */
  uninstallPlugin(name: string): void {
    const plugin = this.plugins.get(name);
    if (!plugin) return;
    try {
      if (typeof plugin.uninstall === 'function') {
        plugin.uninstall(this);
      }
    } catch (e) {
      console.warn('Failed to uninstall plugin', name, e);
    }
    this.plugins.delete(name);
  }

  /**
   * Uninstall all plugins
   */
  uninstallAllPlugins(): void {
    Array.from(this.plugins.keys()).forEach((name) => this.uninstallPlugin(name));
  }
}