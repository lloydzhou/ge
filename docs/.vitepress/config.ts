import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'GE 图编辑器',
  description: '基于 AntV/G 的现代化图编辑器',
  lang: 'zh-CN',
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/getting-started' },
      { text: 'API', link: '/api/graph' },
      { text: 'GitHub', link: 'https://github.com/lloydzhou/ge' },
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
});
