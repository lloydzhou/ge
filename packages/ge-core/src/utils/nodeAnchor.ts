// Utility to compute an anchor point on/around a shape given a layout description.
// This is shape-agnostic and intended to be used by Node.computeAnchorForLayout and Port.updatePosition.

export type LayoutAngle = { name: 'angle'; args: { angle: number } };
export type LayoutAbsolute = { name: 'absolute'; args: { x: number; y: number } };
export type LayoutPreset = 'top' | 'bottom' | 'left' | 'right';
export type PortLayoutAny = LayoutPreset | LayoutAngle | LayoutAbsolute | undefined;

function bboxOfPoints(points: number[][]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    const x = Number(p[0] || 0);
    const y = Number(p[1] || 0);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  if (minX === Infinity) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}

function intersectRaySegment(cx: number, cy: number, dx: number, dy: number, a: number[], b: number[]) {
  // Parametric segment: s(t) = a + u*(b-a), u in [0,1]
  // Ray: r(v) = c + v*d, v >= 0
  const ax = a[0], ay = a[1];
  const bx = b[0], by = b[1];
  const rx = bx - ax, ry = by - ay;
  const denom = (rx * dy - ry * dx);
  if (Math.abs(denom) < 1e-8) return null; // parallel
  const u = ((dx * (ay - cy) - dy * (ax - cx)) / denom);
  const v = ((rx * (ay - cy) - ry * (ax - cx)) / denom);
  if (u >= 0 && u <= 1 && v >= 0) {
    return [ax + rx * u, ay + ry * u, v];
  }
  return null;
}

export function computeAnchorForShape(shape: any, layout?: PortLayoutAny, nodeStyle?: any): [number, number] {
  try {
    const ns = nodeStyle || {};

    // Rect
    if (shape && shape.nodeName === 'rect') {
      const x = Number(shape.style.x ?? 0);
      const y = Number(shape.style.y ?? 0);
      const w = Number(shape.style.width ?? ns.width ?? 0);
      const h = Number(shape.style.height ?? ns.height ?? 0);
      const cx = x + w / 2;
      const cy = y + h / 2;
      if (!layout) return [cx, cy];
      if (typeof layout === 'string') {
        switch (layout) {
          case 'top': return [x + w / 2, y];
          case 'bottom': return [x + w / 2, y + h];
          case 'left': return [x, y + h / 2];
          case 'right': return [x + w, y + h / 2];
        }
      }
      if ((layout as any)?.name === 'absolute') return [(layout as any).args.x, (layout as any).args.y];
      if ((layout as any)?.name === 'angle') {
        const ang = ((layout as any).args?.angle ?? 0) * Math.PI / 180;
        const dx = Math.cos(ang), dy = Math.sin(ang);
        const left = x, right = x + w, top = y, bottom = y + h;
        const candidates: Array<{ t: number; px: number; py: number }> = [];
        if (dx > 0) {
          const t = (right - cx) / dx; const py = cy + dy * t; if (py >= top && py <= bottom && t > 0) candidates.push({ t, px: right, py });
        }
        if (dx < 0) {
          const t = (left - cx) / dx; const py = cy + dy * t; if (py >= top && py <= bottom && t > 0) candidates.push({ t, px: left, py });
        }
        if (dy > 0) {
          const t = (bottom - cy) / dy; const px = cx + dx * t; if (px >= left && px <= right && t > 0) candidates.push({ t, px, py: bottom });
        }
        if (dy < 0) {
          const t = (top - cy) / dy; const px = cx + dx * t; if (px >= left && px <= right && t > 0) candidates.push({ t, px, py: top });
        }
        if (candidates.length > 0) { candidates.sort((a,b)=>a.t-b.t); const c = candidates[0]; return [c.px, c.py]; }
        return [cx, cy];
      }
      return [cx, cy];
    }

    // Circle / Ellipse
    if (shape && (shape.nodeName === 'circle' || shape.nodeName === 'ellipse')) {
      const cx = Number(shape.style.cx ?? 0);
      const cy = Number(shape.style.cy ?? 0);
      if (shape.nodeName === 'circle') {
        const r = Number(shape.style.r ?? ns.r ?? 0);
        if (!layout) return [cx, cy];
        if (typeof layout === 'string') {
          switch (layout) { case 'top': return [cx, cy - r]; case 'bottom': return [cx, cy + r]; case 'left': return [cx - r, cy]; case 'right': return [cx + r, cy]; }
        }
        if ((layout as any)?.name === 'absolute') return [(layout as any).args.x, (layout as any).args.y];
        if ((layout as any)?.name === 'angle') { const ang = ((layout as any).args?.angle ?? 0) * Math.PI / 180; return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)]; }
        return [cx, cy];
      } else {
        // ellipse
        const rx = Number(shape.style.rx ?? shape.style.r ?? ns.rx ?? ns.r ?? 0);
        const ry = Number(shape.style.ry ?? ns.ry ?? 0);
        if (!layout) return [cx, cy];
        if (typeof layout === 'string') {
          switch (layout) { case 'top': return [cx, cy - ry]; case 'bottom': return [cx, cy + ry]; case 'left': return [cx - rx, cy]; case 'right': return [cx + rx, cy]; }
        }
        if ((layout as any)?.name === 'absolute') return [(layout as any).args.x, (layout as any).args.y];
        if ((layout as any)?.name === 'angle') { const ang = ((layout as any).args?.angle ?? 0) * Math.PI / 180; return [cx + rx * Math.cos(ang), cy + ry * Math.sin(ang)]; }
        return [cx, cy];
      }
    }

    // Polygon / Polyline - use points
    if (shape && (shape.nodeName === 'polygon' || shape.nodeName === 'polyline')) {
      const pts = (shape.style && (shape.style.points || shape.style.pointsList)) || (shape.points || []);
      const points: number[][] = Array.isArray(pts) ? pts.map((p: any) => [Number(p[0]||0), Number(p[1]||0)]) : [];
      if (points.length === 0) return [0,0];
      const bb = bboxOfPoints(points);
      const cx = (bb.minX + bb.maxX) / 2;
      const cy = (bb.minY + bb.maxY) / 2;
      if (!layout) return [cx, cy];
      if (typeof layout === 'string') {
        switch (layout) {
          case 'top': return [cx, bb.minY];
          case 'bottom': return [cx, bb.maxY];
          case 'left': return [bb.minX, cy];
          case 'right': return [bb.maxX, cy];
        }
      }
      if ((layout as any)?.name === 'absolute') return [(layout as any).args.x, (layout as any).args.y];
      if ((layout as any)?.name === 'angle') {
        const ang = ((layout as any).args?.angle ?? 0) * Math.PI / 180;
        const dx = Math.cos(ang), dy = Math.sin(ang);
        let best: [number,number,number] | null = null; // x,y,dist
        for (let i=0;i<points.length;i++) {
          const a = points[i];
          const b = points[(i+1)%points.length];
          const hit = intersectRaySegment(cx, cy, dx, dy, a, b);
          if (hit) {
            const v = hit[2];
            if (!best || v < best[2]) best = [hit[0], hit[1], v];
          }
        }
        if (best) return [best[0], best[1]];
        return [cx, cy];
      }
      return [cx, cy];
    }

    // Fallback: try to use getLocalBounds center
    try {
      if (shape && typeof shape.getLocalBounds === 'function') {
        const bounds: any = shape.getLocalBounds();
        const centerX = (bounds.min[0] + bounds.max[0]) / 2;
        const centerY = (bounds.min[1] + bounds.max[1]) / 2;
        return [centerX, centerY];
      }
    } catch (e) {
      // ignore
    }

    // Final fallback: use nodeStyle width/height
    const ns2 = nodeStyle || {};
    return [Number(ns2.width || 100) / 2, Number(ns2.height || 40) / 2];
  } catch (e) {
    return [0,0];
  }
}
