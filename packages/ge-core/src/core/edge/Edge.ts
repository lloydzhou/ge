import { Line, Text, DisplayObject, Polyline } from '@antv/g-lite';
import { resolveCtor } from '../../utils/shapeResolver';
import type { Vec2 } from '../../types';
import { computeAnchor } from '../../utils/edgeLayout';
import { resolveAnchorFunction } from '../../utils/nodeAnchor';
import type { BaseEdgeStyleProps, EdgeData, EdgeMarkerConfig } from '../../types';
import { EdgeMarker } from './EdgeMarker';
import type { DisplayObjectConfigWithShape } from '../../types';
import type { EdgeRouter } from './EdgeRouter';
import { NormalRouter } from './EdgeRouter';
import type { EdgeConnector } from './EdgeConnector';
import { NormalConnector } from './EdgeConnector';
import type { Node } from '../node/Node';
import type { Port } from '../port/Port';
import { ItemElement } from '../ItemElement';
import { ItemLabelElement } from '../ItemLabelElement';
import { GEInteractiveElement } from '../GEInteractiveElement';

export interface EdgeStyleProps extends BaseEdgeStyleProps {
  stroke?: string;
  lineWidth?: number;
  lineDash?: number[];
  label?: string;
  labelFill?: string;
  labelFontSize?: number;
  labelOffset?: number; // offset along normal for label
  router?: EdgeRouter; // 路由器
  connector?: EdgeConnector; // 连接器
  vertices?: Vec2[]; // 中间点
  startMarker?: EdgeMarkerConfig & { typeName?: string }; // Backward compatibility
  endMarker?: EdgeMarkerConfig & { typeName?: string }; // Backward compatibility
}

export interface EdgeConfig extends EdgeData {
  [key: string]: unknown;
}

export type EdgeEndpoint = string | Node | Port | null;

/**
 * Edge class with generic path support
 *
 * Extends ItemElement to provide collection management (tools/ports/labels)
 * and GEInteractiveElement for interaction capabilities.
 *
 * Edge uses a path (Line, Polyline, Path, etc.) as its primary shape.
 *
 * @template TPath - The display object type used as path shape (defaults to Line)
 *
 * @example
 * // Using default Line path
 * const edge = new Edge({ id: 'e1', source: 'n1', target: 'n2' });
 *
 * // Using custom connector type
 * const pathEdge = new Edge<Path>({ id: 'e2', source: 'n1', target: 'n2',
 *   style: { connector: new SmoothConnector() }
 * });
 */
export class Edge<TPath extends DisplayObject = Line> extends ItemElement<TPath> {
  private data!: EdgeConfig; // definite assignment assertion - set in constructor
  // Edge manages multiple labels using ItemLabelElement
  private _labelTexts: Map<string, ItemLabelElement> = new Map();
  private sourceNode: EdgeEndpoint = null;
  private targetNode: EdgeEndpoint = null;
  private _onSourceMoved: ((e: Event) => void) | null = null;
  private _onTargetMoved: ((e: Event) => void) | null = null;
  // markers
  private startMarkerObj: EdgeMarker | null = null;
  private endMarkerObj: EdgeMarker | null = null;
  private startMarkerCfg: NonNullable<EdgeStyleProps['startMarker']> = {};
  private endMarkerCfg: NonNullable<EdgeStyleProps['endMarker']> = {};
  private labelOffset: number = 0;
  
  constructor(config: EdgeConfig) {
    // Extract source and target before calling super (to avoid filtering by CustomElement)
    const { source, target, ...restConfig } = config;

    // Generate ID if not provided (unified method)
    restConfig.id = restConfig.id || GEInteractiveElement.generateId('edge');

    super({
      ...restConfig,
      className: 'g-edge',
      id: restConfig.id,
    });

    // Store config without id (this.id is the single source of truth, from CustomElement)
    const { id, ...configWithoutId } = restConfig;
    this.data = { ...configWithoutId, source, target } as EdgeConfig;

    // Create default styles if not provided
    const style: EdgeStyleProps = {
      stroke: '#000',
      lineWidth: 1,
      lineDash: [],
      label: '',
      labelFill: '#000',
      labelFontSize: 12,
      router: new NormalRouter(), // 默认使用直线路由器
      connector: new NormalConnector(), // 默认使用普通连接器
      ...(config.style || {})
    } as EdgeStyleProps;
    this.labelOffset = Number(style.labelOffset ?? 0);

    const defaultColor = style.stroke || '#000';
    this.startMarkerCfg = {
      enabled: !!(style.startMarker && style.startMarker.enabled),
      // removed `type` field; prefer `shape` only
      size: (style.startMarker && style.startMarker.size) ?? 4,
      fill: (style.startMarker && style.startMarker.fill) ?? defaultColor,
      stroke: (style.startMarker && style.startMarker.stroke) ?? defaultColor,
      lineWidth: (style.startMarker && style.startMarker.lineWidth) ?? (style.lineWidth || 1),
      // allow registry name passthrough
      shape: style.startMarker?.shape ?? style.startMarker?.typeName ?? 'circle',
    };
    this.endMarkerCfg = {
      enabled: style.endMarker?.enabled !== false, // 默认启用终点箭头
      // removed `type` field; prefer `shape` only
      size: (style.endMarker && style.endMarker.size) ?? 6,
      fill: (style.endMarker && style.endMarker.fill) ?? defaultColor,
      stroke: (style.endMarker && style.endMarker.stroke) ?? defaultColor,
      lineWidth: (style.endMarker && style.endMarker.lineWidth) ?? (style.lineWidth || 1),
      // allow registry name passthrough
      shape: style.endMarker?.shape ?? style.endMarker?.typeName ?? 'triangle',
    };
    
    this.primaryShape = null as unknown as TPath; // 初始化为空，在 updatePositionFromNodes 中创建
    
    // Create markers if enabled using EdgeMarker abstraction
    this.startMarkerObj = this.startMarkerCfg.enabled ? new EdgeMarker({
      enabled: this.startMarkerCfg.enabled,
      size: this.startMarkerCfg.size,
      fill: this.startMarkerCfg.fill,
      stroke: this.startMarkerCfg.stroke,
      lineWidth: this.startMarkerCfg.lineWidth,
      layout: this.startMarkerCfg.layout,
      // pass registry name/ctor under unified 'shape' field used by EdgeMarker
      shape: this.startMarkerCfg.shape,
    }, this) : null;
    this.endMarkerObj = this.endMarkerCfg.enabled ? new EdgeMarker({
      enabled: this.endMarkerCfg.enabled,
      size: this.endMarkerCfg.size,
      fill: this.endMarkerCfg.fill,
      stroke: this.endMarkerCfg.stroke,
      lineWidth: this.endMarkerCfg.lineWidth,
      layout: this.endMarkerCfg.layout,
      shape: this.endMarkerCfg.shape,
    }, this) : null;

    // Add markers to the group
    // primaryShape 将在 updatePositionFromNodes 中动态创建和添加
    if (this.startMarkerObj) super.appendChild(this.startMarkerObj);
    if (this.endMarkerObj) super.appendChild(this.endMarkerObj);

    // Edge uses multi-labels - users must explicitly provide labels array
    if (style.labels && Array.isArray(style.labels) && style.labels.length > 0) {
      // Multi-label mode: create labels from style.labels array
      style.labels.forEach((labelConfig, index) => {
        try {
          const labelId = labelConfig.id || `label-${index}`;
          this.addLabel(labelId, labelConfig);
        } catch (e) {
          console.warn('Failed to create edge label:', e);
        }
      });
    }
  }
  
  /**
   * Create the primary path shape
   * For Edge, this is called by updatePositionFromNodes using the connector
   * @param config - Configuration for the shape
   * @returns The path shape object
   */
  protected createPrimaryShape(config: DisplayObjectConfigWithShape<unknown>): TPath {
    // This method should be overridden by subclasses to create the appropriate shape
    // For the base Edge class, we default to Line
    // try resolving a registered ctor from config.shape if provided
    const ptype = config.shape;
    const ctor = resolveCtor(this, ptype);
    if (ctor) {
      try { return new ctor(config) as unknown as TPath; } catch (e) {}
    }
    return new Line(config as any) as unknown as TPath;
  }

  /**
   * Connect edge to source and target node objects
   */
  connectTo(sourceNode: EdgeEndpoint, targetNode: EdgeEndpoint): void {
    // Remove previous listeners from old source/target nodes
    if (this.sourceNode && typeof this.sourceNode === 'object') {
      (this.sourceNode as Node).removeEventListener?.('node:moved', this._onSourceMoved as any);
    }
    if (this.targetNode && typeof this.targetNode === 'object') {
      (this.targetNode as Node).removeEventListener?.('node:moved', this._onTargetMoved as any);
    }

    this.sourceNode = sourceNode;
    this.targetNode = targetNode;

    // Setup listeners directly on source and target nodes (DOM API style)
    this._onSourceMoved = this._handleSourceMoved.bind(this);
    this._onTargetMoved = this._handleTargetMoved.bind(this);

    // Helper: get the actual target to listen on (Node, or Port's owner Node)
    const getEventTarget = (endpoint: EdgeEndpoint): EdgeEndpoint | null => {
      if (!endpoint || typeof endpoint !== 'object') return null;
      // If endpoint is a Port, listen to its owner Node instead
      if (typeof (endpoint as Port).getAbsolutePosition === 'function') {
        const port = endpoint as Port;
        return port.owner || port;
      }
      return endpoint;
    };

    const sourceEventTarget = getEventTarget(sourceNode);
    const targetEventTarget = getEventTarget(targetNode);

    if (sourceEventTarget && typeof sourceEventTarget === 'object') {
      (sourceEventTarget as Node).addEventListener?.('node:moved', this._onSourceMoved as any);
    }
    if (targetEventTarget && typeof targetEventTarget === 'object') {
      (targetEventTarget as Node).addEventListener?.('node:moved', this._onTargetMoved as any);
    }

    // Initial update
    this.updatePositionFromNodes();
  }

  /**
   * Handle source node moved event
   */
  private _handleSourceMoved(_e: Event): void {
    console.log('[Edge._handleSourceMoved] Source node moved, updating edge', this.data.id);
    this.updatePositionFromNodes();
  }

  /**
   * Handle target node moved event
   */
  private _handleTargetMoved(_e: Event): void {
    console.log('[Edge._handleTargetMoved] Target node moved, updating edge', this.data.id);
    this.updatePositionFromNodes();
  }


  private updateMarkers() {
    // Delegating marker layout to EdgeMarker instances
    try {
      const pts = this.getEdgePoints();
      const startAnchor = computeAnchor(pts, this.startMarkerCfg.layout || { snap: 'start' });
      const endAnchor = computeAnchor(pts, this.endMarkerCfg.layout || { snap: 'end' });
      if (this.startMarkerObj) this.startMarkerObj.update(startAnchor);
      if (this.endMarkerObj) this.endMarkerObj.update(endAnchor);
    } catch (e) {
      // ignore
    }
  }

  private getEdgePoints(): Vec2[] {
    // 如果 primaryShape 不存在，返回默认值
    if (!this.primaryShape) {
      return [[0, 0], [0, 0]];
    }
    
    if (this.primaryShape instanceof Line) {
      const x1 = Number(this.primaryShape.style.x1) || 0;
      const y1 = Number(this.primaryShape.style.y1) || 0;
      const x2 = Number(this.primaryShape.style.x2) || 0;
      const y2 = Number(this.primaryShape.style.y2) || 0;
      return [[x1, y1], [x2, y2]];
    }
    if (this.primaryShape instanceof Polyline) {
      const polylineStyle = this.primaryShape.style as { points?: number[][] };
      const pts = polylineStyle.points;
      if (Array.isArray(pts) && pts.length >= 2) return pts as Vec2[];
    }
    // fallback: try bbox center for both ends (degenerate)
    try {
      const bbox = this.primaryShape.getBBox();
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      return [[cx, cy], [cx, cy]];
    } catch {
      return [[0, 0], [0, 0]];
    }
  }
  
  /**
   * Update edge position based on connected nodes
   */
  updatePositionFromNodes(): void {
    try {
      /**
       * 获取端点的连接点位置
       * 统一处理 Node 和 Port，都基于 primaryShape 计算锚点
       *
       * @param endpoint - 当前端点（source 或 target）
       * @param otherEndpoint - 另一端点
       * @param suggestedDir - Router 建议的方向（可选）
       * @returns 锚点位置（相对于画布原点）
       */
      const getEndpointPosition = (
        endpoint: EdgeEndpoint,
        otherEndpoint: EdgeEndpoint,
        suggestedDir?: Vec2
      ): [number, number] => {
        // 第一步：统一获取 primaryShape 和 position
        let primaryShape: DisplayObject | null = null;
        let position: [number, number] = [0, 0];

        if (typeof endpoint === 'string') {
          return [0, 0];
        }

        // 尝试作为 Port 处理
        if (typeof (endpoint as Port).getAbsolutePosition === 'function') {
          const port = endpoint as Port;
          primaryShape = (port as any).circle || (port as any).getPrimaryShape?.();
          position = (port as any).getPosition?.() || (port as Port).getAbsolutePosition();
        }
        // 尝试作为 Node 处理
        else if (typeof (endpoint as Node).getPrimaryShape === 'function') {
          const node = endpoint as Node;
          primaryShape = node.getPrimaryShape();
          const pos = node.getPosition();
          position = [pos[0], pos[1]] as [number, number];
        }
        // 兜底：尝试获取 position
        else if (typeof (endpoint as Node).getPosition === 'function') {
          const pos = (endpoint as Node).getPosition();
          position = [pos[0], pos[1]] as [number, number];
        }

        if (!primaryShape) {
          return position;
        }

        // 第二步：确定方向向量
        // 优先使用 Router 建议的方向，否则使用节点中心之间的方向
        let dirNorm: [number, number];
        if (suggestedDir) {
          // 使用 Router 建议的方向
          const dist = Math.sqrt(suggestedDir[0] ** 2 + suggestedDir[1] ** 2);
          dirNorm = dist > 0
            ? [suggestedDir[0] / dist, suggestedDir[1] / dist]
            : [0, 0];
        } else {
          // 使用节点中心之间的方向
          const otherPos = this._getEndpointCenter(otherEndpoint);
          const direction: [number, number] = [
            otherPos[0] - position[0],
            otherPos[1] - position[1]
          ];
          const dist = Math.sqrt(direction[0] ** 2 + direction[1] ** 2);
          dirNorm = dist > 0
            ? [direction[0] / dist, direction[1] / dist]
            : [0, 0];
        }

        // 第三步：根据形状类型选择合适的锚点
        // 检测形状类型：
        // 1. 优先使用 nodeName（如果明确是 circle/ellipse/rect）
        // 2. nodeName 不明确时，使用长宽比作为启发式判断
        const isCircleByType = primaryShape.nodeName === 'circle' || primaryShape.nodeName === 'ellipse';
        const isRectByType = primaryShape.nodeName === 'rect';

        // 只有当 nodeName 不明确时，才使用长宽比判断
        let isCircle = isCircleByType;
        if (!isCircleByType && !isRectByType) {
          const bounds = primaryShape.getLocalBounds?.();
          if (bounds) {
            const width = bounds.max[0] - bounds.min[0];
            const height = bounds.max[1] - bounds.min[1];
            const ratio = width / (height || 1);
            isCircle = ratio >= 0.75 && ratio <= 1.33;
          }
        }

        let anchorFn: ((shape: DisplayObject) => [number, number]) | null = null;

        if (isCircle) {
          // 圆形/椭圆：使用角度锚点
          const angle = Math.atan2(dirNorm[1], dirNorm[0]) * 180 / Math.PI;
          anchorFn = resolveAnchorFunction({
            name: 'angle',
            args: { angle }
          } as any);
        } else {
          // 矩形：使用 midSide（基于方向选择最近侧）
          anchorFn = resolveAnchorFunction({
            name: 'midSide',
            args: { direction: dirNorm }
          } as any);
        }

        // 第四步：计算并返回锚点位置
        if (anchorFn) {
          const [x, y] = anchorFn(primaryShape);
          return [x + position[0], y + position[1]];
        }

        return position;
      };

      // 统一流程：
      // 1. 询问 Router 的方向建议（如果有）
      // 2. 计算源节点锚点（基于 Router 的方向建议）
      // 3. 计算目标节点锚点（基于 Router 的方向建议）
      // 4. 用锚点位置调用 router.route()
      // 5. 完成

      const router = this.data.style?.router || new NormalRouter();
      const vertices = this.data.style?.vertices || [];

      // 获取节点中心位置
      const sourceCenter = this._getEndpointCenter(this.sourceNode);
      const targetCenter = this._getEndpointCenter(this.targetNode);

      // 询问 Router 的方向建议（如果有）
      let sourceDir: Vec2 | undefined;
      let targetDir: Vec2 | undefined;
      if ('getStartDirection' in router && 'getEndDirection' in router) {
        sourceDir = (router as any).getStartDirection(sourceCenter, targetCenter);
        targetDir = (router as any).getEndDirection(sourceCenter, targetCenter);
      }

      // 根据方向建议计算锚点位置
      const [x1, y1] = getEndpointPosition(
        this.sourceNode,
        this.targetNode,
        sourceDir
      );
      const [x2, y2] = getEndpointPosition(
        this.targetNode,
        this.sourceNode,
        targetDir
      );

      // 用锚点位置进行路由
      const anchorPoints: Vec2[] = [[x1, y1], [x2, y2]];
      const finalPoints = router.route(anchorPoints, vertices);

      // 使用 connector 创建或更新 primaryShape
      const connector = this.data.style?.connector || new NormalConnector();
      const style = {
        stroke: this.data.style?.stroke || '#000',
        lineWidth: this.data.style?.lineWidth || 1,
        lineDash: this.data.style?.lineDash || [],
        zIndex: 0, // Edge path should be below labels and markers
      };

      // 移除旧的 primaryShape
      if (this.primaryShape) {
        try {
          super.removeChild(this.primaryShape);
        } catch (e) {
          // ignore
        }
      }

      // 创建新的 primaryShape
      this.primaryShape = connector.connect(finalPoints, style) as TPath;

      // Insert primaryShape as the first child to render it below markers and labels
      // This ensures the edge path is always at the bottom of the rendering stack
      const firstChild = this.children?.[0] || null;
      if (firstChild) {
        super.insertBefore(this.primaryShape, firstChild as DisplayObject);
      } else {
        super.appendChild(this.primaryShape);
      }

      // update markers after primary shape laid out
      this.updateMarkers();

      // Update all labels' positions
      this.updateAllLabels();
    } catch (e) {
      console.warn('Failed to update edge position:', e);
    }
  }

  /**
   * 获取端点的中心位置（用于计算方向向量）
   */
  private _getEndpointCenter(endpoint: EdgeEndpoint): [number, number] {
    if (typeof endpoint === 'string') {
      return [0, 0];
    }
    if (typeof (endpoint as Port).getAbsolutePosition === 'function') {
      return (endpoint as Port).getAbsolutePosition();
    }
    if (typeof (endpoint as Node).getPosition === 'function') {
      const pos = (endpoint as Node).getPosition();
      return [pos[0], pos[1]] as [number, number];
    }
    return [0, 0];
  }

  /**
   * Get the edge ID
   */
  override getId(): string {
    return (this as any).id || '';
  }
  
  /**
   * Get the source node ID or object
   */
  getSource(): EdgeEndpoint {
    return this.data.source;
  }

  /**
   * Get the target node ID or object
   */
  getTarget(): EdgeEndpoint {
    return this.data.target;
  }
  
  /**
   * Get the edge data
   */
  getData(): EdgeConfig {
    return this.data;
  }

  // ============================================
  // Multiple Labels Support
  // ============================================

  /**
   * Override getLabelShape to return first label's Text shape
   * @returns First label's Text shape or null
   */
  override getLabelShape(): Text | null {
    const edgeLabel = this._labelTexts.values().next().value;
    if (edgeLabel) {
      return edgeLabel.getLabelShape();
    }
    return super.getLabelShape(); // fallback to parent's implementation
  }

  /**
   * Add a label to this edge using ItemLabelElement
   * @param id - Label ID
   * @param config - Label configuration
   * @returns The created ItemLabelElement
   */
  addLabel(id: string, config: {
    text?: string;
    position?: { distance?: number; offset?: { normal?: number; tangent?: number }; angle?: number };
    style?: { fill?: string; fontSize?: number; background?: string; padding?: number; zIndex?: number; [key: string]: unknown };
    editable?: boolean;
  }): ItemLabelElement {
    const label = new ItemLabelElement({
      id,
      text: config.text || id,
      position: config.position,
      style: {
        fill: config.style?.fill || '#000',
        fontSize: config.style?.fontSize || 12,
        zIndex: config.style?.zIndex ?? 1,
        ...config.style
      },
      editable: config.editable === true
    });

    // Set owner reference for positioning (ItemLabelElement will auto-detect Edge vs Node)
    label.setOwner(this as any);

    this._labelTexts.set(id, label);
    super.appendChild(label);

    // Note: Don't call updateLabelPosition here since edge may not be connected yet
    // Labels will be positioned in updatePositionFromNodes after connection

    return label;
  }

  /**
   * Remove a label from this edge
   * @param id - Label ID
   */
  removeLabel(id: string): void {
    const label = this._labelTexts.get(id);
    if (label) {
      try {
        super.removeChild(label);
      } catch (e) {}
      this._labelTexts.delete(id);
    }
  }

  /**
   * Update all labels' positions based on stored position configs
   * Called when edge position changes
   */
  private updateAllLabels(): void {
    this._labelTexts.forEach((label) => {
      label.updatePosition();
    });
  }

  /**
   * Get a specific label by ID
   * If id not provided, returns the first label
   * @param id - Label ID (optional)
   * @returns Label ItemLabelElement object or null
   */
  getEdgeLabel(id?: string): ItemLabelElement | null {
    if (!id) {
      return this._labelTexts.values().next().value || null;
    }
    return this._labelTexts.get(id) || null;
  }

  /**
   * Get label text (for backward compatibility)
   * @param id - Label ID (optional)
   * @returns Text content or null
   */
  getLabelText(id?: string): string | null {
    const label = this.getEdgeLabel(id);
    return label ? label.getText() : null;
  }

  connectedCallback() {
    console.log('[Edge.connectedCallback] Connecting edge', this.data.id, 'source:', this.data.source, 'target:', this.data.target);
    // Connect immediately after being added to DOM
    this._tryConnect();
  }

  private _tryConnect(): boolean {
    try {
      const graph = this.ownerDocument as any;
      if (!graph || typeof graph.getElementById !== 'function') {
        console.warn('[Edge._tryConnect] No graph or graph.getElementById not available');
        return false;
      }

      let sourceNode: EdgeEndpoint | null = null;
      let targetNode: EdgeEndpoint | null = null;

      const resolveEndpoint = (endpoint: EdgeEndpoint): EdgeEndpoint | null => {
        // 如果已经是对象(Node或Port)，直接返回
        if (endpoint && typeof endpoint === 'object') {
          return endpoint;
        }

        // 如果是字符串ID，使用 Graph.getElementById()
        if (typeof endpoint === 'string') {
          return graph.getElementById(endpoint);
        }

        return null;
      };

      sourceNode = resolveEndpoint(this.data.source);
      targetNode = resolveEndpoint(this.data.target);

      console.log('[Edge._tryConnect] Resolved endpoints:', {
        edge: this.getId(),
        sourceNode,
        targetNode
      });

      if (sourceNode && targetNode) {
        this.connectTo(sourceNode, targetNode);
        return true;
      }
      return false;
    } catch (e) {
      console.warn(`Failed to connect edge ${this.getId()}:`, e);
      return false;
    }
  }
  
  disconnectedCallback() {
    // Remove event listeners directly from source and target nodes (DOM API style)
    try {
      if (this.sourceNode && typeof this.sourceNode === 'object' && this._onSourceMoved) {
        (this.sourceNode as Node).removeEventListener?.('node:moved', this._onSourceMoved as any);
        this._onSourceMoved = null;
      }
      if (this.targetNode && typeof this.targetNode === 'object' && this._onTargetMoved) {
        (this.targetNode as Node).removeEventListener?.('node:moved', this._onTargetMoved as any);
        this._onTargetMoved = null;
      }
    } catch (e) {
      console.warn('Error removing event listeners:', e);
    }

    // Clear node references
    this.sourceNode = null;
    this.targetNode = null;

    // Dispose markers
    try {
      if (this.startMarkerObj) {
        this.startMarkerObj.dispose();
        this.startMarkerObj = null;
      }
      if (this.endMarkerObj) {
        this.endMarkerObj.dispose();
        this.endMarkerObj = null;
      }
    } catch (e) {
      console.warn('Error disposing markers:', e);
    }
  }
}

// legacy specific edge classes removed in favor of registry-based 'shape' option