# GAEB School Map Pilot — Acceptance Criteria

The pilot is accepted only when ALL of the following hold, evidenced per the
pilot evidence register:

1. Every delivered file's SHA-256 verified against the manifest.
2. For every file: source_records = loaded + quarantined (platform equation),
   AND source_records = GAEB's live count from the manifest.
3. For every money-bearing field: source_total − loaded_total equals exactly
   the value carried by quarantined parseable records.
4. Zero records loaded under demo-mode approvals; every transform approval is
   customer-mode, evidence-referenced, identity-bound, and hash-current.
5. Arabic spot-check: GAEB's reviewer confirms a sample of building names
   (agreed sample size before execution) render identically to the legacy
   screens.
6. Every quarantined record has a GAEB disposition (correct-and-resubmit,
   source-fix, or accepted exception) recorded in the issues register.
7. The UAT cases for the pilot scope are executed by GAEB participants and
   signed off (docs/uat/).

Failure of any criterion keeps the pilot at its current intake stage. Partial
acceptance of a batch is not possible; acceptance of the pilot does not
authorize production deployment.
