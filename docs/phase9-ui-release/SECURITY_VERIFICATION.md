# Phase 9 — Security Verification (Workstream E)

Scope: the Phase 9 changes — the paged buildings endpoint, the
School Map's new query surface, and regression confirmation of the
certification's controls. All checks are direct API tests in the
backend integration suite, not UI observations.

## New-surface negatives (all asserted, suite green at 65/65)
| Attempt | Result |
|---|---|
| `sort=id;DROP TABLE app.buildings` | **400** — sort fields are a server-side whitelist; the string is never interpolated |
| `dir=sideways` | **400** |
| `page=0` / non-integer page | **400** |
| `pageSize=5000` | **400** — capped at 100 server-side |
| `governorate=abc` | **400** |
| Paged request without a session | **401** |
| Search term `%` | Returns 0 rows — LIKE wildcards in user input are escaped; search cannot be turned into a pattern probe |
| Governorate filter | Exact-match parameterized equality; no row leakage across governorates (asserted) |

## Invariants preserved
- RBAC unchanged: paged mode sits behind the same
  `buildings.read` permission as legacy mode; no new permission
  surface was introduced.
- Finance payload filtering (overview `money: null` without
  `reports.finance`) — re-verified by the suite and by the E2E
  technical-role check.
- Admin endpoints (`/api/users`, audit) remain admin-only; no
  password material is selected by any endpoint, old or new.
- Approval authorization, separation of duties, session handling,
  login throttling, and the security headers verified in earlier
  phases are unmodified; their suite assertions remain green.
- Error responses for the new validation paths are static strings
  (no SQL, no stack detail). No Phase 9 code logs request data; the
  browser run reported zero uncaught errors and no sensitive data
  in console output.
- Pagination cannot widen access: the WHERE clause composes only
  the caller's filter values as bound parameters inside the same
  single-tenant query the legacy mode used.

## Verdict
**PASS** — no security regressions; the new query surface rejects
malformed and hostile parameters deterministically. This is
engineering verification, not the customer security approval
(register B-11, still outstanding and unchanged).
