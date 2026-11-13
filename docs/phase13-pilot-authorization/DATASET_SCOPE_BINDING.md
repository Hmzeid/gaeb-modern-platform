# Phase 13 — Customer Data Scope Binding (Workstream F)

Migration 013 adds `app.pilot_datasets`. A customer import must
name its dataset (`?dataset=<member>`); the decision function
binds the operation to a registered, authorized dataset record
carrying: pilot · dataset key (legacy member) · source system ·
extract authorization reference · **authorized file SHA-256**
(optional pin) · transformation name · registering and
authorizing identities with timestamps.

Enforced:
- A dataset authorizes only its own pilot's imports — the same
  member name under another pilot is a different authorization
  (tested: the closed pilot's dataset refuses under a different
  active pilot).
- Dataset authorization itself requires VERIFIED
  extract-authorization evidence for that pilot (server-checked
  at authorize time).
- **File substitution is refused**: when a hash is pinned, the
  presented file's SHA-256 (computed by the server for buffered
  imports; recorded at upload for streamed ones) must equal it —
  tested with a mismatched pin (422).
- Unregistered datasets refuse; registered-but-unauthorized
  datasets refuse.
- The importing identity, dataset, file hash, and decision are
  audit-logged for every customer operation.

GAEB's actual approved scope does not exist yet: the two proposed
pilot datasets (PBLBULDG, PBPTNDR) are named in the launch
package as *proposed*, and no dataset record for a real pilot
exists. All binding tests ran on synthetic fixtures.
