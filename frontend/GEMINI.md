# UI/UX & Design Intelligence Architecture

This project is configured with a comprehensive, industry-leading UI/UX design intelligence suite for modern web and mobile applications (specifically tailored for Fintech, Accounting, Ledger, and SaaS applications like **Hisab Kitaab**).

---

## 🎯 Active UI/UX Skills Catalog

The following skills are installed and loaded directly from `.agents/skills/`:

### 1. Core Intelligence & Search Engine
- **`ui-ux-pro-max`**: Design intelligence engine containing 79 searchable styles, 192 product palettes, 74 font pairings, 119 UX guidelines, 105 icons, 17 GSAP presets, and 22 framework stacks.
  - *Query tool*: `python .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain>`
- **`superdesign`**: Rapid UI layout engine, component systems, and anti-generic visual doctrine.
- **`apple-design`**: Apple Human Interface Guidelines (HIG), iOS/macOS precision layout, typography scales, SF Symbols, fluid motion, and glassmorphism.
- **`mobile-app-ui-design`**: Mobile-first UX flows, responsive touch targets (44px min), and mobile navigation architecture.

### 2. Component & Layout Engineering
- **`ui-styling`**: shadcn/ui + Radix UI + Tailwind CSS accessible components, dark mode, and design token integration.
- **`design-component`**: Atomic component specifications (Button, Input, Modal, Table, Drawer, Command Palette) covering 8 interaction states.
- **`design-screen`**: Screen-level composition, responsive grid systems, and layout hierarchies.
- **`data-dashboard`**: High-density financial dashboards, transaction tables, KPIs, balance cards, and data visualization.

### 3. Design Tokens & Design System
- **`design-system`**: 3-tier token hierarchy (Primitive → Semantic → Component) following DTCG standards.
- **`design-tokens`**: Design token generation, theming, and multi-brand architecture.
- **`token-build`**: Automatic compilation of tokens into CSS variables, Tailwind configuration, or JSON.

### 4. Quality, Accessibility & Audits
- **`a11y-audit`**: WCAG 2.2 AA compliance auditing, contrast ratios (4.5:1 minimum for body, 3:1 for large text/icons), keyboard navigation, and ARIA patterns.
- **`design-review` & `critique`**: Heuristic evaluation, visual alignment, spacing rhythm, and hierarchy checks.
- **`ux-writing`**: Financial microcopy, clear ledger terminology (Credit/Debit/Balance), error recovery states, and onboarding flows.

---

## 🎨 Design Doctrine for "Hisab Kitaab"

1. **Clarity Over Clutter**: Financial and bookkeeping data requires instant readability, tabular numbers (`font-variant-numeric: tabular-nums`), and clean visual hierarchy.
2. **Accessible Contrast**: Credit (inflow) vs. Debit (outflow) states must use distinct, color-blind safe palettes with supporting icons (never color alone).
3. **Responsive & Mobile-First**: Financial entries happen on-the-go; all primary actions must be comfortable one-thumb tap targets (min 44×44px).
4. **Delight & Fluidity**: Subtle micro-interactions and transitions for balance updates, receipt attachments, and transaction filtering.
