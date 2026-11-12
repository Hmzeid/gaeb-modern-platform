# Business-Rule Equivalence Matrix — 2026-11-12

| Rule (source-evidenced) | Implementation | Equivalence status |
|---|---|---|
| Certificate line value = qty × price (QSTKVL = AQTY1 × ITPR) | money.ts valuation | Unit-tested on synthetic values; live reference results NOT supplied (B-08 pack §3) |
| Deductions are typed (CUTKND), never free text | typed deduction model | Enumeration/formulas unconfirmed — B-08 |
| Certificate chain draft→certified→billed→payment_authorized→paid; certifier ≠ payer | workflow.ts + RBAC | Unit-tested |
| Tender lifecycle stages cannot be skipped | workflow.ts stage machine | Unit-tested |
| Expropriation: REMV01 → REMV02 only after ministerial decree, with decree no./date/Gazette | workflow gate + DB check constraint | Unit-tested; transform loads pre-decree only |
| Estimates: catalogue-only items (PMPITMAR restriction); draft/reviewed separate from approved | FK-enforced catalogue + revision workflow | Unit-tested |
| CHK5DAYS five-day tender deadline check | Implemented as 5 working days skipping Fri/Sat | UNVERIFIED — exact rule/calendar unconfirmed, B-04 |
| CHKDIG check digit | NOT implemented | BLOCKED — algorithm not delivered, B-03 |

No rule above is marked business-verified: verification requires GAEB's worked
examples from the live system (requested in the Data Request Pack §3).
