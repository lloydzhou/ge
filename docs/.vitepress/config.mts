import { defineConfig } from 'vitepress';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  title: 'GE 图编辑器',
  description: '基于 AntV/G 的现代化图编辑器',
  lang: 'zh-CN',
  base: '/ge/',
  cleanUrls: true,
  lastUpdated: true,
  markdown: {
    lineNumbers: true,
  },
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/getting-started' },
      { text: '示例', link: '/examples/' },
      { text: 'API', link: '/api/graph' },
      { text: 'GitHub', link: 'https://github.com/lloydzhou/ge', target: '_self' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '入门',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '内置 Shape', link: '/guide/shapes' },
            { text: '插件系统', link: '/guide/plugins' },
            { text: '交互能力', link: '/guide/interactions' },
          ],
        },
      ],
      '/examples/': [
        {
          text: '节点',
          items: [
            { text: '基础渲染', link: '/examples/node/basic' },
            { text: '内置 Shape', link: '/examples/node/shapes' },
          ],
        },
        {
          text: '边',
          items: [
            { text: '路由与连接器', link: '/examples/edge/router' },
          ],
        },
        {
          text: '交互插件',
          items: [
            { text: '拖拽与选中', link: '/examples/plugin/interaction' },
            { text: '全功能演示', link: '/examples/plugin/all-features' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: 'Graph', link: '/api/graph' },
            { text: 'Node', link: '/api/node' },
            { text: 'Edge', link: '/api/edge' },
            { text: '坐标系统', link: '/api/coordinate' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/lloydzhou/ge' },
    ],
    footer: {
      message: '基于 @antv/g-lite 构建',
    },
  },
  vite: {
    resolve: {
      alias: {
        '@ge': fileURLToPath(new URL('../../packages/ge-core/src/index.ts', import.meta.url)),
        '@ge-react': fileURLToPath(new URL('../../packages/ge-react/src/index.ts', import.meta.url)),
        '@examples': fileURLToPath(new URL('../../examples', import.meta.url)),
      },
    },
    server: {
      fs: {
        // 允许访问项目根（examples / packages 源码）
        allow: [fileURLToPath(new URL('../../', import.meta.url))],
      },
    },
  },
});
