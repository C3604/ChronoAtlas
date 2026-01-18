# 性能优化报告

## 1. 概述
本报告详细说明了 ChronoAtlas 前端重构过程中的性能优化措施及预期成果。目标是实现 Lighthouse 评分 90+，并确保在移动端和桌面端的流畅体验。

## 2. 优化措施

### 2.1 构建优化
- **Vite 构建工具**: 采用 Vite 作为构建工具，利用 ESBuild 进行预构建，显著提升了冷启动速度和热更新（HMR）响应时间。
- **按需加载 (Tree Shaking)**:
  - 使用 `unplugin-vue-components` 自动按需导入 Ant Design Vue 组件。
  - 避免了引入完整的 UI 库样式和代码，大幅减小了 Bundle 体积。
- **代码分割 (Code Splitting)**:
  - 路由懒加载（Lazy Loading）：各页面组件（HomePage, LoginPage 等）在路由访问时才加载。

### 2.2 渲染性能
- **Vue 3 Composition API**: 利用 `script setup` 语法糖，减少了运行时开销，提升了组件实例化的效率。
- **CSS 变量主题**: 采用原生 CSS 变量（Custom Properties）管理 "Tree Fern" 设计系统的颜色和样式，避免了复杂的 CSS-in-JS 运行时计算，渲染更快且易于动态切换主题。
- **Glassmorphism 优化**: 这里的背景模糊效果使用了 `backdrop-filter`，在现代浏览器中有硬件加速支持。

### 2.3 资源优化
- **字体优化**: 使用系统字体栈作为回退，减少 Web Font 加载阻塞。
- **图标按需引入**: 仅引入使用的 Ant Design 图标（如 `UserOutlined`, `LockOutlined`），而非整个图标库。

## 3. 预期指标 (Lighthouse)

| 指标 | 目标值 | 预计达成 | 说明 |
| :--- | :--- | :--- | :--- |
| **Performance** | 90+ | 95 | 极简的初始包体积和高效的构建 |
| **First Contentful Paint (FCP)** | < 1.5s | 0.8s | 快速的服务器响应和轻量级 DOM |
| **Largest Contentful Paint (LCP)** | < 2.5s | 1.2s | 主要内容（如 Dashboard）结构清晰 |
| **Cumulative Layout Shift (CLS)** | < 0.1 | 0.05 | 确定的布局尺寸，减少动态插入导致的抖动 |
| **Time to Interactive (TTI)** | < 3.8s | 2.0s | JS 执行时间短 |

## 4. 后续建议
- **PWA 支持**: 引入 `vite-plugin-pwa` 实现离线访问和缓存策略。
- **图片懒加载**: 如果后续引入大量历史图片，建议使用 `v-lazy` 指令。
- **CDN 加速**: 生产环境部署时建议配置 CDN 分发静态资源。
