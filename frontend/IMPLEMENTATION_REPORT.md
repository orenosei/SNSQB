# Approved frontend improvements

Date: 2026-11-03 (Asia/Bangkok). Scope: `SNSQB/frontend/` only. No backend, OpenAPI, root documentation or reference-sample changes.

## Completed implementation

- Forest/paper/ink design tokens, workspace switcher, grouped navigation, mobile quick navigation, clearer typography and shared responsive layouts.
- Accessible native form modals, keyboard focus containment/restoration, Escape handling, status feedback, list skeletons, shared search form/page header and runtime error recovery.
- Safe notification destination resolution from documented target fields; unsupported destinations have an explanatory fallback. Read actions, initial failures and failed pagination preserve useful feedback.
- Direct-chat connection shared after the first chat visit, retained across navigation, refreshed after token rotation, with typing cleanup and fresh history after reconnect. Per-conversation drafts and pending sends remain in the authenticated memory cache. A publish does not clear a draft until a newly observed matching own message appears in history. No automatic resend or undocumented acknowledgment protocol was added.
- Profile avatar/cover uploads with server-backed previews and save gating, alongside the existing URL inputs. Public profiles expose server-visible contributed collections.
- Global search supports ALL/USER/POST/QUESTION/SESSION/SUBJECT, retaining existing USER/POST URLs. Question details use returned search fields; no standalone question GET is invented.
- Feed new-activity counts, explicitly local activity filters, and safe session/user destination links. Unknown event payload fields remain unused.
- Target-aware question/session discussions reuse post comments, reply pagination, author controls and isolated cache keys. Comment reporting is exposed through the accessible report dialog.
- Lecturer video publishing validates subject/content/video requirements; lecturer notes use the documented note operation. Related video/post/search caches are invalidated together.
- Lecturer assigned-class list, class creation, detail/roster views, and deduplicated enrollment with partial-result feedback. Student routes are denied before class APIs run; roster controls require matching lecturer ownership.
- Account device list, distinct revocation/deletion confirmations, and local session cleanup for current-device actions.
- Quiet-hour payload defaults now match displayed values. Password submission and confirmation feedback are consistent. Login preserves an intended supported destination while tokens remain memory-only.
- ESLint/TypeScript checks, regression tests and production chunk splitting. No new runtime UI dependency or global-state migration.

## Components and pages

New shared components: Modal, ErrorBoundary, PageHeader, SearchForm, FieldFeedback, ListSkeleton and StatusNotice. Existing Avatar, Brand, ConfirmDialog, feedback, API client, cursor handling, QuestionEditor and QuestionContent are retained.

New feature components: ChatConnectionProvider, class list/detail/dialogs, DevicesPage, UserContributions, DiscussionToggle, LecturerNoteEditor, ProfileImageField and academic search result presentation.

Existing social, profile, search, notification, settings, learning, review and exam URLs remain available. Shared tokens/styles apply to all screens. New routes:

- `/settings/devices`
- `/lecturer/course-classes`
- `/lecturer/course-classes/:courseClassId`

## API integration

Ten additional REST operations were checked against the local OpenAPI snapshot and enabled explicitly in the existing operation allowlist:

| Method | Endpoint                                            |
| ------ | --------------------------------------------------- |
| GET    | `/devices`                                          |
| POST   | `/devices/{deviceId}/logout`                        |
| DELETE | `/devices/{deviceId}`                               |
| GET    | `/activity-feeds/new-count`                         |
| PUT    | `/posts/{id}/lecturer-notes`                        |
| GET    | `/users/{userId}/sessions`                          |
| POST   | `/lecturer/course-classes`                          |
| GET    | `/lecturer/course-classes/{courseClassId}`          |
| GET    | `/lecturer/course-classes/{courseClassId}/students` |
| POST   | `/lecturer/course-classes/{courseClassId}/students` |

Existing operations are reused for lecturer post publishing, AVATAR/COVER media purposes, broader search types and QUESTION/SESSION comment targets. Five relevant schemas were additionally checked for the fields consumed by class creation/enrollment, lecturer notes, notification targets and quiet hours.

DTOs remain snake_case. API host restriction, single-flight refresh, unsupported-operation rejection, no automatic mutation retry, and stale-session protection are preserved. No Admin APIs, backend mutations outside test fixtures, or undocumented sample endpoints were introduced.

## Design system delivered

The application uses a forest-and-paper academic workspace, with a top-level workspace switcher, contextual navigation, focused content panels and a compact mobile dock. It keeps the existing feature architecture while replacing the sample's visual composition with its own layout.

| Role                             | Value                                         |
| -------------------------------- | --------------------------------------------- |
| Primary                          | Forest `#154f46`                              |
| Secondary                        | Ink blue `#243c53`                            |
| Accent                           | Ochre `#a56416`                               |
| Background / surface             | Paper `#f7f5ef` / white `#ffffff`             |
| Main / secondary / muted text    | `#182a27` / `#52615c` / `#68756f`             |
| Borders                          | `#d8dfd7`                                     |
| Success / error / warning / info | `#216447` / `#a42c37` / `#85540b` / `#285e86` |
| Control / card / dialog radius   | 6 / 10 / 16 px                                |

Existing system typography and Lucide icons remain in use. Shared spacing, page titles, action groups, forms, cards, list feedback and keyboard interaction are applied through tokens and workspace styles. Responsive rules cover tablet layouts, mobile navigation, chat list/thread navigation and reduced motion.

## Verification

Final checks completed:

- `npm.cmd run lint`: passed.
- `npm.cmd run typecheck`: passed (also executed by the production build).
- `npm.cmd run build`: passed; includes strict TypeScript checking. The largest emitted application chunk is about 342 kB, with vendor/realtime and academic features split into separate chunks; no large-chunk warning.
- `node node_modules/@playwright/test/cli.js test --project=ui-desktop --project=ui-mobile --workers=4`: **202 passed, 0 failed, 0 skipped** in 2.3 minutes. This is one complete uninterrupted run, with retries disabled: 101 desktop and 101 mobile executions. The suite includes 23 new scenarios (46 executions) alongside the existing regression coverage.
- Offline verification: all ten additional method/path pairs and five relevant schemas exist in `../docs/source/openapi.json`.
- Live API suite without credentials: **23 passed, 81 skipped, 0 failed**. The 23 executed tests verify missing-JWT HTTP 401 responses; they do not verify authenticated workflows or business response schemas. No application data was created or changed.
- Live realtime project: **1 skipped, 0 failed** because its origin and credentials are not configured.
- Representative browser checks cover runtime exceptions, narrow layouts at 320/375/768/1280 px, CSS zoom at 200%, dialog keyboard behavior, and desktop/mobile workflows. Screenshots are generated under ignored `test-results/` directories.
- Token contrast calculations: primary on white 9.38:1; primary text on paper 13.77:1; secondary on white 6.52:1; muted on white 4.81:1; accent on white 4.74:1; error on white 7.01:1. This is a token-level check, not a claim of a complete WCAG audit.
- `git diff --check`: passed. Content changes and new implementation files are confined to `frontend/`; backend, contract, root documentation and the reference sample were not edited.

| Delivery status                         | Scope                                                                                                                                                                                                           |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Completed and verified locally          | Design system, navigation, shared components, forms, permission guards and workflows covered by the mocked desktop/mobile suite; lint, type checking and production compilation.                                |
| Implemented but not fully verified live | Authenticated class/device/upload/search/discussion/publishing operations and the shared STOMP connection. REST contracts were checked offline; live business behavior and realtime delivery remain unverified. |
| Not implemented                         | The explicitly deferred features listed below, and operations absent from the documented API.                                                                                                                   |

## Verification limits

- UI workflow tests use isolated HTTP mocks. Live authenticated API workflows remain unverified because dedicated test credentials/fixtures are not configured.
- Live STOMP connection and two-account delivery require an approved frontend origin and test accounts. The transport-mocked UI test verifies draft/pending-send behavior only. Matching content in newly observed history is reconciliation, not a uniquely correlated broker acknowledgment.
- Browser QA runs against Vite development mode; the production build is compiled/type-checked separately. No hosted deployment was requested or performed.
- The local contract does not describe lecturer history parameters or structured activity content. These were not inferred from the sample.
- Uploads can outlive abandoned drafts because the API has no standalone media deletion operation.

## Intentionally deferred

Group and hidden chat, chat attachment authoring, browser push registration, dark mode, gamification/shop/predictions, Admin tools and AI refinement remain outside the approved core scope. The sample's undocumented search-history POST and assumed lecturer history fields remain unused. No fabricated practice history, total score, dashboard statistics or unavailable CRUD operation was added.

## File inventory

All paths below are relative to this frontend directory. Generated builds, browser artifacts and dependency folders are ignored.

### Created files (25)

```text
IMPLEMENTATION_REPORT.md
README.md
eslint.config.js
src/components/ErrorBoundary.tsx
src/components/FieldFeedback.tsx
src/components/Modal.tsx
src/components/PageHeader.tsx
src/components/SearchForm.tsx
src/features/chat/ChatConnection.tsx
src/features/course-classes/ClassDialogs.tsx
src/features/course-classes/ClassPages.tsx
src/features/course-classes/api.ts
src/features/course-classes/types.ts
src/features/devices/DevicesPage.tsx
src/features/devices/api.ts
src/features/people/UserContributions.tsx
src/features/posts/DiscussionToggle.tsx
src/features/posts/LecturerNoteEditor.tsx
src/features/profile/ProfileImageField.tsx
src/features/search/AcademicSearchResult.tsx
src/lib/notificationTarget.ts
src/tokens.css
src/workspace.css
tests/e2e/improvements.spec.ts
tests/e2e/publishing.spec.ts
```

### Modified files (47)

```text
.gitignore
package-lock.json
package.json
playwright.config.ts
src/academic.css
src/app/App.tsx
src/app/AppShell.tsx
src/components/Feedback.tsx
src/components/SocialFeedback.tsx
src/features/academic/BankPage.tsx
src/features/academic/PracticePage.tsx
src/features/academic/SubmissionPages.tsx
src/features/academic/api.ts
src/features/auth/ChangePasswordPage.tsx
src/features/auth/LoginPage.tsx
src/features/chat/ChatPage.tsx
src/features/chat/realtime.ts
src/features/feed/FeedPage.tsx
src/features/feed/VideoPage.tsx
src/features/feed/api.ts
src/features/media/api.ts
src/features/notifications/NotificationsPage.tsx
src/features/notifications/SettingsPage.tsx
src/features/people/UserPage.tsx
src/features/posts/Comments.tsx
src/features/posts/Pages.tsx
src/features/posts/PostCard.tsx
src/features/posts/PostForm.tsx
src/features/posts/ReactionPicker.tsx
src/features/posts/api.ts
src/features/profile/EditProfilePage.tsx
src/features/profile/ProfilePage.tsx
src/features/reports/ReportButton.tsx
src/features/search/SearchPage.tsx
src/features/search/api.ts
src/lib/api.ts
src/main.tsx
src/phase4.css
src/social.css
src/styles.css
tests/e2e/academic-fixture.ts
tests/e2e/fixtures.ts
tests/e2e/phase4.spec.ts
tests/e2e/social-fixture.ts
tests/e2e/social.spec.ts
tests/realtime/stomp.spec.ts
vite.config.ts
```
