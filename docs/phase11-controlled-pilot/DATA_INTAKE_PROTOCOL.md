# Phase 11 — Secure Legacy Data Intake Protocol (Workstream E)

The controlled sequence for authorized IBM i / AS/400 extracts.
No step may be skipped; the platform's intake state machine tracks
each file through it. **No real extract has been received; this
protocol has been exercised only with synthetic fixtures
(Workstream F rehearsal).**

1. **Written authorization** — GAEB document naming the dataset,
   scope (BD-08), window, and data owner. Filed before anything moves.
2. **Dataset identification** — member names, layouts, expected
   record counts from DSPFD; recorded in the intake register.
3. **Data classification** — each dataset labeled (personal /
   financial / operational) per GAEB policy; handling follows the
   strictest applicable label.
4. **Approved extraction method** — GAEB's IBM i team restores into
   a scratch library and produces offline files in a supported
   format (native-binary with registered layout, fixed-text, or
   delimited). Save files are not ingested directly. The platform
   never connects to the AS/400.
5. **Secure transfer** — encrypted channel agreed in the charter
   (e.g. SFTP to the pilot host's intake account, or encrypted
   media hand-carried). Never email; never consumer file-sharing.
6. **SHA-256 at source and at receipt** — both digests recorded;
   a mismatch halts the intake for that file.
7. **Chain of custody** — register entry: file, hash, sender,
   receiver, timestamps, storage location; every later access is
   an auditable event.
8. **Encrypted staging** — extracts land in the pilot environment's
   access-controlled intake area (uploads are mode 0600 in the
   application tier); never in the demonstration environment;
   **never transmitted to any third-party or AI service.**
9. **Schema & encoding preflight** — standalone validator verdict
   (READY / REVIEW / REJECT) incl. CCSID probing; REJECT is final
   until the source file is corrected.
10. **Approval verification** — customer-mode mapping approvals
    with evidence references must be active and current-hash before
    any transform; demo approvals never authorize customer data;
    the importer's own approval never counts.
11. **Import execution** — tracked import job; streaming with
    checkpoints for large files; live progress visible.
12. **Reconciliation** — exact equation + control totals per the
    Reconciliation & Acceptance document; failures stop the line.
13. **Exception management** — quarantined records reviewed with
    raw evidence; corrections happen at the source and re-enter at
    step 5; audited resubmission exists for corrected records.
14. **Customer review** — GAEB data owner reviews the
    reconciliation package and records acceptance or exceptions.
15. **Retention or deletion** — per the policy GAEB approves in
    the charter: extracts retained for the pilot's duration in the
    pilot environment, then deleted with a deletion record, or
    archived per GAEB instruction. No silent retention.

EBCDIC/Arabic fidelity controls apply throughout: per-field
codepage handling, originals preserved, IBM425-flagged content
stops for a decision rather than being guessed at.
