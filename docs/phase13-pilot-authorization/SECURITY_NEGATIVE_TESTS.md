# Phase 13 — Security-Negative Test Matrix (Workstream I)

All 20 directive cases are executed in the backend integration
suite (asserting the server response; state assertions read back
through the API) and the core flows repeat in the synthetic
rehearsal. Suite result: **65/65, 0 skipped.**

| # | Case | Expected | Where |
|---|---|---|---|
| 1 | Missing evidence | Activation 422 listing the conditions | suite |
| 2 | Self-verification | 422 + denial audit-logged | suite + rehearsal R-20 |
| 3 | Unauthorized verification (no verify perm) | 403 | suite |
| 4 | Forged/unverified hash presented as proof | Recorded as `declared-unverified`; server-computed hash labeled `verified-bytes` and matching the bytes | suite |
| 5 | Expired evidence | Import 422; status materializes EXPIRED | suite |
| 6 | Revoked evidence | Import 422 until requalified | suite + R-21/R-22 |
| 7 | Superseded evidence | Verify attempt on the superseded record 422; successor governs | suite + R-20 |
| 8 | Cross-pilot evidence reuse | Second pilot's activation 422 | suite |
| 9 | Cross-dataset reuse / unregistered dataset | 422 | suite + rehearsal closure step |
| 10 | Revoked transformation approval | Import 422 (no grandfathering) | suite |
| 11 | Unauthorized pilot activation | 403 (non-admin) | suite |
| 12 | Unauthorized reactivation | admin-only route; suspended pilot imports 422 | suite |
| 13 | Concurrent activation | Exactly one 200, one 422 | suite |
| 14 | Import after suspension | 422; reactivation restores after fresh evaluation | suite + R-24 |
| 15 | Import after closure | 422 (both paths) | suite + R-25 |
| 16 | Import during/after revocation | 422 at the next decision; transform of the pre-revocation batch 422 | suite |
| 17 | Streamed import authorization loss | Refused at start without an active bound pilot; per-chunk re-evaluation aborts mid-stream (engine hook) | suite (start) + code path R-23 |
| 18 | File hash mismatch | 422 (substitution refused) | suite |
| 19 | Manipulated evidence identifier | Verify on a nonexistent id 404 | suite |
| 20 | Stale authorization decision | No cached eligibility exists to go stale: post-activation revocations/expiry change the very next decision (cases 5, 6, 10, 16 are the proof) | suite |

Database-state assertions: supersession and expiry are read back
from the evidence list; the transform refusal asserts the batch
never reaches operational tables (transform returns 422 inside
its transaction and rolls back).
