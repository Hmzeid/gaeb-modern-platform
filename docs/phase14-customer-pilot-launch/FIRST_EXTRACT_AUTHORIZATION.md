# First Extract Authorization — GAEB Pilot (for approval)

*No data moves under this document until GAEB signs it and the
authorization is recorded and independently verified inside the
platform. Nothing in this package has been pre-approved.*

## Dataset inventory (proposed)
| # | Member | System | Content | Proposed scope |
|---|---|---|---|---|
| 1 | PBLBULDG | School Map | Building registry: codes, Arabic names, village/governorate references | Per BD-08 decision |
| 2 | PBPTNDR | Purchases & Contracts | Tender register | Per BD-08 decision |

## To be confirmed by GAEB before signature
Exact source definitions (current DDS/DSPFFD output) · source-
system owner (name/role) · record selection rules · historical
period per BD-08 · expected record volumes (from DSPFD — not
estimated by Veebase) · data classification · extraction
authority (who may run the extraction on the IBM i) · authorized
transfer channel · authorized personnel list (extractor,
transporter, receiver, verifier).

## Technical requirements (fixed by the platform)
Extraction on GAEB's IBM i into a scratch library, exported in
a supported offline format with the registered layout · SHA-256
manifest computed at source and verified at receipt (mismatch
halts intake) · field-level codepage handling with Arabic
originals preserved; CCSID-425-flagged content stops for a
decision · chain-of-custody register entry per file · staging
only in the pilot environment · the authorized file's hash is
pinned to the dataset record — a different file cannot be
substituted · retention/deletion per the charter clause.

## Approval
Extract authorization granted for the datasets and scope above:
GAEB Data Owner: __________ Date: ______
GAEB Security Representative: __________ Date: ______
Extraction authority (IBM i): __________ Date: ______
Received by (Veebase): __________ Date: ______
