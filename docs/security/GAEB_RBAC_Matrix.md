# GAEB RBAC Matrix — generated from `platform/src/auth.ts` (PERMISSIONS)

| Permission | admin | budget | contracts | technical | realestate | viewer |
|---|---|---|---|---|---|---|
| (all — `*`) | ✔ | | | | | |
| budget.read / budget.write / budget.approve | ✔ | ✔ | | | | read only (`*.read`) |
| payment.authorize | ✔ | ✔ | | | | |
| estimates.write / estimates.review | ✔ | | | ✔ | | read only |
| estimates.approve | ✔ | ✔ | | | | |
| certificates.read | ✔ | ✔ | | ✔ | | ✔ |
| certificates.certify | ✔ | | | ✔ | | |
| tenders.read / tenders.write / bids.register / claims.write | ✔ | | ✔ | | | read only |
| buildings.read / buildings.write | ✔ | | | ✔ | | read only |
| realestate.* | ✔ | | | | ✔ | read only |
| reports.finance | ✔ | ✔ | | | | ✔ (`reports.*`) |
| reports.procurement / technical / realestate | ✔ | | ✔ (proc.) | ✔ (tech.) | ✔ (r.e.) | ✔ |
| **migration.run** (import, intake, batches, reconciliation) | ✔ | | | ✔ | | |
| **migration.approve** (mapping approvals + revocation) | ✔ | ✔ | | | | |
| audit trail (`/api/audit`) | ✔ | | | | | |

Separation-of-duties facts the matrix enforces:
- The migration **operator** (technical: migration.run) cannot approve mappings;
  the **approver** (budget/admin: migration.approve) cannot run imports or intake.
- Even with both roles arranged socially, the transform gate additionally refuses
  when the approver **is** the batch's importer (checked per batch at run time).
- Certificate chain: certifier (technical) cannot authorize payment (budget).
- Estimates: writer (technical) ≠ reviewer (technical, distinct permission) ≠
  approver (budget) — return-for-correction creates a new revision, never an edit.
