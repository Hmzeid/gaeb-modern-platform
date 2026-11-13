# Phase 11 — Executive Pilot Presentation (Workstream M)

The presenter narrative for GAEB executives. Visuals: the current
executive gallery (`docs/phase10-pilot-package/executive-review/`,
25 captures from the shipping build) and the architecture in
Phase 10 §01. No customer results are claimed anywhere in this
presentation, because none exist yet — what is presented is
capability, method, and evidence.

1. **What GAEB is modernizing.** Six business systems running on
   IBM i (AS/400) V6R1 — building registry, budget, tenders,
   payment certificates, estimates, real estate — still live,
   still authoritative, increasingly hard to staff and extend.
2. **The challenge.** Not the code — the *meaning*: Arabic data in
   legacy codepages, business rules that live only in program
   behavior, conflicting file definitions, and three decades of
   records whose counts must reconcile to the unit.
3. **The target platform.** A standalone bilingual platform
   (architecture slide): web tier, API with role-based governance,
   PostgreSQL, and an offline migration engine that never touches
   the source system.
4. **The modules.** One slide per module family with its workflow
   (gallery captures): registry, tenders' 12-stage machine,
   certificates with separation of duties, the decree gate.
5. **Executive Intelligence.** The Portfolio Overview: every figure
   computed from live data, finance visible only to finance roles.
6. **Geographic Intelligence.** Official 27-governorate boundaries,
   coverage stated honestly, one click into the register.
7. **Arabic-first.** Arabic is the data's native language here —
   field-level codepage fidelity, originals preserved, full RTL —
   not a translation layer.
8. **Migration methodology.** The 15-step intake protocol:
   authorization → hash-verified transfer → preflight → gated
   import → reconciliation. Approvals are identity-bound; an
   importer cannot approve their own batch (demonstrated live in
   the rehearsal evidence).
9. **Data integrity.** The invariant on one slide: source =
   loaded + quarantined, exact decimals, every rejected record
   carrying its reason and its raw bytes.
10. **Security & governance.** Control summary + the honest line:
    independent review is GAEB's gate, and the handoff is ready.
11. **Pilot scope.** Charter summary: modules in, exclusions
    named, three environments kept separate.
12. **Acceptance criteria.** The thresholds table — proposed by
    engineering, becoming binding only when GAEB approves them.
13. **Decisions required.** The eight BD items, with BD-07 and
    BD-08 flagged as the two that gate the first import.
14. **Timeline.** P0 provisioning → decision workshop → first
    dataset qualification → UAT → pilot operation (Phase 10 §08).
15. **The path to production.** The four gates, in order, with
    today's position marked: engineering verified; pilot ready;
    acceptance and production are GAEB decisions that this program
    is organized to earn with evidence.
