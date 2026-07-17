<script setup lang="ts">
import { ref, shallowRef, onMounted, onBeforeUnmount } from 'vue';

const props = withDefaults(
  defineProps<{
    /** setup 模块相对 examples 目录的路径（不含扩展名），如 'node/basic' */
    src: string;
    /** 预览区高度（px），默认 420 */
    height?: number;
  }>(),
  { height: 420 },
);

const host = ref<HTMLDivElement>();
const graph = shallowRef<any>();
const error = ref<string>('');

// 预收集所有 setup 模块（构建期静态分析，运行时懒加载）
const modules = import.meta.glob<{ setup?: (c: HTMLElement) => unknown }>(
  '../../../../examples/**/*.ts',
);

onMounted(async () => {
  const key = Object.keys(modules).find((k) => k.endsWith(`/${props.src}.ts`));
  if (!key) {
    error.value = `未找到示例模块: ${props.src}`;
    return;
  }
  try {
    const mod = await modules[key]();
    if (typeof mod.setup !== 'function') {
      error.value = `示例模块未导出 setup(): ${props.src}`;
      return;
    }
    graph.value = await mod.setup(host.value!);
  } catch (e) {
    error.value = (e as Error)?.message || String(e);
    // eslint-disable-next-line no-console
    console.error('[ExamplePreview] setup failed:', e);
  }
});

onBeforeUnmount(() => {
  const g = graph.value;
  if (g) {
    try {
      if (typeof g.destroy === 'function') g.destroy();
      else if (typeof g.unmount === 'function') g.unmount();
    } catch {
      /* noop */
    }
    graph.value = null;
  }
});
</script>

<template>
  <ClientOnly>
    <div class="vp-example">
      <div ref="host" class="vp-example__canvas" :style="{ height: height + 'px' }" />
      <p v-if="error" class="vp-example__error">⚠️ {{ error }}</p>
    </div>
  </ClientOnly>
</template>

<style scoped>
.vp-example {
  margin: 16px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg);
}
.vp-example__canvas {
  position: relative;
  width: 100%;
  background: #fafafa;
}
.vp-example__canvas :deep(svg) {
  display: block;
}
.vp-example__error {
  margin: 0;
  padding: 12px 16px;
  color: #f5222d;
  font-size: 13px;
}
</style>
