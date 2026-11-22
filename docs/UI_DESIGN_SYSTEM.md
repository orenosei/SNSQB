# SNSQB design system

SNSQB reads like a Vietnamese study notebook. Warm paper holds the content, deep green marks the workspace and primary actions, and quiet horizontal rules group related work. Login uses a cover panel with three actual product capabilities. The feed gives writing and filtering the main column and keeps personal shortcuts in the margin on wide screens. The question bank starts with search and practice controls.

- Palette comes from `frontend/src/tokens.css`. Paper `#f8f6ef`, surface `#fffdf7`, ink `#202d29`, primary `#244d43` and cover `#193e35`. Semantic feedback distinguishes success, error, warning and information with copy as well as color.
- Montserrat Variable is the shared font for headings, body copy and controls. The self-hosted upright and italic faces support weights 100–900 and include Vietnamese glyphs. Body text defaults to 400, with headings at 750 for H1, 650 for H2 and 600 for H3 and lower levels. Tables and the practice map use tabular figures.
- Shared spacing steps are 8, 12, 16, 24 and 32px. Control, content and dialog radii are 6, 12 and 16px. Most surfaces use a hairline. Dialogs have elevation.
- At widths below 768px, the mobile dock and native navigation dialog replace the sidebar. The feed is single-column until 1200px. Form actions and data tables retain their feature-specific mobile layouts. Keyboard focus uses a visible outline, and primary and icon buttons use 44px targets.

