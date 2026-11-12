# GAEB Data Transfer Protocol

## 1. Classification
All GAEB extracts are **confidential customer data**. They are handled under the
Veebase–GAEB agreement terms; this protocol is the operational summary, not a
replacement for contractual obligations.

## 2. Transfer
- Channel: an encrypted channel agreed in writing before the first delivery
  (SFTP with key authentication, or an encrypted archive over an approved link).
  Plain email attachments are not an approved channel for production extracts.
- Each delivery carries a manifest: file list, per-file SHA-256, record counts,
  control totals, extraction timestamps, declared format and code page.
- Veebase verifies checksums on receipt and confirms in writing before processing;
  a checksum mismatch voids the delivery (re-request, never repair silently).

## 3. Handling at Veebase
- Extracts land in access-controlled storage (operator role only), are processed
  into the migration platform, and are never copied to personal devices or public
  repositories. No customer record appears in source control, tickets, or reports —
  reports carry counts, totals, and quarantine metadata, not record content.
- Access is logged; the migration platform's audit trail records every import,
  approval, and transformation with the acting user.

## 4. Anonymization (if GAEB elects it)
Acceptable: consistent substitution of personal identifiers that preserves keys,
joins, and financial values exactly. Not acceptable: substitution that changes
amounts, breaks referential integrity, or differs per file for the same entity —
such a delivery cannot be reconciled and will be returned with the reason.

## 5. Retention and deletion
- Raw extracts are retained only for the POC duration plus the agreed evidence
  window, then deleted (secure erase of the storage objects) or returned, at
  GAEB's written instruction. Deletion is confirmed in writing with the manifest
  reference.
- Derived evidence (counts, totals, quarantine metadata, reconciliation reports)
  is retained as the migration's audit record; it contains no record content
  beyond field values of quarantined records where GAEB approves their inclusion.

## 6. Incidents
Suspected exposure of GAEB data is reported to GAEB's named contact within one
business day of discovery, with scope and containment actions.
