<script setup lang="ts">
import { ref, shallowRef, onMounted, onBeforeUnmount, nextTick } from 'vue';

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
const isFullscreen = ref(false);

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

/** 全屏切换：toggle 后按新尺寸 resize Graph，使 SVG 填满全屏画布 */
const toggleFullscreen = async () => {
  isFullscreen.value = !isFullscreen.value;
  await nextTick();
  const g = graph.value;
  if (g && host.value) {
    g.resize(host.value.clientWidth, host.value.clientHeight);
  }
};

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
    <div class="vp-example" :class="{ 'is-fullscreen': isFullscreen }">
      <button class="vp-example__fs" type="button" @click="toggleFullscreen">
        {{ isFullscreen ? '✕ 退出全屏' : '⤢ 全屏交互' }}
      </button>
      <div
        ref="host"
        class="vp-example__canvas"
        :style="{ height: isFullscreen ? '100%' : height + 'px' }"
      />
      <p v-if="error" class="vp-example__error">⚠️ {{ error }}</p>
    </div>
  </ClientOnly>
</template>

<style scoped>
.vp-example {
  position: relative;
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
.vp-example__fs {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 20;
  padding: 5px 11px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 12px;
  cursor: pointer;
  opacity: 0.85;
  transition: opacity 0.2s, color 0.2s, border-color 0.2s;
}
.vp-example__fs:hover {
  opacity: 1;
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}
.vp-example.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  margin: 0;
  border: none;
  border-radius: 0;
}
.vp-example.is-fullscreen .vp-example__canvas {
  height: 100%;
}
</style>
