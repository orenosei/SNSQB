# SNSQB redesign checklist

- [x] Confirm clean baseline, stack, environment requirements and the `thuphuong` branch.
- [x] Install and inspect UI UX Pro Max, Taste, Impeccable and Hallmark.
- [x] Inventory routes and identify student and lecturer workflows.
- [x] Implement shared tokens, page headings, shell, navigation, controls and dialog treatment.
- [x] Recompose login, feed and question bank. Apply shared hierarchy and surfaces across community, learning, teaching and account pages.
- [x] Integrate Motion and Lora. Preserve reduced-motion handling.
- [x] Compare route, link, field and action wiring. Keep source integrations in the manifest.


## Verification

- Build, lint and TypeScript passed. Vite emitted a Vietnamese WOFF2 subset of 8.99 kB. The main JavaScript grew from 102.11 to 104.55 kB gzip and CSS grew from 19.05 to 21.47 kB gzip compared with the baseline build.
- Impeccable's detector returned no findings on the new editorial stylesheet, login, and shell. The manual visual pass moved the mobile login form closer to the brand, centered the submit button, and increased contrast for account help and footer text.
- Hallmark's source pass saw the same extracted links and fields. Its handler count dropped by one when the duplicate explicit menu-focus callback was removed in favor of Modal's existing focus restoration. Its full-tree style checks still flag legacy raw values and patterns.
- The initial Playwright E2E run reached 40 passes, eight timeouts and one interrupted test before the failure limit. The real API run hit a sandbox worker error after skips. Real credentials were unavailable.
- In the focused rerun with longer timeouts, all 20 desktop and mobile E2E cases passed. Coverage included authentication, student and lecturer navigation, feed pagination, question-bank search, practice and grading, exam creation, chat and notifications. The rest of the 206-case suite did not complete in the original run.
- The real API rerun passed 23 tests and skipped 81 under the repository's existing conditions. The real STOMP test was skipped because its account and allowed origin were unavailable.
- Before and after screenshot sets each contain 15 PNGs. Login validation focus and password visibility passed at all five sizes. The two signed-in panel checks used only project test fixtures and passed at all five sizes.
- Hallmark rendered the final login and reported zero findings in the scoped check after increasing contrast for the field borders and the brand focus ring.
