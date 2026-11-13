# Security Verification — UI Certification

Scope: the certification's new/changed surface — `GET /api/overview`,
`GET /api/certificates/:id`, `GET /api/estimates/:id`,
`GET /api/users`, `GET /api/migration/approvals` — verified by direct
API tests in the backend integration suite (not by UI hiding), plus
the browser E2E role check.

## Verified server-side

| Check | Result | Evidence |
|---|---|---|
| Unauthenticated `GET /api/overview` | **401** | Integration suite |
| Unauthenticated `GET /api/certificates/1` | **401** | Integration suite |
| Overview money gating: caller without `reports.finance` receives `money: null` (no budget aggregates, no certificate money) | **Pass** | Integration assertions for the technical role; E2E: technical user's overview contains no EGP figures, UI renders the em-dash unavailable state |
| Overview money present for a finance role | **Pass** | Integration assertions (budget role) |
| `GET /api/users` for a non-admin role | **403** | Integration suite |
| `GET /api/users` for admin returns no password material (`password_hash` key absent on every row) | **Pass** | Integration suite — the endpoint's SELECT never includes credential columns |
| Certificate detail respects `certificates.read`; estimate detail requires authentication; approvals list requires `migration.run` (unchanged permission, widened columns only) | **Pass** | Existing permission middleware + suite |
| Finance reports remain gated (`reports.finance`): technical role 403, budget role 200 | **Pass** | Pre-existing suite assertions, still green |

## Design points confirmed
- Authorization is enforced by Express middleware + handler checks on
  every endpoint; the frontend merely renders what the API returns.
  In particular the overview's financial layer is **absent from the
  payload** for unauthorized roles — not hidden in the browser.
- Error responses follow the platform's existing safe shape (no stack
  traces, no SQL detail); the security headers verified in Phase 8
  (nosniff, DENY framing, no-referrer, CSP `default-src 'none'` on
  API responses, no-store) are unchanged.
- No new secrets, tokens, or credentials were introduced by the
  frontend work; the browser E2E reports zero uncaught errors and no
  sensitive data was observed in console output during the run.

## Not in scope / unchanged
- This is an engineering verification, **not** the customer security
  approval (register item B-11 — still NOT GRANTED, awaiting GAEB's
  security requirements and sign-off).
- Session, throttling, and separation-of-duties behavior was not
  modified by this certification; the existing suite assertions for
  them remain green (65/65).
