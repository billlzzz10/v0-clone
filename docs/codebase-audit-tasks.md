# Codebase Audit: Proposed Fix Tasks

## 1) Typo/Text Fix
- **Issue:** The info dialog links to `https://v0.app`, while the rest of the repo/docs consistently use the current `v0.dev` domain.
- **Why it matters:** This looks like stale text/linking and can send users to an unexpected location.
- **Proposed task:** Update the link in `components/shared/app-header.tsx` from `https://v0.app` to `https://v0.dev` and quickly verify all user-facing v0 links are consistent.

## 2) Bug Fix
- **Issue:** In `SearchParamsHandler`, URL cleanup after `refresh=session` does `replaceState(..., url.pathname)`, which drops all other query parameters.
- **Why it matters:** Any unrelated query state is lost unintentionally, which can break deep links/feature flags.
- **Proposed task:** Remove only `refresh` while preserving other params, e.g. `replaceState(..., `${url.pathname}${url.search}`)` after deleting `refresh`.

## 3) Comment/Documentation Discrepancy Fix
- **Issue:** README architecture mentions `app/api/projects/` routes, but the codebase has no `app/api/projects` endpoints.
- **Why it matters:** New contributors may spend time looking for non-existent code paths.
- **Proposed task:** Update README architecture section to match actual endpoints (`app/api/chat`, `app/api/chats`, `app/api/user`, auth routes), or add the missing projects API if intended.

## 4) Test Improvement
- **Issue:** No automated test currently guards URL query preservation behavior in the header refresh flow.
- **Why it matters:** The `refresh=session` regression (query param stripping) can reappear unnoticed.
- **Proposed task:** Add a focused test (unit/integration) for `SearchParamsHandler` that verifies only `refresh` is removed and other query params are retained.
