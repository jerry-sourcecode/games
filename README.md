# games

游戏集合站点。首页用 Vue Bits 的 `ChromaGrid` 组件展示游戏卡片，点击卡片进入对应游戏。

## 目录结构

- `src/views/HomeView.vue` — 主页，游戏卡片列表
- `src/components/ChromaGrid.vue` — 聚光灯卡片网格（TypeScript + Tailwind，动画依赖 gsap；PC 两列 / 移动单列，卡片为左封面 + 右信息的扁平样式）
- `src/views/HabitsView.vue` — 「习惯」游戏页面
- `src/router/index.ts` — 路由表
- `src/style.css` — Tailwind 入口与全局样式

## 添加一个新游戏

1. 新建 `src/views/YourGameView.vue`。
2. 在 `src/router/index.ts` 中添加一条路由。
3. 在 `src/views/HomeView.vue` 的 `games` 数组里追加一项：
   - 必填：`image` / `title` / `subtitle`
   - `tags`：卡片上的标签，如 `['打卡', '养成']`
   - `status`：标题右侧状态胶囊，如 `'已上线'`
   - `cta`：卡片底部行动文案，默认「开始游戏」
   - `url`：站内路径即可点击进入；不填则卡片不可点击

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```
