import type { Command } from '../../types';
import type { Graph } from '../Graph';
import { Node } from '../node/Node';
import { Edge } from '../edge/Edge';
import type { NodeData, EdgeData } from '../../types';

/**
 * Base class for graph commands
 */
export abstract class GraphCommand implements Command {
  protected graph: Graph;

  constructor(graph: Graph) {
    this.graph = graph;
  }

  abstract execute(): void | Promise<void>;
  abstract undo(): void | Promise<void>;

  canExecute(): boolean {
    return true;
  }

  canUndo(): boolean {
    return true;
  }
}

/**
 * Helper function to resolve shape constructor from string or class
 */
function resolveShape(graph: Graph, shape: string | any): any {
  if (typeof shape === 'string') {
    try {
      const ctor = (graph as any).customElements?.get?.(shape);
      if (ctor) return ctor;
    } catch (e) {
      // ignore
    }
  }
  return shape;
}

/**
 * Command to add a node to the graph
 */
export class AddNodeCommand extends GraphCommand {
  private node: Node | null = null;
  private nodeData: NodeData;

  constructor(graph: Graph, nodeData: NodeData) {
    super(graph);
    this.nodeData = nodeData;
  }

  async execute(): Promise<void> {
    if (!this.node) {
      // Resolve shape if it's a string
      const shape = resolveShape(this.graph, this.nodeData.shape);
      const nodeData = { ...this.nodeData, shape };

      this.node = new Node(nodeData);
      this.graph.appendChild(this.node);
    }
  }

  async undo(): Promise<void> {
    if (this.node) {
      this.graph.removeChild(this.node);
      this.node = null;
    }
  }

  canUndo(): boolean {
    return this.node !== null;
  }
}

/**
 * Command to remove a node from the graph
 */
export class RemoveNodeCommand extends GraphCommand {
  private node: Node;
  private connectedEdges: Edge[] = [];

  constructor(graph: Graph, node: Node | string) {
    super(graph);
    if (typeof node === 'string') {
      const found = this.graph.getNodeById(node);
      if (!found) {
        throw new Error(`Node ${node} not found`);
      }
      this.node = found;
    } else {
      this.node = node;
    }
  }

  async execute(): Promise<void> {
    // Store connected edges before removing
    this.connectedEdges = this.graph.getEdges().filter(edge => {
      const source = edge.getSource();
      const target = edge.getTarget();
      return source === this.node.getId() || target === this.node.getId();
    });

    // Remove connected edges first
    this.connectedEdges.forEach(edge => {
      this.graph.removeChild(edge);
    });

    // Remove the node
    this.graph.removeChild(this.node);
  }

  async undo(): Promise<void> {
    // Re-add the node
    this.graph.appendChild(this.node);

    // Re-add connected edges
    for (const edge of this.connectedEdges) {
      try {
        this.graph.appendChild(edge);
      } catch (e) {
        console.warn('Failed to restore edge:', edge.getId?.() || edge, e);
      }
    }
  }
}

/**
 * Command to add an edge to the graph
 */
export class AddEdgeCommand extends GraphCommand {
  private edge: Edge | null = null;
  private edgeData: EdgeData;

  constructor(graph: Graph, edgeData: EdgeData) {
    super(graph);
    this.edgeData = edgeData;
  }

  async execute(): Promise<void> {
    if (!this.edge) {
      // Verify that source and target nodes exist
      const sourceNode = this.graph.getNodeById(this.edgeData.source as string);
      const targetNode = this.graph.getNodeById(this.edgeData.target as string);

      if (!sourceNode || !targetNode) {
        throw new Error('Source or target node does not exist');
      }

      // Resolve shape if it's a string
      const shape = resolveShape(this.graph, this.edgeData.shape);
      const edgeData = { ...this.edgeData, shape };

      this.edge = new Edge(edgeData);
      this.graph.appendChild(this.edge);
    }
  }

  async undo(): Promise<void> {
    if (this.edge) {
      this.graph.removeChild(this.edge);
      this.edge = null;
    }
  }

  canUndo(): boolean {
    return this.edge !== null;
  }
}

/**
 * Command to remove an edge from the graph
 */
export class RemoveEdgeCommand extends GraphCommand {
  private edge: Edge;

  constructor(graph: Graph, edge: Edge | string) {
    super(graph);
    if (typeof edge === 'string') {
      const found = this.graph.getEdgeById(edge);
      if (!found) {
        throw new Error(`Edge ${edge} not found`);
      }
      this.edge = found;
    } else {
      this.edge = edge;
    }
  }

  async execute(): Promise<void> {
    this.graph.removeChild(this.edge);
  }

  async undo(): Promise<void> {
    this.graph.appendChild(this.edge);
  }
}

/**
 * Command to update node position
 */
export class MoveNodeCommand extends GraphCommand {
  private nodeId: string;
  private oldPosition: [number, number];
  private newPosition: [number, number];

  constructor(graph: Graph, nodeId: string, newPosition: [number, number]) {
    super(graph);
    this.nodeId = nodeId;
    this.newPosition = newPosition;
    const node = this.graph.getNodeById(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }
    this.oldPosition = node.getPosition();
  }

  async execute(): Promise<void> {
    const node = this.graph.getNodeById(this.nodeId);
    if (node) {
      node.setPosition(this.newPosition[0], this.newPosition[1]);
    }
  }

  async undo(): Promise<void> {
    const node = this.graph.getNodeById(this.nodeId);
    if (node) {
      node.setPosition(this.oldPosition[0], this.oldPosition[1]);
    }
  }
}

/**
 * Command to update node data
 */
export class UpdateNodeCommand extends GraphCommand {
  private nodeId: string;
  private oldData: Partial<NodeData>;
  private newData: Partial<NodeData>;

  constructor(graph: Graph, nodeId: string, newData: Partial<NodeData>) {
    super(graph);
    this.nodeId = nodeId;
    this.newData = newData;
    const node = this.graph.getNodeById(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }
    // Store a snapshot of current data
    this.oldData = { ...node.getData() };
  }

  async execute(): Promise<void> {
    const node = this.graph.getNodeById(this.nodeId);
    if (node) {
      // Merge new data with existing data
      Object.assign(node.getData(), this.newData);
    }
  }

  async undo(): Promise<void> {
    const node = this.graph.getNodeById(this.nodeId);
    if (node) {
      // Restore old data
      Object.assign(node.getData(), this.oldData);
    }
  }
}

/**
 * Command to update edge data
 */
export class UpdateEdgeCommand extends GraphCommand {
  private edgeId: string;
  private oldData: Partial<EdgeData>;
  private newData: Partial<EdgeData>;

  constructor(graph: Graph, edgeId: string, newData: Partial<EdgeData>) {
    super(graph);
    this.edgeId = edgeId;
    this.newData = newData;
    const edge = this.graph.getEdgeById(edgeId);
    if (!edge) {
      throw new Error(`Edge ${edgeId} not found`);
    }
    // Store a snapshot of current data
    this.oldData = { ...edge.getData() };
  }

  async execute(): Promise<void> {
    const edge = this.graph.getEdgeById(this.edgeId);
    if (edge) {
      // Merge new data with existing data
      Object.assign(edge.getData(), this.newData);
    }
  }

  async undo(): Promise<void> {
    const edge = this.graph.getEdgeById(this.edgeId);
    if (edge) {
      // Restore old data
      Object.assign(edge.getData(), this.oldData);
    }
  }
}

/**
 * Batch command for executing multiple commands as one
 */
export class BatchCommand extends GraphCommand {
  private commands: Command[];
  private executed: Command[] = [];

  constructor(graph: Graph, commands: Command[]) {
    super(graph);
    this.commands = commands;
  }

  async execute(): Promise<void> {
    this.executed = [];
    for (const command of this.commands) {
      if (command.canExecute()) {
        await command.execute();
        this.executed.push(command);
      }
    }
  }

  async undo(): Promise<void> {
    // Undo in reverse order
    for (let i = this.executed.length - 1; i >= 0; i--) {
      const command = this.executed[i];
      if (command.canUndo()) {
        await command.undo();
      }
    }
    this.executed = [];
  }

  canExecute(): boolean {
    return this.commands.some(cmd => cmd.canExecute());
  }

  canUndo(): boolean {
    return this.executed.length > 0 && this.executed.every(cmd => cmd.canUndo());
  }
}
