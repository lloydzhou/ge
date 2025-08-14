export class RendererPluginAdapter {
  public name: string;
  private renderer: any;
  private pluginInstance: any;

  constructor(renderer: any, pluginInstance: any) {
    this.renderer = renderer;
    this.pluginInstance = pluginInstance;
    this.name = pluginInstance.constructor?.name || 'RendererPluginAdapter';
  }

  install(graph: any) {
    if (!this.renderer) this.renderer = (graph as any).renderer;
    if (!this.renderer) throw new Error('Renderer not found on graph');

    if (typeof this.renderer.registerPlugin === 'function') {
      this.renderer.registerPlugin(this.pluginInstance);
    }

    // Optional: bridge some events from renderer/plugin to graph.eventBus
    if (this.pluginInstance && this.pluginInstance.on && graph && graph.eventBus) {
      // no-op: depends on plugin implementation
    }
  }

  uninstall(graph: any) {
    if (!this.renderer) this.renderer = (graph as any).renderer;
    if (!this.renderer) return;

    if (typeof this.renderer.unregisterPlugin === 'function') {
      try {
        this.renderer.unregisterPlugin(this.pluginInstance);
      } catch (e) {
        // some renderers don't support unregister - attempt plugin.destroy
        if (typeof this.pluginInstance.destroy === 'function') {
          this.pluginInstance.destroy();
        }
      }
    } else if (typeof this.pluginInstance.destroy === 'function') {
      this.pluginInstance.destroy();
    }
  }
}
