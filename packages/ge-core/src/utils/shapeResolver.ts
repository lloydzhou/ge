export function resolveCtor(context: any, type?: string | Function | null): any | null {
  if (!type) return null;
  if (typeof type === 'function') return type;
  if (typeof type !== 'string') return null;

  try {
    const ctor = context?.ownerDocument?.defaultView?.customElements?.get?.(type);
    if (ctor) return ctor;
  } catch (e) {
    // ignore
  }

  return null;
}
