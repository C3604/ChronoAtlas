# Implementation Plan

## 1. Fix Event Details UI Misalignment (`ant-descriptions-view`)
- **Target File**: `packages/web/src/pages/HomePage.vue`
- **Actions**:
    - **Responsive Drawer**: Change the `<a-drawer>` width from fixed `400` to a responsive computed value (100% on mobile, 400px on desktop).
    - **CSS Layout Fix**: Add global or scoped styles to ensure `.ant-descriptions-item-content` handles long text correctly (`word-break: break-word`) to prevent overflow.
    - **Flex/Grid check**: Verify the internal layout of the description items matches the design.

## 2. Implement Light/Dark Mode Toggle
- **Target Files**: 
    - `packages/web/src/styles/theme.css`
    - `packages/web/src/App.vue`
- **Actions**:
    - **CSS Variables**: Define `[data-theme='light']` selector in `theme.css` with a new color palette (Slate 50 background, Slate 900 text, etc.) and ensure `:root` defaults to dark mode variables.
    - **State Management**: In `App.vue`, create an `isDark` ref initialized from `localStorage` (defaulting to true).
    - **Ant Design Integration**: Dynamically switch between `theme.darkAlgorithm` and `theme.defaultAlgorithm` in `<a-config-provider>`.
    - **UI Toggle**: Add a Sun/Moon icon button in the global header (desktop) and mobile drawer.
    - **Persistence**: Save the user's choice to `localStorage` and apply it to `document.documentElement.dataset.theme`.

## 3. Remove Hero Section Text
- **Target File**: `packages/web/src/pages/HomePage.vue`
- **Actions**:
    - **Content Removal**: Remove the "Timeline Atlas" title and description paragraph.
    - **Layout Adjustment**: Keep the `hero-section` container and the `status-bar`.
    - **Centering**: Modify `.hero-section` CSS to use Flexbox (`justify-content: center`) to center the remaining status bar, ensuring the area doesn't look broken.

## 4. Verification
- **Visual Check**: Verify the "Event Details" drawer looks correct on mobile (320px) and desktop.
- **Theme Check**: Toggle the theme and ensure all backgrounds, texts, and Ant Design components (Inputs, Modals, Cards) switch colors smoothly.
- **Layout Check**: Ensure the Home Page top section looks clean with just the status bar.
