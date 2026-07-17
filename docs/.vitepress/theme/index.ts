import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import ExamplePreview from './components/ExamplePreview.vue';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // 全局注册示例预览组件，文档中可直接 <ExamplePreview src="..." />
    app.component('ExamplePreview', ExamplePreview);
  },
} satisfies Theme;
