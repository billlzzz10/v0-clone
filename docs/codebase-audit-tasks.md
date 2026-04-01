# Codebase Audit: Proposed Fix Tasks

## 1) Typo/Text Fix
- **Issue:** The info dialog links to `https://v0.app`, while the rest of the repo/docs consistently use the current `v0.dev` domain.
- **Why it matters:** This looks like stale text/linking and can send users to an unexpected location.
- **Proposed task:** Update the link in `components/shared/app-header.tsx` from `https://v0.app` to `https://v0.dev` and quickly verify all user-facing v0 links are consistent.

## 2) Bug Fix
- **Issue:** In `SearchParamsHandler`, URL cleanup after `refresh=session` does `replaceState(..., url.pathname)`, which drops all other query parameters.
- **Why it matters:** Any unrelated query state is lost unintentionally, which can break deep links/feature flags.
- **Proposed task:** Remove only `refresh` while preserving other params, e.g. ``replaceState(..., `${url.pathname}${url.search}`)`` after deleting `refresh`.

## 3) Comment/Documentation Discrepancy Fix
- **Issue:** This discrepancy was resolved: README now lists actual endpoints and no longer references `app/api/projects/`.
- **Why it matters:** Keep the audit in sync with current repository state to avoid stale guidance.
- **Proposed task:** Add a lightweight docs check in review/CI to confirm README endpoint references (`app/api/chat`, `app/api/chats`, `app/api/user`, auth routes) stay aligned with the codebase.

## 4) Test Improvement
- **Issue:** No automated test currently guards URL query preservation behavior in the header refresh flow.
- **Why it matters:** The `refresh=session` regression (query param stripping) can reappear unnoticed.
- **Proposed task:** Add a focused test (unit/integration) for `SearchParamsHandler` that verifies only `refresh` is removed and other query params are retained.
