export function resolveCtor(context: any, type?: string | Function | null): any | null {
  if (!type) return null;
  if (typeof type === 'function') return type;
  if (typeof type !== 'string') return null;

  // try to find graph from context
  try {
    let graph: any = null;
    // prefer context._findGraphParent if available
    if (context && typeof context._findGraphParent === 'function') {
      graph = context._findGraphParent();
    }

    // fallback: if context has ownerDocument (e.g. element), try to locate host->graph
    if (!graph && context && context.ownerDocument) {
      try {
        const host = (context.ownerDocument as any).host;
        if (host && host.constructor && host.constructor.name === 'Graph') {
          graph = host;
        }
      } catch (e) {}
    }

    // if still no graph, try walking parents (useful when context is a node/edge/port)
    if (!graph) {
      try {
        let p = context && context.parent;
        while (p) {
          if (p.constructor && p.constructor.name === 'Graph') {
            graph = p;
            break;
          }
          p = p.parent;
        }
      } catch (e) {}
    }

    // Prefer graph.document.customElements if available
    try {
      const doc = graph && graph.document ? graph.document : null;
      if (doc && doc.customElements && typeof doc.customElements.get === 'function') {
        const ctor = doc.customElements.get(type);
        if (ctor) return ctor;
      }
    } catch (e) {
      // ignore and fallback
    }
  } catch (e) {
    // ignore
  }

  // fallback to global customElements
  try {
    const globalCtor = (globalThis as any).customElements?.get?.(type);
    if (globalCtor) return globalCtor;
  } catch (e) {}

  return null;
}
