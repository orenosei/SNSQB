# SNSQB frontend

Vietnamese learning and community workspace for a student-generated question bank.

This directory is the primary application. `../frontend_sample/` is reference material and is not part of the build.

## Run locally

Requires Node.js 22.12+ and npm. In Windows PowerShell, use `npm.cmd` if the execution policy blocks `npm.ps1`.

```powershell
npm.cmd ci
Copy-Item .env.example .env
npm.cmd run dev
```

By default, browser REST requests use the same-origin `/api/v1` path. Vite proxies this path during local development and [`vercel.json`](./vercel.json) proxies it in production, avoiding browser CORS failures. Set `VITE_API_BASE_URL` only when you intentionally need to call a backend directly; it is a public frontend setting, so never place passwords or private keys in a `VITE_*` variable. Restart Vite after changing it.

Tokens stay in memory. A full reload requires login again; the application returns to the requested supported destination. Unconfirmed chat messages and drafts remain in the authenticated in-memory cache across SPA navigation and are cleared on logout.

## Checks

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
node node_modules/@playwright/test/cli.js install chromium
npm.cmd run test:e2e
```

The UI suite uses isolated mocked HTTP data on localhost, on desktop Chromium and Pixel 7 viewports. It does not establish live backend correctness. A chat transport mock verifies draft retention and server-history reconciliation without pretending to verify the live broker.

Live API tests use `npm.cmd run test:api`. Authenticated cases require dedicated test credentials configured through the non-`VITE_*` variables documented in `.env.example`. Some cases create test data and cannot clean up answers, ratings or exams because the API does not provide reset/delete operations.

```powershell
node node_modules/@playwright/test/cli.js test --project=realtime
```

The realtime project requires `SNSQB_REALTIME_E2E_ORIGIN`, pointing to an already running deployment of this frontend whose origin is permitted by the backend, plus test credentials. It uses that origin directly and does not start the localhost server. The current smoke test checks connection establishment; it does not verify two-account delivery.

## Application structure

- `src/app/`: routing, workspace navigation and authenticated shell.
- `src/components/`: feedback, native modal, confirmation, search form, page header, avatar and error boundary.
- `src/features/`: auth, profiles, social posts and relationships, feed/search, academic workflows, notifications, chat, classes and devices.
- `src/lib/`: explicit API boundary, cursor handling and supported notification destinations.
- `src/tokens.css`: forest, paper, ink and status tokens.
- `src/workspace.css`: shared workspace composition and responsive behavior. Existing feature styles retain their structural responsibilities.

Academic, class, device and academic-search screens use separate build chunks. Existing URLs remain available. New routes are `/settings/devices`, `/lecturer/course-classes`, and `/lecturer/course-classes/:courseClassId`.

## API boundaries

`../docs/source/openapi.json` is the contract source. DTOs remain snake_case. The Axios client rejects unsupported operations and external destinations before attaching authorization, and ignores stale-session responses. Backend authorization remains authoritative.

Class management covers assigned classes, creation, roster reading and enrollment with partial-result feedback. It does not assume lecturer history parameters, class deletion or student-removal operations. Profile images use the existing multipart upload endpoint with AVATAR/COVER purposes. Lecturer video publishing and notes use the documented post operations.

Rich activity `content` is not documented, so activity cards use known actor/action/target fields. Unknown notification destinations are explained instead of navigated. Search history supports retrieval/deletion; the sample's undocumented history POST is not used.

Groups, hidden chat, chat attachment authoring, browser push registration, dark mode, gamification, Admin tools and AI refinement are outside this release.
