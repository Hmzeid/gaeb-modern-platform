# GAEB Data Request Pack — Executive Document

**From:** Veebase LLC, GAEB Modern Enterprise Platform programme
**To:** General Authority for Educational Buildings (GAEB) — IBM i administration and business owners
**Purpose:** Everything GAEB needs to supply so Veebase can execute a customer-witnessed,
reconciled migration of real GAEB data from the IBM i (AS/400, V6R1M0, library NEWLIBGAEB)
into the modern platform.

This pack is the executive document. Detail lives in its companions:
- `GAEB_IBM_i_Extraction_Guide.md` — how to produce the extracts (for the IBM i team)
- `GAEB_Data_Inventory_Template.csv` — 1,095 field rows pre-filled from the delivered
  DDS sources; every cell we cannot know is marked REQUIRES CUSTOMER CONFIRMATION
- `GAEB_Record_Count_Template.csv` — the 125 physical files awaiting live counts and
  financial control totals
- `GAEB_Business_Rules_Questionnaire.md` — the open business-rule questions (B-03/B-04/B-08 …)
- `GAEB_Data_Transfer_Protocol.md` — secure transfer, handling, retention, deletion
- `GAEB_Data_Request_Email.md` — the cover letter to send this pack with

## Executive summary
The replacement platform is built and verified against synthetic IBM i-format data:
import, staging, quarantine, approval-gated transformation, operational loading, and
exact reconciliation all execute today. What it has never touched is real GAEB data.
This pack closes that gap. Nothing in it assumes facts about the live system; where
the delivered 2026 source archive and the live system may differ, the live system
wins and we ask GAEB to confirm.

## Priority 1 — mandatory initial extracts (School Map pilot)
1. **PBLBULDG** (building register) in one of the supported formats (Extraction Guide §2)
2. Its reference/relationship files as they exist live: governorates, centres,
   villages and village dependencies, educational administrations, education stages,
   land-owner bodies (live member names to be confirmed against the inventory template)
3. For each file: DSPFFD/DSPFD metadata, file- and field-level CCSIDs, record count,
   and the completed inventory/count template rows

## Priority 2 — validation extracts (unblock the remaining subsystems)
4. **B-01:** PBA3* Budget master DDS or DSPFFD output (only logical files were delivered)
5. **B-02:** the authoritative INV001PF definition, settled by live DSPFFD (three
   non-identical definitions were delivered)
6. **B-13:** identification + DDS of the Estimates item-master physical file
7. **B-03/B-04/B-08:** business-rule evidence per the questionnaire (CHKDIG, CHK5DAYS,
   CUTKND) with worked examples from the live system
8. **B-05:** CCSID confirmation per file/field (flag any IBM425 file before delivery)

## What GAEB gets back
For every batch: a reconciliation report (source count = loaded + quarantined, with
every quarantined record itemized), an Arabic-integrity sample check, and a signed
exception list for anything not loaded and why. Migration into operational tables
happens only under GAEB-approved, hash-bound field mappings.

## What we will never do
Write to the source system; load data under unapproved mappings; silently drop,
round, or deduplicate source records; or treat anonymization that breaks keys or
totals as reconcilable (a consistently anonymized equivalent that preserves
relationships and calculations is acceptable — Transfer Protocol §4).

## ملخص تنفيذي (Arabic summary)
المنصة البديلة مبنية ومختبَرة على بيانات اصطناعية بصيغة IBM i، ولم تلمس بعد بيانات
الهيئة الفعلية. تطلب هذه الحزمة: (١) استخراجًا أوليًا إلزاميًا لمنظومة الخريطة المدرسية
— ملف PBLBULDG وملفاته المرجعية — مع بيانات DSPFFD وقيم CCSID وأعداد السجلات
والإجماليات الرقابية؛ (٢) أدلة فك العوائق لبقية المنظومات (B-01 ملفات الموازنة
الرئيسية، B-02 تعريف INV001PF المعتمد، B-13 ملف بنود المقايسات، وقواعد العمل
B-03/B-04/B-08). كل ترحيل تشغيلي يتم فقط بربط حقول معتمد من الهيئة ومربوط ببصمة
التعريف، وكل دفعة تُسلَّم بتقرير مطابقة كامل: عدد المصدر = المحمَّل + المعزول،
وكل سجل معزول موثق بالسبب والأوفست والبايت الخام.
