I have analyzed the current project structure and confirmed it uses **Vue 3 + TypeScript + Vite** with custom CSS styling. The current design is "Academic/Beige", which contrasts with the requested "Tree Fern/Z-Gen" style.

I propose the following modernization plan:

## 1. Design System & Specification (Tree Fern Language)
- **Goal**: Define the "Tree Fern" visual language and create design specifications.
- **Actions**:
  - Create `Doc/design/tree-fern-spec.md` defining:
    - **Palette**: Vibrant gradients (Teal/Purple/Lime), high contrast.
    - **Typography**: Modern sans-serif (Inter/Roboto) replacing current serif.
    - **Shape**: 8-12px rounded corners, glassmorphism (backdrop-filter).
    - **Animation**: Micro-interactions for hover/active states.
  - **Tool**: Delegate to `ui-designer` to generate the specific color tokens and CSS variables.

## 2. Infrastructure & Dependencies
- **Goal**: Upgrade the tech stack to support the new UI and testing requirements.
- **Actions**:
  - Install **Ant Design Vue** (matches "Ant Design" request for Vue).
  - Install **Vitest** and **@vue/test-utils** for the 80% coverage target.
  - Configure **Unplugin-vue-components** for auto-importing UI components.
  - Create CI pipeline configuration (`.github/workflows/ci.yml`).

## 3. Component & Layout Refactoring
- **Goal**: Rebuild the UI using the new component library and design tokens.
- **Actions**:
  - **Global Styles**: Replace `main.css` with a theme-aware CSS system supporting light/dark modes.
  - **Layout**: Refactor `App.vue` to use a responsive Grid/Flex layout with a collapsible navigation sidebar/drawer for mobile.
  - **Pages**:
    - `HomePage.vue`: Convert to a dashboard-style landing with "Vibrant" hero section.
    - `ContentPage.vue` & `ProfilePage.vue`: Refactor forms and lists to use Ant Design Data Entry and Display components.
  - **Accessibility**: Ensure semantic HTML and ARIA attributes (WCAG 2.1 AA).

## 4. Testing & Optimization
- **Goal**: Ensure reliability and high performance.
- **Actions**:
  - Write unit tests for main page logic and stores (target 80% coverage).
  - Optimize assets and bundle size (lazy loading routes).
  - Generate a Performance Report (`Doc/reports/performance.md`) and User Test Report template.

## 5. Deliverables
- Refactored Codebase (`packages/web`)
- Design Specification Document
- Test Coverage Report (via Vitest output)
- Performance & User Feedback Documents

**Question**: Do you agree with choosing **Ant Design Vue** as the component library to stay consistent with the current Vue 3 stack?
