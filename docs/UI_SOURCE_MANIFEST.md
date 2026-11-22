# SNSQB UI source manifest

| Source | Integration | Local files | Dependencies and license |
| --- | --- | --- | --- |
| [Motion](https://github.com/motiondivision/motion) and [mini entry point](https://motion.dev/docs/animate) | Lightweight `animate` for page-surface entrances | `src/app/useSurfaceEntrance.ts`, `src/app/AppShell.tsx`, `src/features/auth/LoginPage.tsx` | npm `motion` 14.14.0, MIT. The package distributes its license. |
| [Fontsource Lora](https://fontsource.org/fonts/lora/use) and [Lora upstream](https://github.com/google/fonts/tree/main/ofl/lora) | Upright variable display font with Vietnamese subset | `src/main.tsx`, `src/tokens.css` | npm `@fontsource-variable/lora` 5.3.0, SIL OFL 1.1. The package includes the license. |
| [Lucide](https://github.com/lucide-icons/lucide) | Existing outline icons reused for login capabilities, feed links and navigation | `src/features/auth/LoginPage.tsx`, `src/features/feed/FeedPage.tsx`, `src/app/AppShell.tsx` | Existing `lucide-react`; ISC license. |

The approved repositories were reviewed for fit. shadcn/ui, Animate UI and Motion Primitives cover components already implemented with app-specific state and native semantics. React Bits and Magic UI offer expressive visual effects beyond the needs of the working screens. GSAP, Lenis and AutoAnimate would add overlapping engines or change scrolling and list behavior. They contributed no runtime code.

UI UX Pro Max, Taste, Impeccable and Hallmark were installed from their official repositories under `.agents/skills` in this checkout. They provide design and review guidance. No skill code or hooks are bundled with the frontend. The project-local Git exclude keeps the skill files and Hallmark's local output outside the frontend patch.



Motion and Lora were verified in the production build and in the local Edge render. CSS interaction details and native dialog behavior were exercised by the visual checks and navigation E2E.
