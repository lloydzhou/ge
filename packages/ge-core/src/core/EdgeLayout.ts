export type Vec2 = [number, number];

export interface EdgeLayoutOffset {
  along?: number; // offset along tangent (pixels)
  normal?: number; // offset along normal (pixels)
}

export interface EdgeLayoutOptions {
  t?: number; // [0,1]
  snap?: 'start' | 'middle' | 'end';
  segmentIndex?: number; // for polyline
  offset?: EdgeLayoutOffset;
}

export interface EdgeAnchor {
  x: number;
  y: number;
  tangent: Vec2; // normalized
  normal: Vec2; // normalized (left-hand normal)
}

export function computeAnchor(points: Vec2[], opts: EdgeLayoutOptions = {}): EdgeAnchor {
  const fallback: Vec2[] = [[0, 0], [0, 0]];
  const pts: Vec2[] = (points && points.length >= 2 ? points : fallback) as Vec2[];

  // total length & segments
  const segs: { a: Vec2; b: Vec2; len: number; dir: Vec2 }[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i] as Vec2;
    const b = pts[i + 1] as Vec2;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    const dir: Vec2 = len > 0 ? [dx / len, dy / len] : [1, 0];
    segs.push({ a, b, len, dir });
    total += len;
  }
  if (total === 0) {
    const [tx, ty] = segs[0]?.dir || [1, 0];
    return { x: pts[0][0], y: pts[0][1], tangent: [tx, ty], normal: [-ty as number, tx as number] } as EdgeAnchor;
  }

  // resolve t
  let t = typeof opts.t === 'number' ? Math.min(1, Math.max(0, opts.t)) : undefined;
  if (t === undefined) {
    if (opts.snap === 'start') t = 0;
    else if (opts.snap === 'end') t = 1;
    else t = 0.5; // middle
  }

  // map t -> target length position
  const targetLen = t * total;
  let acc = 0;
  let segIdx = 0;
  if (typeof opts.segmentIndex === 'number') {
    segIdx = Math.min(segs.length - 1, Math.max(0, opts.segmentIndex));
    acc = 0;
    for (let i = 0; i < segIdx; i++) acc += segs[i].len;
  } else {
    for (let i = 0; i < segs.length; i++) {
      if (acc + segs[i].len >= targetLen) { segIdx = i; break; }
      acc += segs[i].len;
    }
  }

  const seg = segs[segIdx];
  const local = seg.len > 0 ? (targetLen - acc) / seg.len : 0;
  const x = seg.a[0] + (seg.b[0] - seg.a[0]) * local;
  const y = seg.a[1] + (seg.b[1] - seg.a[1]) * local;
  const [tx, ty] = seg.dir;
  const nx = -ty as number, ny = tx as number;

  const along = opts.offset?.along ?? 0;
  const normal = opts.offset?.normal ?? 0;

  return {
    x: x + tx * along + nx * normal,
    y: y + ty * along + ny * normal,
    tangent: [tx, ty],
    normal: [nx, ny],
  } as EdgeAnchor;
}
