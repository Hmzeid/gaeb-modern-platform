# GAEB Business Rules Questionnaire

Purpose: the modern platform must reproduce legacy behaviour, not approximate it.
Record counts matching is not equivalence. Each question below needs either the
rule itself or worked examples from the live system (inputs → outputs), which let
us test equivalence mechanically. Mark each answer's source (program name, document,
or named GAEB expert) — unattributed answers cannot be signed off.

## B-03 — CHKDIG (check digit)
1. Which fields/programs use CHKDIG? 2. The exact algorithm (or the source member).
3. Five worked examples: input value → computed check digit, incl. one invalid case.

## B-04 — CHK5DAYS (tender deadline rule)
1. Exact rule text: five *what* days — working days, calendar days?
2. The working-week definition and the holiday calendar source (official holidays
   table? hard-coded list?).
3. Start-day inclusion, and behaviour when the deadline lands on a holiday.
4. Three worked examples across a weekend and a public holiday.

## B-08 — CUTKND (certificate deduction kinds)
For EVERY deduction kind in the live enumeration:
| Kind code | Arabic/English name | Formula | Base it applies to | Cap/floor | Rounding rule | Example (gross → deduction) |
|---|---|---|---|---|---|---|
1. Is retention a CUTKND kind or separate? 2. Can kinds stack on one certificate?
3. Order of application when several apply. 4. Worked example of a full certificate:
   lines → gross → each deduction → net, from a real (or realistic) مستخلص.

## General rules (all modules)
5. Certificate numbering: who assigns it, can it repeat per building/year?
6. Fiscal year definition and the year field format in CBABDALW (LWYEAR is 9 digits —
   what does it encode?).
7. Date fields: all YYYYMMDD? Any Julian or hijri representations anywhere?
8. Status codes: the full enumeration for tenders (PBYTENDR TESU/FINMOD) and
   abstracts, with Arabic labels as shown on the legacy screens.
9. Money: storage scale per money field; any field stored in piasters vs pounds.
10. Deletion/correction practice on the legacy system: are records ever physically
    deleted, or always status-marked? (Decides the migration's delta handling.)

## Sign-off
Answered by (name/role): ____________  Date: ________
Reviewed by GAEB business owner: ____________  Date: ________
