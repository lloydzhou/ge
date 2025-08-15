import { CustomElement, Line, Text, DisplayObject, Polyline, DisplayObjectConfig } from '@antv/g-lite';
import type { BaseEdgeStyleProps } from '../types';

export interface EdgeStyleProps extends BaseEdgeStyleProps {
  stroke?: string;
  lineWidth?: number;
  lineDash?: number[];
  label?: string;
  labelFill?: string;
  labelFontSize?: number;
}

export interface EdgeConfig {
  id: string;
  source: string | any; // 支持字符串ID或直接对象引用(Node/Port)
  target: string | any; // 支持字符串ID或直接对象引用(Node/Port)  
  style?: EdgeStyleProps;
  [key: string]: any;
}

export class Edge<T extends DisplayObject = Line> extends CustomElement<EdgeStyleProps> {
  private primaryShape: T;
  private label: Text;
  private data: any;
  private sourceNode: any = null;
  private targetNode: any = null;
  private _onSourceMoved: any = null;
  private _onTargetMoved: any = null;

  constructor(config: EdgeConfig) {
    super({
      ...config,
      className: 'g-edge',
      id: config.id,
    });
    this.data = config;
    
    // Create default styles if not provided
    const style: EdgeStyleProps = {
      stroke: '#000',
      lineWidth: 1,
      lineDash: [],
      label: '',
      labelFill: '#000',
      labelFontSize: 12,
      ...config.style
    };
    
    this.primaryShape = this.createPrimaryShape({
      ...config,
      id: `${config.id}-primary`,
      style: {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        stroke: style.stroke,
        lineWidth: style.lineWidth,
        lineDash: style.lineDash
      }
    });
    
    // Create the edge label
    this.label = new Text({
      style: {
        text: style.label || '',
        fill: style.labelFill || '#000',
        fontSize: style.labelFontSize || 12,
        textAlign: 'center',
        textBaseline: 'middle'
      }
    });
    
    // Add children to the group
    super.appendChild(this.primaryShape);
    super.appendChild(this.label);
  }
  
  protected createPrimaryShape(config: DisplayObjectConfig<any>): T {
    // This method should be overridden by subclasses to create the appropriate shape
    // For the base Edge class, we default to Line
    return new Line(config) as unknown as T;
  }

  /**
   * Connect edge to source and target node objects
   */
  connectTo(sourceNode: any, targetNode: any) {
    // Unsubscribe previous listeners
    if (this._onSourceMoved && this.sourceNode) {
      const busParent = this._findGraphParent();
      if (busParent && busParent.eventBus) {
        busParent.eventBus.removeEventListener('node:moved', this._onSourceMoved);
      }
    }
    if (this._onTargetMoved && this.targetNode) {
      const busParent = this._findGraphParent();
      if (busParent && busParent.eventBus) {
        busParent.eventBus.removeEventListener('node:moved', this._onTargetMoved);
      }
    }

    this.sourceNode = sourceNode;
    this.targetNode = targetNode;

    // Setup listeners to update when nodes move
    const graph = this._findGraphParent();
    if (graph && graph.eventBus) {
      this._onSourceMoved = (e: any) => {
        if (!this.sourceNode) return;
        if (e.detail?.id === this.sourceNode.getId()) {
          this.updatePositionFromNodes();
        }
      };
      this._onTargetMoved = (e: any) => {
        if (!this.targetNode) return;
        if (e.detail?.id === this.targetNode.getId()) {
          this.updatePositionFromNodes();
        }
      };
      graph.eventBus.addEventListener('node:moved', this._onSourceMoved);
      graph.eventBus.addEventListener('node:moved', this._onTargetMoved);
    }

    // Initial update
    this.updatePositionFromNodes();
  }

  private _findGraphParent(): any {
    try {
      let parent: any = this.parent;
      while (parent) {
        if (parent.constructor && parent.constructor.name === 'Graph') {
          return parent;
        }
        parent = parent.parent;
      }
    } catch (e) {
      // ignore
    }
    return null;
  }
  
  /**
   * Position the label in the center of the primary shape
   * Uses bounding box to calculate the center position
   */
  private positionLabel(): void {
    try {
      // Get the bounding box of the primary shape
      // getBBox returns a DOMRect with x, y, width, height properties
      const bbox = this.primaryShape.getBBox();
      
      if (bbox) {
        // Calculate center from DOMRect properties
        const centerX = bbox.x + bbox.width / 2;
        const centerY = bbox.y + bbox.height / 2;
        this.label.setLocalPosition([centerX, centerY]);
      } else {
        // Fallback to mid-point calculation for lines
        if (this.primaryShape instanceof Line) {
          const x1 = this.primaryShape.style.x1 || 0;
          const y1 = this.primaryShape.style.y1 || 0;
          const x2 = this.primaryShape.style.x2 || 0;
          const y2 = this.primaryShape.style.y2 || 0;
          this.label.setLocalPosition([(x1 + x2) / 2, (y1 + y2) / 2]);
        } else {
          // Fallback to a default position
          this.label.setLocalPosition([150, 100]);
        }
      }
    } catch (error) {
      // Fallback to mid-point calculation for lines
      if (this.primaryShape instanceof Line) {
        const x1 = this.primaryShape.style.x1 || 0;
        const y1 = this.primaryShape.style.y1 || 0;
        const x2 = this.primaryShape.style.x2 || 0;
        const y2 = this.primaryShape.style.y2 || 0;
        this.label.setLocalPosition([(x1 + x2) / 2, (y1 + y2) / 2]);
      } else {
        // Fallback to a default position
        this.label.setLocalPosition([150, 100]);
      }
    }
  }
  
  /**
   * Update edge position based on connected nodes
   */
  updatePositionFromNodes(): void {
    try {
      const getEndpointPosition = (endpoint: any): [number, number] => {
        // If it's a port, use its absolute position
        if (endpoint && typeof endpoint.getAbsolutePosition === 'function') {
          return endpoint.getAbsolutePosition();
        }
        
        // If it's a node, get its edge position (closest point on border)
        if (endpoint && typeof endpoint.getPrimaryShape === 'function') {
          const shape = endpoint.getPrimaryShape();
          const [nodeX, nodeY] = endpoint.getPosition(); // 获取节点在图中的位置
          
          return [nodeX, nodeY]; // 先返回节点中心，稍后计算边缘交点
        }
        
        // Final fallback: use node position or [0,0]
        if (endpoint && typeof endpoint.getPosition === 'function') {
          const pos = endpoint.getPosition();
          return [pos[0] || 0, pos[1] || 0];
        }
        
        return [0, 0];
      };

      const [x1, y1] = getEndpointPosition(this.sourceNode);
      const [x2, y2] = getEndpointPosition(this.targetNode);

      // 如果两个端点都是节点，计算边缘交点
      let finalX1 = x1, finalY1 = y1, finalX2 = x2, finalY2 = y2;
      
      if (this.sourceNode && typeof this.sourceNode.getPrimaryShape === 'function' &&
          this.targetNode && typeof this.targetNode.getPrimaryShape === 'function') {
        
        // 计算从源节点到目标节点的方向
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          const dirX = dx / distance;
          const dirY = dy / distance;
          
          // 计算源节点边缘交点
          const sourceEdge = this.getNodeEdgePoint(this.sourceNode, dirX, dirY);
          if (sourceEdge) {
            finalX1 = sourceEdge[0];
            finalY1 = sourceEdge[1];
          }
          
          // 计算目标节点边缘交点（方向相反）
          const targetEdge = this.getNodeEdgePoint(this.targetNode, -dirX, -dirY);
          if (targetEdge) {
            finalX2 = targetEdge[0];
            finalY2 = targetEdge[1];
          }
        }
      }

      if (this.primaryShape instanceof Line) {
        this.primaryShape.attr({ x1: finalX1, y1: finalY1, x2: finalX2, y2: finalY2 });
      } else if (this.primaryShape instanceof Polyline) {
        this.primaryShape.attr({
          points: [
            [finalX1, finalY1],
            [(finalX1 + finalX2) / 2, (finalY1 + finalY2) / 2],
            [finalX2, finalY2],
          ],
        });
      }

      this.positionLabel();
    } catch (e) {
      console.warn('Failed to update edge position:', e);
    }
  }

  /**
   * 计算节点边缘与给定方向射线的交点
   */
  private getNodeEdgePoint(node: any, dirX: number, dirY: number): [number, number] | null {
    if (!node || typeof node.getPrimaryShape !== 'function') {
      return null;
    }

    const shape = node.getPrimaryShape();
    const [nodeX, nodeY] = node.getPosition();

    if (shape && shape.style) {
      if (shape.nodeName === 'circle') {
        // 圆形：计算射线与圆的交点
        const r = shape.style.r || 0;
        const cx = nodeX + (shape.style.cx || 0);
        const cy = nodeY + (shape.style.cy || 0);
        
        return [cx + dirX * r, cy + dirY * r];
      } 
      else if (shape.nodeName === 'rect') {
        // 矩形：计算射线与矩形边界的交点
        const x = nodeX + (shape.style.x || 0);
        const y = nodeY + (shape.style.y || 0);
        const width = shape.style.width || 0;
        const height = shape.style.height || 0;
        
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        
        // 计算射线与矩形四边的交点，选择最近的
        const intersections: [number, number][] = [];
        
        // 右边 (x = x + width)
        if (dirX > 0) {
          const t = (x + width - centerX) / dirX;
          const intersectY = centerY + dirY * t;
          if (intersectY >= y && intersectY <= y + height) {
            intersections.push([x + width, intersectY]);
          }
        }
        
        // 左边 (x = x)
        if (dirX < 0) {
          const t = (x - centerX) / dirX;
          const intersectY = centerY + dirY * t;
          if (intersectY >= y && intersectY <= y + height) {
            intersections.push([x, intersectY]);
          }
        }
        
        // 下边 (y = y + height)
        if (dirY > 0) {
          const t = (y + height - centerY) / dirY;
          const intersectX = centerX + dirX * t;
          if (intersectX >= x && intersectX <= x + width) {
            intersections.push([intersectX, y + height]);
          }
        }
        
        // 上边 (y = y)
        if (dirY < 0) {
          const t = (y - centerY) / dirY;
          const intersectX = centerX + dirX * t;
          if (intersectX >= x && intersectX <= x + width) {
            intersections.push([intersectX, y]);
          }
        }
        
        // 返回最近的交点（通常只有一个有效交点）
        if (intersections.length > 0) {
          return intersections[0];
        }
        
        // 如果没有找到交点，返回中心点
        return [centerX, centerY];
      }
    }
    
    // 其他形状或无法计算时，返回节点中心
    return [nodeX, nodeY];
  }
  
  /**
   * Get the edge ID
   */
  getId(): string {
    return this.data.id;
  }
  
  /**
   * Get the source node ID or object
   */
  getSource(): string | any {
    return this.data.source;
  }
  
  /**
   * Get the target node ID or object
   */
  getTarget(): string | any {
    return this.data.target;
  }
  
  /**
   * Get the edge data
   */
  getData(): any {
    return this.data;
  }
  
  /**
   * Get the primary shape
   */
  getPrimaryShape(): T {
    return this.primaryShape;
  }
  
  connectedCallback() {
    // Initialize edge when connected to DOM
    console.log('Edge connected:', this.data.id);

    // Give a bit more time for nodes to be registered and ports to be created
    setTimeout(() => this._tryConnect(), 10);
  }

  private _tryConnect() {
    try {
      const graph = this._findGraphParent();
      let sourceNode = null;
      let targetNode = null;

      const resolveEndpoint = (endpoint: any) => {
        // 如果已经是对象(Node或Port)，直接返回
        if (endpoint && typeof endpoint === 'object' && (
          typeof endpoint.getId === 'function' || 
          typeof endpoint.getPrimaryShape === 'function' ||
          typeof endpoint.getAbsolutePosition === 'function'
        )) {
          return endpoint;
        }

        // 如果是字符串，解析ID
        if (typeof endpoint === 'string') {
          // support node:port syntax
          if (endpoint.includes(':')) {
            const [nodeId, ...rest] = endpoint.split(':');
            const portIdCandidate = rest.join(':');
            const node = graph && typeof graph.getNodeById === 'function' ? graph.getNodeById(nodeId) : null;
            if (node && typeof node.getPortById === 'function') {
              // try direct lookup with full id
              let port = null;
              try {
                port = node.getPortById(endpoint);
              } catch (e) {
                port = null;
              }
              // fallback: scan ports for suffix match (in case registration used different id forms)
              if (!port) {
                try {
                  const ports = typeof node.getPorts === 'function' ? node.getPorts() : [];
                  for (const p of ports) {
                    try {
                      const pid = typeof p.getId === 'function' ? String(p.getId()) : '';
                      if (pid === endpoint || pid.endsWith(':' + portIdCandidate) || pid === portIdCandidate) {
                        port = p;
                        break;
                      }
                    } catch (e) {}
                  }
                } catch (e) {}
              }

              if (port) {
                // Ensure port position is updated before connecting
                if (typeof (port as any).updatePosition === 'function') {
                  try { (port as any).updatePosition(); } catch (e) {}
                }
                return port;
              }
            }

            // if node exists but port not yet found, also try to query document by id
            try {
              const rootDoc = graph && graph.document ? graph.document : (globalThis as any).document;
              if (rootDoc && typeof rootDoc.getElementById === 'function') {
                const el = rootDoc.getElementById(endpoint);
                if (el) return el;
              }
            } catch (e) {}

            return null;
          }

          // 普通节点ID
          if (graph && typeof graph.getNodeById === 'function') {
            return graph.getNodeById(endpoint);
          }

          // fallback: try ancestor documentElement getElementById
          try {
            const rootDoc = graph && graph.document ? graph.document : (globalThis as any).document;
            if (rootDoc && typeof rootDoc.getElementById === 'function') {
              return rootDoc.getElementById(endpoint);
            }
          } catch (e) {}
        }

        return null;
      };

      sourceNode = resolveEndpoint(this.data.source);
      targetNode = resolveEndpoint(this.data.target);

      if (sourceNode && targetNode) {
        this.connectTo(sourceNode, targetNode);
      } else {
        console.warn(`Edge ${this.data.id}: Could not resolve endpoints`, {
          source: this.data.source,
          target: this.data.target,
          sourceNode,
          targetNode,
          sourceType: typeof this.data.source,
          targetType: typeof this.data.target,
          graphNodes: graph ? Array.from(graph.nodesById?.keys() || []) : [],
        });
      }
    } catch (e) {
      console.warn(`Failed to connect edge ${this.data.id}:`, e);
    }
  }
  
  disconnectedCallback() {
    // Cleanup when edge is removed from DOM
    console.log('Edge disconnected:', this.data.id);
    // remove event listeners
    try {
      const graph = this._findGraphParent();
      if (graph && graph.eventBus) {
        if (this._onSourceMoved) graph.eventBus.removeEventListener('node:moved', this._onSourceMoved);
        if (this._onTargetMoved) graph.eventBus.removeEventListener('node:moved', this._onTargetMoved);
      }
    } catch (e) {
      // ignore
    }
  }
}

// Predefined edge types
export class LineEdge extends Edge<Line> {
  protected createPrimaryShape(config: DisplayObjectConfig<any>): Line {
    return new Line(config);
  }
}

export class PolylineEdge extends Edge<Polyline> {
  protected createPrimaryShape(config: DisplayObjectConfig<any>): Polyline {
    return new Polyline(config);
  }
}