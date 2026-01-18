# Tree Fern Design Language Specification
> Version 1.0.0 | Status: Draft | Date: 2026-01-18

"Tree Fern" (桫椤) 是一套融合了自然有机形态与数字原生（Gen Z）活力的设计语言。它强调生命力、流动性与包容性，通过高饱和度的渐变色彩与柔和的几何形态，构建出既具未来感又充满亲和力的用户界面。

---

## 1. 核心原则 (Core Principles)

1.  **Bio-Digital (生物数字化)**: 从自然界（蕨类植物的卷曲与舒展）汲取灵感，结合赛博朋克美学。
2.  **Vibrant & Accessible (活力且无障碍)**: 在保持高视觉冲击力的同时，严格遵守 WCAG 2.1 AA 标准。
3.  **Fluid Response (流动响应)**: 界面应像植物触碰一样，对用户的每一次交互给予细腻的反馈。

---

## 2. 色彩系统 (Color System)

为了在保持“Z世代”充满活力的渐变风格同时也满足 WCAG 2.1 AA 对比度要求，我们采用了 **“深色底，亮色光”** 的策略。背景以深色为主，渐变作为品牌识别色用于高亮区域，文字保持高对比度。

### 2.1 品牌渐变 (Brand Gradients)

| 名称 | 预览 | CSS 变量值 (Linear Gradient) | 用途 |
| :--- | :--- | :--- | :--- |
| **Fern Spore (孢子绿)** | 🟢🔵 | `linear-gradient(135deg, #00F260 0%, #0575E6 100%)` | 主按钮、激活状态、Logo |
| **Neon Bloom (霓虹绽)** | 🟣🔴 | `linear-gradient(135deg, #B721FF 0%, #21D4FD 100%)` | 强调行动、营销Banner |
| **Mist (迷雾)** | ⚪🌫️ | `linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)` | 卡片背景、玻璃拟态 |

### 2.2 基础色板 (Neutral Palette)

| Token | Hex Value | 说明 | 对比度 (vs White/Text) |
| :--- | :--- | :--- | :--- |
| `color-bg-default` | `#0F172A` | 深蓝灰背景，比纯黑更护眼 | - |
| `color-bg-surface` | `#1E293B` | 卡片与容器背景 | - |
| `color-text-primary` | `#F8FAFC` | 主要文字 (Slate 50) | 15.6:1 (AAA) |
| `color-text-secondary`| `#94A3B8` | 次要文字 (Slate 400) | 4.6:1 (AA) |
| `color-border` | `#334155` | 边框与分割线 | - |

### 2.3 功能色 (Functional Colors)

*   **Success**: `#10B981` (Emerald 500)
*   **Warning**: `#F59E0B` (Amber 500)
*   **Error**: `#EF4444` (Red 500)

> **无障碍备注**: 在深色背景(`#0F172A`)上，上述所有功能色与品牌渐变中的主要颜色均需通过 WCAG AA 对比度测试。对于文本上的渐变，建议仅用于大标题（Large Text），正文文本应保持纯色。

---

## 3. 排版系统 (Typography)

采用现代无衬线字体，强调几何感与易读性。

### 3.1 字体家族 (Font Family)

优先使用系统默认的现代无衬线字体栈，以确保加载速度与原生体验。

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
```

### 3.2 字号阶梯 (Type Scale)

基于 **Major Third (1.250)** 比例缩放。

| 类别 | 尺寸 (rem/px) | 行高 | 字重 | 用途 |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | 3.052rem (48.8px) | 1.1 | 800 | 营销页主标题 |
| **H1** | 2.441rem (39px) | 1.2 | 700 | 页面标题 |
| **H2** | 1.953rem (31px) | 1.25 | 700 | 模块标题 |
| **H3** | 1.563rem (25px) | 1.3 | 600 | 卡片标题 |
| **Body Large** | 1.25rem (20px) | 1.5 | 400 | 引言、摘要 |
| **Body Base** | 1rem (16px) | 1.5 | 400 | 正文默认 |
| **Small** | 0.8rem (12.8px) | 1.5 | 500 | 标签、辅助信息 |

---

## 4. 形状与布局 (Shapes & Layout)

### 4.1 圆角 (Corner Radius)

统一使用 **8px - 12px** 的圆角，构建亲和力。

*   **Small (8px)**: 按钮、输入框、标签 (Tags)、Toast 通知。
*   **Medium (12px)**: 卡片 (Cards)、模态框 (Modals)、下拉菜单。
*   **Large (24px)**: 仅用于特殊的营销容器或全屏BottomSheet的顶部圆角。

### 4.2 间距 (Spacing)

基于 **4px** 网格系统。

*   `xs`: 4px
*   `s`: 8px
*   `m`: 16px
*   `l`: 24px
*   `xl`: 32px
*   `xxl`: 48px

---

## 5. 组件样式 (Component Styling)

### 5.1 按钮 (Buttons)

*   **Primary Button**:
    *   Background: `Fern Spore` Gradient.
    *   Border-radius: `8px`.
    *   Text: `#0F172A` (Bold 600) - 确保在亮色渐变上的可读性。
    *   Hover: 亮度提升 10% 或 向上位移 1px。
    
*   **Secondary Button**:
    *   Background: Transparent.
    *   Border: 1px solid `color-border`.
    *   Text: `color-text-primary`.

### 5.2 输入框 (Inputs)

*   Background: `color-bg-surface`.
*   Border: 1px solid `color-border`.
*   Radius: `8px`.
*   **Focus State**: 必须有明显的 Focus Ring。
    *   Shadow: `0 0 0 2px #0F172A, 0 0 0 4px #0575E6`.

---

## 6. 交互与动效 (Interactions & Motion)

微交互是 "Tree Fern" 的灵魂，提供即时的触觉反馈。

### 6.1 动效曲线 (Easing)

使用带有回弹效果的曲线，模拟植物的韧性。

*   `ease-out-back`: `cubic-bezier(0.34, 1.56, 0.64, 1)` - 用于模态框弹出、Hover 放大。
*   `ease-smooth`: `cubic-bezier(0.4, 0, 0.2, 1)` - 用于颜色渐变、透明度变化。

### 6.2 交互规范

1.  **Hover (悬停)**:
    *   可点击元素在 Hover 时应有 `transform: translateY(-2px)` 的位移。
    *   阴影加深: `box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5)`.
    
2.  **Click/Tap (点击)**:
    *   产生 Ripple (波纹) 效果或 `scale(0.98)` 的微缩放。

3.  **Loading (加载)**:
    *   使用渐变色的骨架屏 (Skeleton) 带有流光动画，而非简单的菊花图。

---

## 7. 无障碍检查清单 (Accessibility Checklist)

- [ ] **色彩对比度**: 确保正文文本与背景对比度至少为 4.5:1 (AA级)。
- [ ] **键盘导航**: 所有交互元素必须可被 Tab 键聚焦，且 Focus 状态清晰可见（不仅依赖颜色变化）。
- [ ] **语义化**: 按钮使用 `<button>`，链接使用 `<a>`，表单有对应的 `<label>`。
- [ ] **缩放**: 支持浏览器缩放至 200% 而不破坏布局。
