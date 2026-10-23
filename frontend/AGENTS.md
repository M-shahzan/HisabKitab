# AGENTS.md - UI/UX Architecture & Standards

All agentic pair programmers working on this repository MUST consult and adhere to the UI/UX skills and design rules located in `.agents/skills/` and `.agents/rules/`.

## Key Commands
- Search UI/UX design intelligence:
  `python .agents/skills/ui-ux-pro-max/scripts/search.py "<topic>" --domain [style|color|chart|product|ux|typography|icons]`
- Generate full design system recommendations:
  `python .agents/skills/ui-ux-pro-max/scripts/search.py "fintech" --design-system --project-name "HisabKitaab"`

## Active Design Rules (`.agents/rules/`)
1. `accessibility.md`: WCAG 2.2 AA standards, 44x44px touch targets, full keyboard navigability.
2. `tokens-and-color.md`: 3-tier token hierarchy (Primitive -> Semantic -> Component).
3. `components.md`: Atomic design pattern with 8 interaction states.
4. `typography-and-spacing.md`: 4px spacing scale, 1.25 modular typography scale.
