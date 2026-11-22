# SNSQB UI redesign audit

Baseline `078ab42` on a clean `master`, then `thuphuong`. React 19, Vite 7, TypeScript, React Router, TanStack Query, npm lockfile, feature CSS with a shared workspace cascade. Node 24.11.0, npm 11.6.1, Python 3.14.5 and Git 2.48.1. Local configuration is documented in `frontend/.env.example`. API and realtime tests can require existing accounts.

Students discover and practise questions, contribute sets, and use the social feed and messaging. Lecturers additionally review contributions, assemble exams and manage classes.

| Area | Routes | Priority |
| --- | --- | --- |
| Sign-in | `/login` | Give the form a clear entry point and replace layered decoration with a distinct academic composition. |
| Community | `/`, `/posts/new`, `/posts/:postId`, `/posts/:postId/edit`, `/my-posts`, `/friends`, `/users/:userId`, `/search`, `/chat`, `/notifications` | Make the feed and composer easy to scan, preserve pagination, filters and chat behaviour. |
| Learning | `/question-bank`, `/submissions`, `/submissions/new`, `/submissions/:sessionId`, `/submissions/:sessionId/edit`, `/practice/:sessionId`, `/videos` | Clarify collection and question hierarchy, preserve form and practice controls. |
| Teaching | `/lecturer/reviews`, `/lecturer/reviews/:sessionId`, `/lecturer/exams`, `/lecturer/exams/new`, `/lecturer/exams/:examId`, `/lecturer/course-classes`, `/lecturer/course-classes/:courseClassId` | Keep tabular density and role gates. Improve shared structure, status contrast and responsive rows. |
| Account | `/me`, `/settings/profile`, `/settings/notifications`, `/settings/password`, `/settings/devices`, fallback route | Standardize field, dialog and feedback treatments. |

Reuse Brand, Avatar, PageHeader, Modal, field feedback, and loading/error/empty states. Existing navigation uses a fixed desktop sidebar and mobile dock. Existing token layer is present, but some brand values and motion timings live in feature CSS. Keep app links, roles and data behavior and work through the shared cascade first.

Playwright captured the original build and redesign at 1440, 1024, 768, 390 and 360px. Local comparisons live in `frontend/test-results-realtime/ui-redesign/{before,after}`. Login uses the public page. Feed and question-bank captures use the repository's existing E2E fixtures, with client-side navigation from the normal sign-in form. Both versions passed the five-width feed and bank check for overflow, runtime exceptions and focus restoration after Escape. No production accounts or production data were used in these captures.
